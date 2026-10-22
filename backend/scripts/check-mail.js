require("dotenv").config();
const {
  mailConfiguration,
  createMailTransport,
} = require("../src/core/mailConfig");
async function main() {
  const config = mailConfiguration();
  if (!config.configured)
    throw Error(
      "Chưa gửi được email. Thiếu/sai: " +
        config.missing.join(", ") +
        ". Bổ sung trong backend/.env rồi khởi động lại backend.",
    );
  const transport = createMailTransport();
  try {
    await transport.verify();
    console.log(
      "SMTP đã kết nối và xác thực thành công. Chưa gửi thư kiểm thử hoặc xác nhận thư tới hộp thư.",
    );
    if (process.env.RUN_WORKER === "false")
      console.log(
        "RUN_WORKER=false: cần chạy npm run worker để gửi các thư trong hàng đợi.",
      );
  } finally {
    transport.close();
  }
}
main().catch((e) => {
  // Print only our configuration message or a transport error code; SMTP replies
  // can contain addresses or other private information.
  console.error(
    e.code
      ? `SMTP kiểm tra thất bại: ${e.code}. Kiểm tra host/cổng/TLS/App Password.`
      : e.message,
  );
  process.exitCode = 1;
});
