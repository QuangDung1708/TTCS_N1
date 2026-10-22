const r = require("express").Router();
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, id, text, number, date, fail } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, record, scope, requireRoles } = require("../core/access");
r.use(authenticate, authorize("LEAD"));
r.get(
  "/options",
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT id,name FROM campaigns ORDER BY name,id",
    );
    res.json({ data });
  }),
);
r.use(requireRoles("Admin", "Director", "Marketing"));
r.get(
  "/",
  route(async (req, res) => {
    const [data] = await db.query(
      `SELECT c.*,(SELECT COUNT(*) FROM leads l WHERE l.campaign_id=c.id AND l.status<>'MERGED') lead_count,(SELECT COUNT(*) FROM deals d WHERE d.campaign_id=c.id) deal_count,(SELECT COALESCE(SUM(d.actual_amount),0) FROM deals d WHERE d.campaign_id=c.id AND d.status='WON') won_value FROM campaigns c ORDER BY id DESC`,
    );
    res.json({ data });
  }),
);
async function save(req, res) {
  const rid = await transaction(async (c) => {
    let old = {};
    if (req.params.id)
      old = await record(
        c,
        req.user,
        "LEAD",
        "campaigns",
        req.params.id,
        true,
        "created_by",
        true,
      );
    const b = { ...old, ...req.body };
    const start = date(b.start_date),
      end = date(b.end_date);
    if (end < start) fail(400, "Thời gian chiến dịch không hợp lệ.");
    const data = {
      name: text(b.name, "Tên chiến dịch"),
      budget: number(b.budget, "Ngân sách"),
      start_date: start,
      end_date: end,
      channel: text(b.channel, "Kênh", 100),
      created_by: old.created_by || req.user.id,
      group_id: old.group_id || req.user.group_id,
    };
    let rid = old.id;
    if (rid) await update(c, "campaigns", rid, data);
    else rid = await insert(c, "campaigns", data);
    await audit(
      c,
      req.user,
      old.id ? "UPDATE" : "CREATE",
      "campaigns",
      rid,
      old,
      data,
    );
    return rid;
  });
  res.json({ id: rid });
}
r.post("/", route(save));
r.put("/:id", route(save));
module.exports = r;
