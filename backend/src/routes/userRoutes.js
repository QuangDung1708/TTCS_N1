const router = require("express").Router();
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, email, phone, page } = require("../core/http");
const {
  authenticate,
  bcrypt,
  password,
  queueMail,
  identity,
  hash,
} = require("../core/auth");
const { requireRoles, normalizeRole } = require("../core/access");
const upload = require("../middleware/uploadMiddleware");
router.use(authenticate);
router.get(
  "/profile",
  route(async (req, res) => {
    const [[u]] = await db.query("SELECT * FROM users WHERE id=?", [
      req.user.id,
    ]);
    res.json({ user: await identity(db, u) });
  }),
);
router.put(
  "/profile",
  route(async (req, res) => {
    if (
      ["email", "roles", "role_code", "role_id", "group_id"].some(
        (k) => k in req.body,
      )
    )
      fail(403, "Không tự đổi được email, nhóm hoặc vai trò.");
    await update(db, "users", req.user.id, {
      full_name: text(req.body.full_name, "Họ tên", 100),
      phone: phone(req.body.phone),
      email_signature: req.body.email_signature
        ? text(req.body.email_signature, "Chữ ký", 5000)
        : null,
    });
    const [[u]] = await db.query("SELECT * FROM users WHERE id=?", [
      req.user.id,
    ]);
    res.json({ user: await identity(db, u) });
  }),
);
router.post(
  "/profile/avatar",
  upload.single("avatar"),
  route(async (req, res) => {
    if (!req.file) fail(400, "Thiếu ảnh.");
    const image = sharp(req.file.buffer, { limitInputPixels: 16000000 });
    let meta;
    try {
      meta = await image.metadata();
    } catch {
      fail(400, "Nội dung tệp không phải ảnh JPG/PNG hợp lệ.");
    }
    if (!["jpeg", "png"].includes(meta.format))
      fail(400, "Chỉ chấp nhận JPG/PNG.");
    const dir = path.join(__dirname, "../../uploads/avatars");
    await fs.mkdir(dir, { recursive: true });
    const name = crypto.randomUUID();
    await image
      .clone()
      .resize(512, 512, { fit: "cover" })
      .png()
      .toFile(path.join(dir, name + ".png"));
    await image
      .clone()
      .resize(96, 96, { fit: "cover" })
      .png()
      .toFile(path.join(dir, name + "-thumb.png"));
    const data = {
      avatar: `/uploads/avatars/${name}.png`,
      avatar_thumbnail: `/uploads/avatars/${name}-thumb.png`,
    };
    await update(db, "users", req.user.id, data);
    res.json(data);
  }),
);
router.post("/avatar", (req, res, next) => {
  req.url = "/profile/avatar";
  router.handle(req, res, next);
});
router.use(requireRoles("Admin"));
const roleNames = [
  "Sales Rep",
  "Team Lead",
  "Director",
  "Marketing",
  "Cust. Success",
  "Accountant",
  "Admin",
];
router.get(
  "/roles/list",
  route(async (req, res) =>
    res.json({
      data: roleNames.map((code) => ({
        code,
        role_code: code,
        role_name: code,
        name: code,
      })),
    }),
  ),
);
router.get(
  "/groups/list",
  route(async (req, res) => {
    const [rows] = await db.query(
      "SELECT id,name,parent_id FROM `groups` ORDER BY name",
    );
    res.json({ data: rows });
  }),
);
async function validateRoles(c, body, current) {
  let roles = body.roles || (body.role_code ? [body.role_code] : null);
  if (!roles && body.role_id) {
    const [[r]] = await c.query("SELECT * FROM roles WHERE id=?", [
      id(body.role_id),
    ]);
    roles = [r?.code || r?.role_name || r?.name];
  }
  roles = roles || current?.roles || ["Sales Rep"];
  if (!Array.isArray(roles) || !roles.length)
    fail(400, "Cần ít nhất một vai trò.");
  roles = [...new Set(roles.map(normalizeRole))];
  if (roles.includes(null)) fail(400, "Vai trò không hợp lệ.");
  const groupId =
    body.group_id === undefined
      ? current?.group_id || null
      : body.group_id
        ? id(body.group_id)
        : null;
  if (roles.includes("Team Lead") && !groupId)
    fail(400, "Trưởng nhóm phải thuộc một nhóm cụ thể.");
  if (groupId) {
    const [[g]] = await c.query("SELECT id FROM `groups` WHERE id=?", [
      groupId,
    ]);
    if (!g) fail(400, "Nhóm không tồn tại.");
  }
  return { roles, groupId };
}
async function createUser(c, actor, b) {
  const mail = email(b.email);
  const name = text(b.full_name, "Họ tên", 100);
  const { roles, groupId } = await validateRoles(c, b);
  const temp = crypto.randomBytes(18).toString("base64url") + "9a";
  const uid = await insert(c, "users", {
    email: mail,
    full_name: name,
    password: await bcrypt.hash(temp, 12),
    phone: phone(b.phone),
    group_id: groupId,
    role_code: roles[0],
    must_change_password: 1,
  });
  for (const role of roles)
    await insert(c, "user_roles", { user_id: uid, role_code: role });
  const activation = crypto.randomBytes(32).toString("hex");
  await c.query(
    "INSERT INTO auth_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
    [hash(activation), uid],
  );
  await queueMail(
    c,
    mail,
    "Kích hoạt tài khoản CRM",
    `Tài khoản: ${mail}\nMật khẩu tạm: ${temp}\nĐặt mật khẩu riêng tại ${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "")}/reset-password?token=${activation} (30 phút).`,
  );
  await audit(c, actor, "CREATE", "users", uid, null, {
    email: mail,
    roles,
    group_id: groupId,
  });
  return uid;
}
router.post(
  "/",
  route(async (req, res) =>
    res.status(201).json({
      id: await transaction((c) => createUser(c, req.user, req.body)),
    }),
  ),
);
router.get(
  "/",
  route(async (req, res) => {
    const q = req.query;
    let where = "1=1";
    const args = [];
    if (q.search) {
      where += " AND (u.full_name LIKE ? OR u.email LIKE ?)";
      args.push("%" + q.search + "%", "%" + q.search + "%");
    }
    for (const k of ["group_id", "status"])
      if (q[k]) {
        where += ` AND u.${k}=?`;
        args.push(q[k]);
      }
    if (q.role || q.role_code) {
      where +=
        " AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role_code=?)";
      args.push(normalizeRole(q.role || q.role_code));
    }
    const p = page(q);
    const [[count]] = await db.query(
      `SELECT COUNT(*) total FROM users u WHERE ${where}`,
      args,
    );
    const [rows] = await db.query(
      `SELECT u.* FROM users u WHERE ${where} ORDER BY u.id LIMIT ? OFFSET ?`,
      [...args, p.limit, p.offset],
    );
    res.json({
      data: await Promise.all(
        rows.map(async (u) => ({
          ...(await identity(db, u)),
          status: u.status,
          is_active: !!u.is_active,
          created_at: u.created_at,
        })),
      ),
      total: count.total,
      pageSize: p.limit,
    });
  }),
);
async function edit(req, res) {
  const uid = id(req.params.id);
  await transaction(async (c) => {
    const [[u]] = await c.query("SELECT * FROM users WHERE id=? FOR UPDATE", [
      uid,
    ]);
    if (!u) fail(404, "Không tìm thấy tài khoản.");
    const old = await identity(c, u);
    const { roles, groupId } = await validateRoles(c, req.body, old);
    if (uid === req.user.id && !roles.includes("Admin"))
      fail(403, "Không thể tự thu hồi vai trò quản trị.");
    await update(c, "users", uid, {
      email: req.body.email === undefined ? u.email : email(req.body.email),
      full_name: req.body.full_name
        ? text(req.body.full_name, "Họ tên", 100)
        : u.full_name,
      phone: req.body.phone === undefined ? u.phone : phone(req.body.phone),
      group_id: groupId,
      role_code: roles[0],
    });
    await c.query("DELETE FROM user_roles WHERE user_id=?", [uid]);
    for (const role of roles)
      await insert(c, "user_roles", { user_id: uid, role_code: role });
    await audit(
      c,
      req.user,
      "ROLE_CHANGE",
      "users",
      uid,
      { roles: old.roles, group_id: u.group_id },
      { roles, group_id: groupId },
    );
  });
  res.json({ success: true });
}
router.put("/:id/role", route(edit));
router.put("/:id", route(edit));
router.put("/:id/lock", (req, res, next) => {
  req.body.status = "inactive";
  req.url = "/" + id(req.params.id) + "/status";
  router.handle(req, res, next);
});
router.get(
  "/:id/customers-count",
  route(async (req, res) => {
    const [[c]] = await db.query(
      "SELECT COUNT(*) count FROM customers WHERE created_by=?",
      [id(req.params.id)],
    );
    const [[d]] = await db.query(
      "SELECT COUNT(*) count FROM deals WHERE owner_id=?",
      [id(req.params.id)],
    );
    res.json({ count: c.count, customers: c.count, deals: d.count });
  }),
);
router.put(
  "/:id/status",
  route(async (req, res) => {
    const uid = id(req.params.id);
    if (uid === req.user.id) fail(403, "Không thể tự khóa tài khoản.");
    if (
      ![
        "active",
        "Hoạt động",
        "inactive",
        "Đã khóa",
        "locked",
        true,
        false,
        0,
        1,
      ].includes(req.body.status ?? req.body.is_active)
    )
      fail(400, "Trạng thái tài khoản không hợp lệ.");
    const disabled = ["inactive", "Đã khóa", "locked", false, 0].includes(
      req.body.status ?? req.body.is_active,
    );
    await transaction(async (c) => {
      const [[u]] = await c.query(
        "SELECT id,status FROM users WHERE id=? FOR UPDATE",
        [uid],
      );
      if (!u) fail(404, "Không tìm thấy tài khoản.");
      if (disabled) {
        const target = id(
          req.body.transfer_to ||
            req.body.handover_to ||
            req.body.new_owner_id ||
            req.body.receiver_id ||
            req.body.handover_user_id,
        );
        if (target === uid)
          fail(400, "Người tiếp nhận phải khác người nghỉ việc.");
        const [[v]] = await c.query(
          "SELECT id,group_id FROM users WHERE id=? AND is_active=1 FOR UPDATE",
          [target],
        );
        if (!v) fail(400, "Người tiếp nhận không hoạt động.");
        for (const [table, col] of [
          ["customers", "created_by"],
          ["deals", "owner_id"],
          ["leads", "owner_id"],
          ["quotes", "owner_id"],
        ]) {
          const [records] = await c.query(
            `SELECT id FROM ${table} WHERE ${col}=? FOR UPDATE`,
            [uid],
          );
          await c.query(
            `UPDATE ${table} SET ${col}=?,group_id=? WHERE ${col}=?`,
            [target, v.group_id, uid],
          );
          for (const row of records)
            await audit(
              c,
              req.user,
              "HANDOVER",
              table,
              row.id,
              { owner_id: uid },
              { owner_id: target },
              "Bàn giao khi khóa tài khoản",
            );
        }
        await c.query(
          "UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=?",
          [uid],
        );
      }
      await update(c, "users", uid, {
        status: disabled ? "Đã khóa" : "Hoạt động",
        is_active: !disabled,
      });
      await audit(c, req.user, "STATUS_CHANGE", "users", uid, u, {
        status: disabled ? "Đã khóa" : "Hoạt động",
      });
    });
    res.json({ success: true });
  }),
);
router.delete(
  "/:id",
  route(async () =>
    fail(
      409,
      "Khóa và bàn giao tài khoản để giữ lịch sử; không xóa người dùng.",
    ),
  ),
);
module.exports = router;
module.exports.createUser = createUser;
