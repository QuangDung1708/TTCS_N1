class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const fail = (status, message, details) => {
  throw new HttpError(status, message, details);
};
const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const id = (value) => {
  if (!["number", "string"].includes(typeof value) || value === "")
    fail(400, "ID không hợp lệ.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) fail(400, "ID không hợp lệ.");
  return n;
};
const text = (value, field, max = 255) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(400, `${field} không hợp lệ.`);
  return value.trim();
};
const number = (value, field, min = 0, max = 1e12) => {
  if (
    !["number", "string"].includes(typeof value) ||
    value === null ||
    value === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail(400, `${field} không hợp lệ.`);
  return Number(value);
};
const email = (value) => {
  const v = text(value, "Email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400, "Email không hợp lệ.");
  return v;
};
const phone = (value) => {
  if (!value) return null;
  const v = String(value).replace(/[ .-]/g, "");
  if (!/^(0|\+84)[35789]\d{8}$/.test(v))
    fail(400, "Số điện thoại Việt Nam không hợp lệ.");
  return v.replace(/^\+84/, "0");
};
const date = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    fail(400, "Ngày không hợp lệ.");
  return value;
};
const json = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    fail(400, "JSON không hợp lệ.");
  }
};
const page = (query) => {
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(Number(query.pageSize || query.limit) || 20)),
  );
  const current = Math.max(1, Math.floor(Number(query.page) || 1));
  return { limit, offset: (current - 1) * limit };
};
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status =
    err.status ||
    (err.code === "ER_DUP_ENTRY"
      ? 409
      : err.code === "ER_ROW_IS_REFERENCED_2"
        ? 409
        : err.code === "LIMIT_FILE_SIZE"
          ? 413
          : 500);
  if (status === 500)
    console.error(
      "request_failed",
      req.method,
      req.path,
      err.code || err.name,
      err.message,
    );
  res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Lỗi máy chủ. Vui lòng thử lại hoặc liên hệ quản trị viên."
        : err.code === "ER_DUP_ENTRY"
          ? "Dữ liệu đã tồn tại."
          : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
module.exports = {
  HttpError,
  fail,
  route,
  id,
  text,
  number,
  email,
  phone,
  date,
  json,
  page,
  errorHandler,
};
