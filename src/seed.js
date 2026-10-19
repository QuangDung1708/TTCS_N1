const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { createStore, hashPassword } = require("./store");
(async () => {
  const email = (process.env.DEMO_EMAIL || "sales@example.test")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("DEMO_EMAIL không hợp lệ.");
  const store = createStore(path.resolve(__dirname, "../data/db.json"));
  if (store.state.users.some((u) => u.email === email))
    return console.log("Đã có tài khoản mẫu; giữ nguyên mật khẩu.");
  const passwordHash = await hashPassword("Demo12345!");
  store.update((s) =>
    s.users.push({
      id: require("node:crypto").randomUUID(),
      name: "Nhân viên mẫu",
      email,
      passwordHash,
    }),
  );
  console.log(
    "Đã tạo tài khoản DEMO_EMAIL trong DB riêng. Khởi động lại server nếu đang chạy.",
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
