/* Run locally; credentials stay in backend/.env and are never printed. */
require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { Writable } = require("node:stream");
const nodemailer = require("nodemailer");
const { mailConfiguration } = require("../src/core/mailConfig");
function dotenvValue(value) {
  value = String(value || "");
  if (/[\r\n]/.test(value))
    throw Error("Giá trị SMTP không được chứa xuống dòng.");
  const quote = ["'", '"', "`"].find((mark) => !value.includes(mark));
  if (!quote)
    throw Error(
      "Giá trị chứa cả ba loại dấu nháy; hãy cấu hình trực tiếp qua biến môi trường. Chưa ghi .env.",
    );
  return quote + value + quote;
}
async function main() {
  if (!process.stdin.isTTY)
    throw Error(
      "Chạy npm run mail:configure trong terminal tương tác trên máy của bạn.",
    );
  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!hidden) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  const next = { ...process.env };
  try {
    console.log(
      "Thiết lập SMTP. Gmail: smtp.gmail.com, cổng 587, dùng App Password 16 ký tự (không dùng mật khẩu đăng nhập Gmail).",
    );
    next.SMTP_HOST =
      (await rl.question("SMTP host [smtp.gmail.com]: ")).trim() ||
      next.SMTP_HOST ||
      "smtp.gmail.com";
    next.SMTP_PORT =
      (await rl.question("SMTP port [587]: ")).trim() ||
      next.SMTP_PORT ||
      "587";
    next.SMTP_SECURE = next.SMTP_PORT === "465" ? "true" : "false";
    next.SMTP_USER =
      (
        await rl.question("Email gửi (để trống giữ cấu hình hiện tại): ")
      ).trim() || next.SMTP_USER;
    process.stdout.write(
      "App Password / SMTP password (ẩn, để trống giữ hiện tại): ",
    );
    hidden = true;
    const secret = await rl.question("");
    hidden = false;
    process.stdout.write("\n");
    next.SMTP_PASS = secret || next.SMTP_PASS;
    if (next.SMTP_HOST === "smtp.gmail.com")
      next.SMTP_PASS = next.SMTP_PASS?.replace(/\s/g, "");
    next.SMTP_FROM =
      (await rl.question("Địa chỉ From (để trống dùng email gửi): ")).trim() ||
      next.SMTP_USER;
    const config = mailConfiguration(next);
    if (!config.configured)
      throw Error("Thiếu/sai: " + config.missing.join(", "));
    const transport = nodemailer.createTransport(config.options);
    try {
      await transport.verify();
    } finally {
      transport.close();
    }
    const file = path.resolve(__dirname, "../.env");
    let content = await fs.readFile(file, "utf8");
    for (const key of [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_SECURE",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
    ]) {
      const value = dotenvValue(next[key]);
      const pattern = new RegExp("^" + key + "=.*$", "m");
      content = pattern.test(content)
        ? content.replace(pattern, () => `${key}=${value}`)
        : content.trimEnd() + `\n${key}=${value}\n`;
    }
    await fs.writeFile(file, content, { mode: 0o600 });
    console.log(
      "SMTP kết nối/xác thực thành công. Đã lưu cấu hình, giữ nguyên cấu hình DB và dữ liệu. Khởi động lại backend; chạy npm run mail:send-test -- email-cua-ban để kiểm tra nhận thư.",
    );
  } finally {
    hidden = false;
    rl.close();
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(
      error.code
        ? `SMTP thất bại: ${error.code}. Chưa lưu thay đổi; kiểm tra host/cổng/TLS/App Password.`
        : error.message,
    );
    process.exitCode = 1;
  });

module.exports = { dotenvValue };
