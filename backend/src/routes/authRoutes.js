const router = require("express").Router();
const crypto = require("crypto");
const { db, transaction, audit } = require("../core/store");
const { route, fail, email, text } = require("../core/http");
const {
  hash,
  password,
  active,
  issue,
  rateLimit,
  authenticate,
  queueMail,
  bcrypt,
} = require("../core/auth");
const generic = "Nếu email tồn tại, hướng dẫn sẽ được gửi đến hộp thư của bạn.";
router.post(
  "/login",
  route(async (req, res) => {
    await rateLimit("login:" + req.ip, 60);
    const mail = email(req.body.email);
    const supplied = text(req.body.password, "Mật khẩu", 200);
    const result = await transaction(async (c) => {
      const [rows] = await c.query(
        "SELECT * FROM users WHERE email=? FOR UPDATE",
        [mail],
      );
      const u = rows[0];
      if (!u) {
        await bcrypt.hash(supplied, 10);
        return null;
      }
      if (
        !active(u) ||
        (u.lock_until && Date.parse(u.lock_until + "Z") > Date.now())
      )
        return null;
      const valid = await bcrypt
        .compare(supplied, u.password)
        .catch(() => false);
      if (!valid) {
        await c.query(
          "UPDATE users SET failed_login_attempts=failed_login_attempts+1,lock_until=IF(failed_login_attempts>=5,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),NULL) WHERE id=?",
          [u.id],
        );
        return null;
      }
      await c.query(
        "UPDATE users SET failed_login_attempts=0,lock_until=NULL WHERE id=?",
        [u.id],
      );
      return issue(c, u);
    });
    if (!result)
      fail(
        401,
        "Tài khoản hoặc mật khẩu không chính xác, hoặc tạm thời không thể đăng nhập.",
      );
    res.json(result);
  }),
);
router.post(
  "/logout",
  authenticate,
  route(async (req, res) => {
    await db.query(
      "UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE token_hash=?",
      [req.sessionHash],
    );
    res.json({ success: true });
  }),
);
router.post(
  "/refresh",
  authenticate,
  route(async (req, res) =>
    res.json({ success: true, user: req.user, expiresIn: 1800 }),
  ),
);
router.get(
  "/me",
  authenticate,
  route(async (req, res) => {
    const matrix = require("../config/roleMatrix");
    const permissions = Object.fromEntries(
      Object.keys(matrix).map((m) => [
        m,
        req.user.roles.map((r) => matrix[m][r]).filter((p) => p !== "N"),
      ]),
    );
    const [[group]] = req.user.group_id
      ? await db.query("SELECT id,name FROM `groups` WHERE id=?", [
          req.user.group_id,
        ])
      : [[null]];
    const { groups, has } = require("../core/access");
    const managedGroupIds = has(req.user, "Team Lead")
      ? await groups(req.user)
      : [];
    const [managedUsers] = managedGroupIds.length
      ? await db.query(
          `SELECT id FROM users WHERE group_id IN (${managedGroupIds.map(() => "?").join(",")})`,
          managedGroupIds,
        )
      : [[]];
    const grants = Object.fromEntries(
      Object.keys(matrix).map((module) => [
        module,
        req.user.roles
          .map((role) => ({ role, permission: matrix[module][role] }))
          .filter((g) => g.permission !== "N"),
      ]),
    );
    res.json({
      user: { ...req.user, group: group || null },
      permissions,
      grants,
      managed_group_ids: managedGroupIds,
      managed_user_ids: managedUsers.map((u) => u.id),
      self_registration: process.env.ALLOW_SELF_REGISTRATION === "true",
    });
  }),
);
router.get(
  "/role-matrix",
  authenticate,
  require("../core/access").authorize("USER_LOG"),
  route(async (req, res) =>
    res.json({ data: require("../config/roleMatrix") }),
  ),
);
router.get(
  "/options",
  route(async (req, res) =>
    res.json({
      self_registration: process.env.ALLOW_SELF_REGISTRATION === "true",
    }),
  ),
);
router.post(
  "/forgot-password",
  route(async (req, res) => {
    await rateLimit("reset:" + req.ip, 10);
    const mail = email(req.body.email);
    await transaction(async (c) => {
      const [[u]] = await c.query(
        "SELECT id FROM users WHERE email=? AND is_active=1",
        [mail],
      );
      if (!u) return;
      const token = crypto.randomBytes(32).toString("hex");
      await c.query(
        "UPDATE auth_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL",
        [u.id],
      );
      await c.query(
        "INSERT INTO auth_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
        [hash(token), u.id],
      );
      const base = process.env.FRONTEND_URL || "http://localhost:5173";
      await queueMail(
        c,
        mail,
        "Đặt lại mật khẩu CRM",
        `Liên kết có hiệu lực 30 phút, chỉ dùng một lần: ${base.replace(/\/$/, "")}/reset-password?token=${token}`,
      );
    });
    res.json({ message: generic });
  }),
);
router.post(
  "/reset-password",
  route(async (req, res) => {
    await rateLimit("reset-use:" + req.ip, 20);
    const next = password(
      req.body.newPassword || req.body.new_password || req.body.password,
    );
    const token = text(req.body.token, "Token", 200);
    await transaction(async (c) => {
      const [[r]] = await c.query(
        "SELECT * FROM auth_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE",
        [hash(token)],
      );
      if (!r) fail(400, "Liên kết không hợp lệ hoặc đã hết hạn.");
      await c.query(
        "UPDATE users SET password=?,failed_login_attempts=0,lock_until=NULL,must_change_password=0 WHERE id=?",
        [await bcrypt.hash(next, 12), r.user_id],
      );
      await c.query(
        "UPDATE auth_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL",
        [r.user_id],
      );
      await c.query(
        "UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=?",
        [r.user_id],
      );
    });
    res.json({
      success: true,
      message: "Đã đặt lại mật khẩu. Vui lòng đăng nhập.",
    });
  }),
);
router.put(
  "/change-password",
  authenticate,
  route(async (req, res) => {
    const next = password(req.body.newPassword || req.body.new_password);
    const current = text(
      req.body.currentPassword ||
        req.body.oldPassword ||
        req.body.current_password,
      "Mật khẩu hiện tại",
      200,
    );
    await transaction(async (c) => {
      const [[u]] = await c.query(
        "SELECT password FROM users WHERE id=? FOR UPDATE",
        [req.user.id],
      );
      if (!(await bcrypt.compare(current, u.password)))
        fail(400, "Mật khẩu hiện tại không chính xác.");
      await c.query(
        "UPDATE users SET password=?,must_change_password=0 WHERE id=?",
        [await bcrypt.hash(next, 12), req.user.id],
      );
      await c.query(
        "UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND token_hash<>?",
        [req.user.id, req.sessionHash],
      );
      await audit(
        c,
        req.user,
        "PASSWORD_CHANGE",
        "users",
        req.user.id,
        null,
        null,
      );
    });
    res.json({ success: true });
  }),
);
// Public self-registration is explicitly opt-in; clients cannot choose privileged roles.
router.post(
  "/send-register-otp",
  route(async (req, res) => {
    if (process.env.ALLOW_SELF_REGISTRATION !== "true")
      fail(403, "Tài khoản do quản trị viên cấp.");
    await rateLimit("register:" + req.ip, 5);
    const mail = email(req.body.email);
    const code = String(crypto.randomInt(100000, 1000000));
    await transaction(async (c) => {
      const [[u]] = await c.query("SELECT id FROM users WHERE email=?", [mail]);
      if (u) return;
      await c.query(
        "UPDATE auth_email_codes SET used_at=UTC_TIMESTAMP() WHERE email=? AND used_at IS NULL",
        [mail],
      );
      await c.query(
        "INSERT INTO auth_email_codes (email,code_hash,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))",
        [mail, hash(code)],
      );
      await queueMail(
        c,
        mail,
        "Xác minh email CRM",
        `Mã xác minh (10 phút): ${code}`,
      );
    });
    res.json({ message: generic });
  }),
);
router.post(
  "/register",
  route(async (req, res) => {
    if (process.env.ALLOW_SELF_REGISTRATION !== "true")
      fail(403, "Tài khoản do quản trị viên cấp.");
    await rateLimit("register-check:" + req.ip, 10);
    const mail = email(req.body.email);
    const pass = password(req.body.password);
    const name = text(req.body.full_name, "Họ tên", 100);
    const result = await transaction(async (c) => {
      const [[r]] = await c.query(
        "SELECT * FROM auth_email_codes WHERE email=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() ORDER BY id DESC LIMIT 1 FOR UPDATE",
        [mail],
      );
      if (!r || r.attempts >= 5) return false;
      await c.query(
        "UPDATE auth_email_codes SET attempts=attempts+1 WHERE id=?",
        [r.id],
      );
      if (r.code_hash !== hash(String(req.body.otp_code))) return false;
      const [u] = await c.query(
        "INSERT INTO users (email,password,full_name,role_code) VALUES (?,?,?,?)",
        [mail, await bcrypt.hash(pass, 12), name, "Sales Rep"],
      );
      await c.query(
        "INSERT INTO user_roles (user_id,role_code) VALUES (?,'Sales Rep')",
        [u.insertId],
      );
      await c.query(
        "UPDATE auth_email_codes SET used_at=UTC_TIMESTAMP() WHERE id=?",
        [r.id],
      );
      return true;
    });
    if (!result) fail(400, "Mã xác minh không hợp lệ hoặc hết hạn.");
    res.status(201).json({ success: true });
  }),
);
module.exports = router;
