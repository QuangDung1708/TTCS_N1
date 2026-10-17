const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db, transaction, insert } = require("./store");
const { fail } = require("./http");
const { normalizeRole } = require("./access");
const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    fail(503, "Cần cấu hình JWT_SECRET tối thiểu 32 ký tự.");
  return process.env.JWT_SECRET;
}
function password(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value) > 72 ||
    !/[A-Za-z]/.test(value) ||
    !/[0-9]/.test(value)
  )
    fail(400, "Mật khẩu cần 8–72 byte, có chữ và số.");
  return value;
}
const active = (u) =>
  u &&
  Boolean(u.is_active) &&
  !["inactive", "Đã khóa", "locked", "0"].includes(String(u.status));
async function rolesFor(c, u) {
  const [rs] = await c.query(
    "SELECT role_code FROM user_roles WHERE user_id=?",
    [u.id],
  );
  return [
    ...new Set(rs.map((r) => normalizeRole(r.role_code)).filter(Boolean)),
  ];
}
async function identity(c, u) {
  const roles = await rolesFor(c, u);
  if (!roles.length) fail(403, "Tài khoản chưa được gán vai trò hợp lệ.");
  const ordered = [
    "Admin",
    "Director",
    "Team Lead",
    "Marketing",
    "Cust. Success",
    "Accountant",
    "Sales Rep",
  ];
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    phone: u.phone,
    avatar: u.avatar,
    email_signature: u.email_signature,
    group_id: u.group_id,
    role_id: u.role_id,
    roles,
    role_code: ordered.find((r) => roles.includes(r)),
    data_scope: roles.some((r) =>
      ["Admin", "Director", "Marketing", "Accountant"].includes(r),
    )
      ? "ALL"
      : roles.includes("Team Lead")
        ? "GROUP"
        : "OWN",
    must_change_password: !!u.must_change_password,
  };
}
async function issue(c, u) {
  const token = jwt.sign(
    { sub: String(u.id), jti: crypto.randomUUID() },
    secret(),
    {
      algorithm: "HS256",
      issuer: "ttcs-crm",
      audience: "ttcs-client",
      expiresIn: "7d",
    },
  );
  await c.query(
    "INSERT INTO auth_sessions (token_hash,user_id,expires_at,absolute_expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))",
    [hash(token), u.id],
  );
  return { token, user: await identity(c, u), expiresIn: 1800 };
}
async function rateLimit(key, max = 30, minutes = 15) {
  const bucket = hash(key) + ":" + Math.floor(Date.now() / (minutes * 60000));
  await transaction(async (c) => {
    await c.query(
      "INSERT INTO api_rate_limits (bucket,hits,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE)) ON DUPLICATE KEY UPDATE hits=hits+1",
      [bucket, minutes],
    );
  });
  const [[row]] = await db.query(
    "SELECT hits FROM api_rate_limits WHERE bucket=?",
    [bucket],
  );
  if (row.hits > max) fail(429, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
}
async function authenticate(req, res, next) {
  try {
    if (req.user && req.sessionHash) return next();
    const token = (req.headers.authorization || "").replace(/^Bearer /i, "");
    if (!token) fail(401, "Không tìm thấy token xác thực hợp lệ!");
    let decoded;
    try {
      decoded = jwt.verify(token, secret(), {
        algorithms: ["HS256"],
        issuer: "ttcs-crm",
        audience: "ttcs-client",
      });
    } catch (e) {
      if (e.status) throw e;
      fail(401, "Phiên làm việc không hợp lệ hoặc đã hết hạn!");
    }
    const tokenHash = hash(token);
    const [rows] = await db.query(
      "SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP() AND s.absolute_expires_at>UTC_TIMESTAMP()",
      [tokenHash, decoded.sub],
    );
    const u = rows[0];
    if (!active(u))
      fail(
        401,
        "Phiên đã hết hạn hoặc tài khoản bị khóa. Vui lòng đăng nhập lại.",
      );
    req.user = await identity(db, u);
    req.sessionHash = tokenHash;
    await db.query(
      "UPDATE auth_sessions SET expires_at=LEAST(absolute_expires_at,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE)) WHERE token_hash=? AND revoked_at IS NULL",
      [tokenHash],
    );
    res.set("X-Session-Idle-Seconds", "1800");
    next();
  } catch (e) {
    next(e);
  }
}
async function queueMail(c, to, subject, body) {
  return insert(c, "mail_outbox", { recipient: to, subject, body });
}
module.exports = {
  hash,
  password,
  active,
  identity,
  issue,
  rateLimit,
  authenticate,
  queueMail,
  bcrypt,
};
