const nodemailer = require("nodemailer");
function mailConfiguration(env = process.env) {
  const missing = [];
  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465;
  if (!env.SMTP_HOST?.trim()) missing.push("SMTP_HOST");
  if (!env.SMTP_FROM?.trim() && !env.SMTP_USER?.trim())
    missing.push("SMTP_FROM hoặc SMTP_USER");
  if (env.SMTP_USER && !env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    missing.push("SMTP_PORT hợp lệ");
  if (port === 465 && !secure)
    missing.push("SMTP_SECURE=true khi dùng cổng 465");
  return {
    configured: missing.length === 0,
    missing,
    options: {
      host: env.SMTP_HOST,
      port,
      secure,
      ...(env.SMTP_USER
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
        : {}),
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    },
  };
}
function createMailTransport() {
  const config = mailConfiguration();
  if (!config.configured)
    throw Object.assign(
      new Error("Thiếu/sai cấu hình: " + config.missing.join(", ")),
      { code: "SMTP_CONFIG_MISSING" },
    );
  return nodemailer.createTransport(config.options);
}
async function mailStatus(db) {
  const { configured, missing } = mailConfiguration();
  const [[queue]] = await db.query(
    "SELECT COALESCE(SUM(sent_at IS NULL),0) pending,COALESCE(SUM(sent_at IS NULL AND attempts>=10),0) failed,COALESCE(SUM(sent_at IS NOT NULL),0) sent,MAX(sent_at) last_sent_at FROM mail_outbox",
  );
  const [[last]] = await db.query(
    "SELECT last_error FROM mail_outbox WHERE sent_at IS NULL AND last_error IS NOT NULL ORDER BY id DESC LIMIT 1",
  );
  return {
    configured,
    missing,
    error_help:
      {
        EAUTH:
          "SMTP từ chối xác thực. Gmail cần bật xác minh 2 bước và dùng App Password, không dùng mật khẩu Gmail.",
        ETIMEDOUT:
          "Kết nối SMTP quá hạn. Kiểm tra host, cổng và kết nối mạng/tường lửa.",
        ECONNECTION: "Không kết nối được máy chủ SMTP. Kiểm tra host và cổng.",
        ESOCKET:
          "Lỗi kết nối/TLS SMTP. Kiểm tra cổng 465 + secure=true hoặc cổng 587 + secure=false.",
        EENVELOPE:
          "SMTP từ chối người gửi hoặc người nhận. Kiểm tra From và địa chỉ email nhận.",
      }[last?.last_error] || null,
    worker_enabled: process.env.RUN_WORKER !== "false",
    queue,
    last_error: last?.last_error
      ? /^[A-Z0-9_]{1,60}$/.test(last.last_error)
        ? last.last_error
        : "SMTP_FAILURE"
      : null,
  };
}
module.exports = { mailConfiguration, createMailTransport, mailStatus };
