const router = require("express").Router();
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, normalizeRole } = require("../core/access");
router.use(authenticate, authorize("CATEGORY"));
router.get(
  "/tree",
  route(async (req, res) => {
    const [rows] = await db.query(
      "SELECT g.*,u.full_name leader_name,r.name region_name,(SELECT COUNT(*) FROM users m WHERE m.group_id=g.id) member_count FROM `groups` g LEFT JOIN users u ON u.id=g.leader_id LEFT JOIN regions r ON r.id=g.region_id ORDER BY g.id",
    );
    const map = new Map(rows.map((g) => [g.id, { ...g, children: [] }]));
    const data = [];
    for (const g of map.values())
      if (map.has(g.parent_id)) map.get(g.parent_id).children.push(g);
      else data.push(g);
    res.json({ data });
  }),
);
router.get(
  "/regions",
  route(async (req, res) => {
    const [data] = await db.query("SELECT * FROM regions ORDER BY name");
    res.json({ data });
  }),
);
router.post(
  "/regions",
  route(async (req, res) =>
    res.status(201).json({
      id: await insert(db, "regions", {
        name: text(req.body.name, "Khu vực", 100),
        code: req.body.code || null,
      }),
    }),
  ),
);
async function save(req, res) {
  const result = await transaction(async (c) => {
    const bid = req.params.id ? id(req.params.id) : null;
    let old = {};
    if (bid) {
      const [[r]] = await c.query(
        "SELECT * FROM `groups` WHERE id=? FOR UPDATE",
        [bid],
      );
      if (!r) fail(404, "Nhóm không tồn tại.");
      old = r;
    }
    const b = { ...old, ...req.body };
    const parent = b.parent_id ? id(b.parent_id) : null;
    const leader = b.leader_id ? id(b.leader_id) : null;
    const region = b.region_id ? id(b.region_id) : null;
    if (!leader) fail(400, "Mỗi nhóm phải có một trưởng nhóm.");
    if (parent) {
      const [[g]] = await c.query("SELECT id FROM `groups` WHERE id=?", [
        parent,
      ]);
      if (!g) fail(400, "Nhóm cha không tồn tại.");
      if (bid) {
        const [tree] = await c.query(
          "WITH RECURSIVE tree AS (SELECT id FROM `groups` WHERE id=? UNION DISTINCT SELECT g.id FROM `groups` g JOIN tree t ON g.parent_id=t.id) SELECT id FROM tree",
          [bid],
        );
        if (tree.some((g) => g.id === parent))
          fail(400, "Không được tạo vòng lặp tổ chức.");
      }
    }
    if (region) {
      const [[r]] = await c.query("SELECT id FROM regions WHERE id=?", [
        region,
      ]);
      if (!r) fail(400, "Khu vực không tồn tại.");
    }
    if (leader) {
      const [[u]] = await c.query(
        "SELECT id FROM users WHERE id=? AND is_active=1 FOR UPDATE",
        [leader],
      );
      if (!u) fail(400, "Trưởng nhóm không hoạt động.");
      const [[g]] = await c.query(
        "SELECT id FROM `groups` WHERE leader_id=? AND id<>?",
        [leader, bid || 0],
      );
      if (g) fail(409, "Người này đã phụ trách nhóm khác.");
    }
    const data = {
      name: text(b.name, "Tên nhóm", 100),
      parent_id: parent,
      leader_id: leader,
      region_id: region,
      description: b.description || null,
    };
    let gid = bid;
    if (gid) await update(c, "groups", gid, data);
    else gid = await insert(c, "groups", data);
    if (leader) {
      await update(c, "users", leader, { group_id: gid });
      await c.query(
        "INSERT INTO user_roles (user_id,role_code) VALUES (?,'Team Lead') ON DUPLICATE KEY UPDATE role_code=VALUES(role_code)",
        [leader],
      );
    }
    await audit(c, req.user, "ORGANIZATION_CHANGE", "groups", gid, old, data);
    return gid;
  });
  res.json({ id: result });
}
router.post("/groups", route(save));
router.put("/groups/:id", route(save));
router.post(
  "/groups/:id/assign-member",
  route(async (req, res) => {
    await transaction(async (c) => {
      const gid = id(req.params.id);
      const [[g]] = await c.query("SELECT id FROM `groups` WHERE id=?", [gid]);
      if (!g) fail(404, "Nhóm không tồn tại.");
      const ids = req.body.user_ids || [req.body.user_id];
      if (!Array.isArray(ids) || !ids.length) fail(400, "Thiếu người dùng.");
      for (const uid of ids) {
        const [[u]] = await c.query(
          "SELECT id,group_id FROM users WHERE id=? FOR UPDATE",
          [id(uid)],
        );
        if (!u) fail(400, "Người dùng không tồn tại.");
        const [[leader]] = await c.query(
          "SELECT id FROM `groups` WHERE leader_id=? AND id<>?",
          [u.id, gid],
        );
        if (leader)
          fail(409, "Phải thay trưởng nhóm cũ trước khi chuyển nhóm.");
        await update(c, "users", u.id, { group_id: gid });
        await audit(
          c,
          req.user,
          "GROUP_CHANGE",
          "users",
          u.id,
          { group_id: u.group_id },
          { group_id: gid },
        );
      }
    });
    res.json({ success: true });
  }),
);
router.delete(
  "/groups/:id",
  route(async (req, res) => {
    await transaction(async (c) => {
      const gid = id(req.params.id);
      for (const [table, col] of [
        ["users", "group_id"],
        ["groups", "parent_id"],
        ["customers", "group_id"],
        ["deals", "group_id"],
        ["leads", "group_id"],
      ]) {
        const [[r]] = await c.query(
          `SELECT COUNT(*) n FROM \`${table}\` WHERE ${col}=?`,
          [gid],
        );
        if (r.n) fail(409, "Nhóm đang được sử dụng.");
      }
      await c.query("DELETE FROM `groups` WHERE id=?", [gid]);
    });
    res.json({ success: true });
  }),
);
module.exports = router;
