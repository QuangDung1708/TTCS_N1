const r = require("express").Router();
const { db, transaction, insert } = require("../core/store");
const { route, fail, id, text } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, scope, record } = require("../core/access");
r.use(authenticate, authorize("ACTIVITY"));
async function list(user, q) {
  const s = await scope(
    user,
    "ACTIVITY",
    "",
    false,
    db,
    "COALESCE(d.owner_id,c.created_by)",
  );
  let where = s.sql;
  const args = [...s.params];
  for (const key of ["customer_id", "deal_id"]) {
    if (q[key]) {
      where += ` AND a.${key}=?`;
      args.push(id(q[key]));
    }
  }
  if (q.search) {
    where += " AND a.content LIKE ?";
    args.push("%" + q.search + "%");
  }
  const [data] = await db.query(
    `SELECT a.* FROM customer_activities a JOIN customers c ON c.id=a.customer_id LEFT JOIN deals d ON d.id=a.deal_id WHERE ${where} ORDER BY a.created_at DESC,a.id DESC`,
    args,
  );
  return data;
}
r.get(
  "/",
  route(async (req, res) =>
    res.json({ data: await list(req.user, req.query) }),
  ),
);
r.get(
  "/export",
  route(async (req, res) => {
    const XLSX = require("xlsx");
    const data = (await list(req.user, req.query)).map((a) => ({
      ...a,
      content: /^[=+@\-\t\r]/.test(a.content) ? "'" + a.content : a.content,
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(data),
      "Activities",
    );
    res
      .attachment("activities.xlsx")
      .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
  }),
);
r.get(
  "/:id",
  route(async (req, res) => {
    const s = await scope(
      req.user,
      "ACTIVITY",
      "",
      false,
      db,
      "COALESCE(d.owner_id,c.created_by)",
    );
    const [[data]] = await db.query(
      `SELECT a.* FROM customer_activities a JOIN customers c ON c.id=a.customer_id LEFT JOIN deals d ON d.id=a.deal_id WHERE a.id=? AND (${s.sql})`,
      [id(req.params.id), ...s.params],
    );
    if (!data) fail(403, "Bạn không có quyền xem hoạt động này.");
    res.json({ data });
  }),
);
r.post(
  "/",
  route(async (req, res) => {
    const rid = await transaction(async (c) => {
      const customer = await record(
        c,
        req.user,
        "ACTIVITY",
        "customers",
        req.body.customer_id,
        true,
        "created_by",
        true,
      );
      let deal = null;
      if (req.body.deal_id) {
        deal = await record(
          c,
          req.user,
          "ACTIVITY",
          "deals",
          req.body.deal_id,
          true,
          "owner_id",
          true,
        );
        if (deal.customer_id !== customer.id)
          fail(400, "Cơ hội không thuộc khách hàng.");
        if (deal.status !== "OPEN") fail(409, "Cơ hội đã đóng.");
      }
      const rid = await insert(c, "customer_activities", {
        customer_id: customer.id,
        deal_id: deal?.id || null,
        user_id: req.user.id,
        activity_type: text(
          req.body.activity_type || "Ghi chú",
          "Loại hoạt động",
          50,
        ),
        content: text(req.body.content, "Nội dung", 20000),
      });
      await c.query(
        "UPDATE customers SET last_contacted_at=UTC_TIMESTAMP() WHERE id=?",
        [customer.id],
      );
      if (deal)
        await c.query(
          "UPDATE deals SET last_activity_at=UTC_TIMESTAMP(),stagnant=0 WHERE id=?",
          [deal.id],
        );
      return rid;
    });
    res.status(201).json({ id: rid });
  }),
);
module.exports = r;
