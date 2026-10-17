// Sprint 1 data-scoping support for draft quotes. Approval/contract workflows belong to Sprint 7.
const r = require("express").Router();
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, number } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, scope, record, ownerAllowed } = require("../core/access");
r.use(authenticate, authorize("QUOTE"));
async function list(user, q) {
  const s = await scope(user, "QUOTE", "q", false, db, "owner_id");
  let sql = s.sql;
  const args = [...s.params];
  if (q.search) {
    sql += " AND q.title LIKE ?";
    args.push("%" + q.search + "%");
  }
  const [data] = await db.query(
    `SELECT q.* FROM quotes q WHERE ${sql} ORDER BY q.id DESC`,
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
    const data = (await list(req.user, req.query)).map((q) => ({
      ...q,
      title: /^[=+@\-\t\r]/.test(q.title) ? "'" + q.title : q.title,
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(data),
      "Quotes",
    );
    res
      .attachment("quotes.xlsx")
      .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
  }),
);
r.get(
  "/:id",
  route(async (req, res) => {
    const q = await record(
      db,
      req.user,
      "QUOTE",
      "quotes",
      req.params.id,
      false,
      "owner_id",
    );
    const [items] = await db.query(
      "SELECT * FROM quote_items WHERE quote_id=?",
      [q.id],
    );
    res.json({ data: { ...q, items } });
  }),
);
r.post(
  "/",
  route(async (req, res) => {
    const rid = await transaction(async (c) => {
      const deal = await record(
        c,
        req.user,
        "DEAL",
        "deals",
        req.body.deal_id,
        false,
        "owner_id",
        true,
      );
      const owner = await ownerAllowed(
        c,
        req.user,
        "QUOTE",
        req.body.owner_id || deal.owner_id,
      );
      const discount = number(
        req.body.discount_percent ?? 0,
        "Chiết khấu",
        0,
        100,
      );
      const title = text(
        req.body.title || "Báo giá: " + deal.title,
        "Tên báo giá",
      );
      const rid = await insert(c, "quotes", {
        title,
        deal_id: deal.id,
        customer_id: deal.customer_id,
        owner_id: owner.id,
        group_id: owner.group_id,
        gross_amount: deal.amount,
        discount_percent: discount,
        amount: deal.amount,
        status: "DRAFT",
      });
      await c.query(
        "UPDATE quotes SET amount=ROUND(gross_amount*(100-discount_percent)/100,2) WHERE id=?",
        [rid],
      );
      await c.query(
        "INSERT INTO quote_items (quote_id,product_id,product_name,quantity,unit_price,periods,line_total) SELECT ?,i.product_id,p.name,i.quantity,i.unit_price,i.periods,i.line_total FROM deal_items i JOIN products p ON p.id=i.product_id WHERE i.deal_id=?",
        [rid, deal.id],
      );
      await audit(c, req.user, "CREATE", "quotes", rid, null, {
        deal_id: deal.id,
        owner_id: owner.id,
        discount_percent: discount,
      });
      return rid;
    });
    res.status(201).json({ id: rid });
  }),
);
r.put(
  "/:id",
  route(async (req, res) => {
    await transaction(async (c) => {
      const old = await record(
        c,
        req.user,
        "QUOTE",
        "quotes",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (old.status !== "DRAFT")
        fail(409, "Báo giá không còn ở trạng thái nháp.");
      const owner = await ownerAllowed(
        c,
        req.user,
        "QUOTE",
        req.body.owner_id || old.owner_id,
      );
      const data = {
        title: text(req.body.title || old.title, "Tên báo giá"),
        discount_percent: number(
          req.body.discount_percent ?? old.discount_percent,
          "Chiết khấu",
          0,
          100,
        ),
        owner_id: owner.id,
        group_id: owner.group_id,
      };
      await update(c, "quotes", old.id, data);
      await c.query(
        "UPDATE quotes SET amount=ROUND(gross_amount*(100-discount_percent)/100,2) WHERE id=?",
        [old.id],
      );
      await audit(
        c,
        req.user,
        "DISCOUNT_OR_OWNER_CHANGE",
        "quotes",
        old.id,
        old,
        data,
      );
    });
    res.json({ success: true });
  }),
);
r.delete(
  "/:id",
  route(async (req, res) => {
    await transaction(async (c) => {
      const old = await record(
        c,
        req.user,
        "QUOTE",
        "quotes",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (old.status !== "DRAFT")
        fail(409, "Không thể xóa báo giá đã phát hành.");
      await c.query("DELETE FROM quote_items WHERE quote_id=?", [old.id]);
      await c.query("DELETE FROM quotes WHERE id=?", [old.id]);
      await audit(c, req.user, "DELETE", "quotes", old.id, old, null);
    });
    res.json({ success: true });
  }),
);
module.exports = r;
