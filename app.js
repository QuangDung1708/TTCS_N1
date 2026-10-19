const $ = (id) => document.getElementById(id);
let token = new URLSearchParams(location.search).get("token");
// Remove the secret from history/address after loading. A refresh requests a new link.
if (token) history.replaceState(null, "", "/reset-password");
function notice(text, type = "") {
  $("notice").textContent = text;
  $("notice").className = type;
  $("notice").hidden = false;
}
async function api(route, body) {
  const response = await fetch(`/api/auth/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message || "Không thể xử lý yêu cầu.");
  return result;
}
function busy(button, value) {
  button.disabled = value;
  button.classList.toggle("busy", value);
}
let cooldownUntil = Number(sessionStorage.getItem("forgotCooldown") || 0);
function updateCooldown() {
  const seconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  $("send").disabled = seconds > 0;
  $("send").textContent = seconds
    ? `Gửi lại sau ${seconds}s`
    : "Gửi liên kết đặt lại";
}
updateCooldown();
$("forgot-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (cooldownUntil > Date.now()) return;
  busy($("send"), true);
  try {
    const result = await api("forgot-password", {
      email: $("email").value.trim(),
    });
    notice(result.message, "success");
    cooldownUntil = Date.now() + 60000;
    sessionStorage.setItem("forgotCooldown", String(cooldownUntil));
  } catch (error) {
    notice(error.message, "error");
  } finally {
    busy($("send"), false);
    updateCooldown();
  }
});
setInterval(() => {
  if (!$("send").classList.contains("busy")) updateCooldown();
}, 1000);
$("reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("password").value;
  if (!/[A-Za-z]/.test(password) || !/[^A-Za-z\s]/.test(password))
    return notice("Mật khẩu phải có chữ và số hoặc ký tự đặc biệt.", "error");
  if (password !== $("confirm").value)
    return notice("Mật khẩu xác nhận không khớp.", "error");
  busy($("reset"), true);
  try {
    const result = await api("reset-password", {
      token,
      password,
      confirmPassword: $("confirm").value,
    });
    token = null;
    $("reset-form").hidden = true;
    $("title").textContent = "Đổi mật khẩu thành công";
    $("subtitle").textContent = "Tài khoản đã được cập nhật mật khẩu mới.";
    notice(result.message, "success");
  } catch (error) {
    notice(error.message, "error");
  } finally {
    busy($("reset"), false);
  }
});
$("reveal").addEventListener("click", (event) => {
  const show = $("password").type === "password";
  $("password").type = show ? "text" : "password";
  event.currentTarget.textContent = show ? "Ẩn" : "Hiện";
  event.currentTarget.setAttribute(
    "aria-label",
    show ? "Ẩn mật khẩu" : "Hiện mật khẩu",
  );
  event.currentTarget.setAttribute("aria-pressed", String(show));
});
function openForgot() {
  token = null;
  history.replaceState(null, "", "/");
  $("title").textContent = "Quên mật khẩu";
  $("subtitle").textContent = "Nhập email để nhận liên kết đặt lại mật khẩu.";
  $("notice").hidden = true;
  $("reset-form").hidden = true;
  HTMLFormElement.prototype.reset.call($("reset-form"));
  $("forgot-form").hidden = false;
  $("request-again").hidden = true;
  if (!$("recovery").open) $("recovery").showModal();
  $("email").focus();
}
$("open-forgot").addEventListener("click", openForgot);
$("request-again").addEventListener("click", openForgot);
$("close").addEventListener("click", () => $("recovery").close());
(async () => {
  if (location.pathname !== "/reset-password") return;
  $("recovery").showModal();
  $("request-again").hidden = false;
  $("forgot-form").hidden = true;
  $("title").textContent = "Đặt mật khẩu mới";
  $("subtitle").textContent = "Chọn mật khẩu mới cho tài khoản của bạn.";
  try {
    await api("check-reset-token", { token });
    $("reset-form").hidden = false;
  } catch (error) {
    notice(error.message, "error");
  }
})();
