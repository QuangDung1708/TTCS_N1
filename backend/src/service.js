const crypto = require("node:crypto");
const { hashPassword } = require("./store");
const MESSAGE =
  "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư và Spam.";
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const emailValid = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function createService({
  store,
  sendMail,
  appUrl,
  now = Date.now,
  onMailError = () => {},
}) {
  async function forgot(email) {
    if (!emailValid(email)) throw failure("Vui lòng nhập email hợp lệ.");
    email = email.trim().toLowerCase();
    const key = digest(email);
    const time = now();
    if (store.state.requests[key] > time - 60_000) return { message: MESSAGE };
    store.update((s) => {
      for (const [k, v] of Object.entries(s.requests))
        if (v <= time - 60_000) delete s.requests[k];
      s.requests[key] = time;
      s.tokens = s.tokens.filter((t) => t.expiresAt > time && !t.usedAt);
    });
    const user = store.state.users.find((u) => u.email === email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const hash = digest(token);
      // An unsuccessful delivery never invalidates the previous working link.
      store.update((s) =>
        s.tokens.push({
          hash,
          userId: user.id,
          expiresAt: time + 30 * 60_000,
          usedAt: null,
        }),
      );
      try {
        await sendMail({
          to: email,
          subject: "Enterprise CRM — Đặt lại mật khẩu",
          text: `Bạn đã yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực 30 phút và chỉ dùng một lần:\n${appUrl}/reset-password?token=${token}\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
        });
      } catch (error) {
        store.update((s) => {
          s.tokens = s.tokens.filter((t) => t.hash !== hash);
        });
        onMailError(error);
      }
    }
    return { message: MESSAGE };
  }
  function validToken(token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw failure("Liên kết không hợp lệ, đã sử dụng hoặc hết hạn.");
    const item = store.state.tokens.find((t) => t.hash === digest(token));
    if (
      !item ||
      item.usedAt ||
      item.expiresAt <= now() ||
      !store.state.users.some((u) => u.id === item.userId)
    )
      throw failure("Liên kết không hợp lệ, đã sử dụng hoặc hết hạn.");
    return item;
  }
  async function reset({ token, password, confirmPassword }) {
    validToken(token);
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128 ||
      !/[A-Za-z]/.test(password) ||
      !/[^A-Za-z\s]/.test(password)
    )
      throw failure(
        "Mật khẩu phải có 8–128 ký tự, gồm chữ và số hoặc ký tự đặc biệt.",
      );
    if (password !== confirmPassword)
      throw failure("Mật khẩu xác nhận không khớp.");
    const passwordHash = await hashPassword(password);
    // Recheck after asynchronous hashing: parallel requests cannot reuse a token.
    const current = validToken(token);
    store.update((s) => {
      s.users.find((u) => u.id === current.userId).passwordHash = passwordHash;
      for (const t of s.tokens)
        if (t.userId === current.userId) t.usedAt = now();
    });
    return {
      message:
        "Đã đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    };
  }
  return { forgot, reset, validToken };
}
module.exports = { createService, MESSAGE };
