const { db } = require("./store");
const { mailConfiguration } = require("./mailConfig");
const { fail } = require("./http");
function immediateEnabled() {
  return (
    process.env.NODE_ENV !== "test" ||
    process.env.MAIL_DISPATCH_IMMEDIATE === "true"
  );
}
function requireMail() {
  if (immediateEnabled() && !mailConfiguration().configured)
    fail(
      503,
      "Dịch vụ email chưa được cấu hình. Quản trị viên cần chạy npm run mail:configure trong backend rồi khởi động lại máy chủ.",
    );
}
async function deliverMail(ids) {
  if (!ids.length) return { status: "pending" };
  if (immediateEnabled()) {
    try {
      await require("../jobs/worker").mailJobs(ids);
    } catch (e) {
      console.error("mail_dispatch_failed", e.code || "SMTP_FAILURE");
    }
  }
  const [rows] = await db.query(
    `SELECT sent_at,last_error FROM mail_outbox WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  return {
    status:
      rows.length === ids.length && rows.every((row) => row.sent_at)
        ? "sent"
        : "pending",
    ...(rows.some((row) => row.last_error)
      ? {
          warning:
            "SMTP chưa chấp nhận thư. Tài khoản/yêu cầu đã lưu; kiểm tra trạng thái email trong Quản trị người dùng.",
        }
      : {}),
  };
}
async function requireDelivery(ids) {
  const result = await deliverMail(ids);
  if (immediateEnabled() && result.status !== "sent")
    fail(
      503,
      "Chưa gửi được email qua SMTP. Vui lòng liên hệ quản trị viên kiểm tra kết nối, cổng và mật khẩu ứng dụng; không cần tạo lại tài khoản.",
    );
  return result;
}
module.exports = { requireMail, deliverMail, requireDelivery };
