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
  let dispatch;
  if (immediateEnabled()) {
    try {
      dispatch = await require("../jobs/worker").mailJobs(ids);
    } catch (e) {
      dispatch = { error: e.code || "MAIL_QUEUE_FAILURE" };
      console.error("mail_dispatch_failed", dispatch.error);
    }
  }
  const [rows] = await db.query(
    `SELECT sent_at,last_error FROM mail_outbox WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const rawCode =
    rows.find((row) => row.last_error)?.last_error || dispatch?.error;
  const error_code =
    rawCode && /^[A-Z0-9_]{1,60}$/.test(rawCode)
      ? rawCode
      : rawCode
        ? "MAIL_QUEUE_FAILURE"
        : null;
  return {
    error_code,
    ...(dispatch?.skipped && !error_code ? { queued: true } : {}),
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
  if (immediateEnabled() && result.status !== "sent" && !result.queued) {
    const message =
      result.error_code === "EAUTH"
        ? "SMTP từ chối xác thực (EAUTH). Nếu CMD đã gửi được mail, hãy tắt hẳn backend rồi mở lại để nạp cấu hình .env mới."
        : result.error_code
          ? `Chưa gửi được email (${result.error_code}). Kiểm tra trạng thái mail trong Quản trị người dùng; tài khoản đã tạo vẫn được giữ.`
          : "Thư chưa được gửi từ hàng đợi. Vui lòng khởi động lại backend rồi thử lại.";
    fail(503, message, { code: result.error_code || "MAIL_QUEUE_PENDING" });
  }
  return result;
}
module.exports = { requireMail, deliverMail, requireDelivery };
