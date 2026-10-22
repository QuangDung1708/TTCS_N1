require("dotenv").config();
const { createMailTransport } = require("../src/core/mailConfig");
const { email } = require("../src/core/http");
async function main() {
  const recipient = email(process.argv[2] || process.env.CRM_MAIL_TEST_TO);
  const transport = createMailTransport();
  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient,
      subject: "Enterprise CRM — kiểm tra nhận email",
      text: "Đây là thư kiểm tra cấu hình SMTP từ Enterprise CRM. Nếu bạn nhận được thư này, đường gửi email đã hoạt động. Thư không chứa mật khẩu hoặc mã xác minh.",
    });
    if (!info.accepted?.length)
      throw Object.assign(new Error(), { code: "SMTP_RECIPIENT_REJECTED" });
    console.log(
      "SMTP đã chấp nhận thư kiểm thử. Kiểm tra Hộp thư đến / Spam tại email bạn vừa nhập; chỉ xác nhận nhận thư sau khi thấy thư ở đó.",
    );
  } finally {
    transport.close();
  }
}
main().catch((error) => {
  console.error(
    error.code
      ? `Chưa gửi được thư: ${error.code}. Chạy npm run mail:configure.`
      : error.message,
  );
  process.exitCode = 1;
});
