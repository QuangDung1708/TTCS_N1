const r = require("express").Router();
const { db, transaction } = require("../core/store");
const { route, id, fail } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, record } = require("../core/access");
const { saveContact, transferContact } = require("../core/customers");
r.use(authenticate, authorize("CUSTOMER"));
r.get(
  "/customer/:customerId",
  route(async (req, res) => {
    await record(db, req.user, "CUSTOMER", "customers", req.params.customerId);
    const [data] = await db.query(
      "SELECT * FROM customer_contacts WHERE customer_id=? ORDER BY is_primary DESC,id",
      [id(req.params.customerId)],
    );
    res.json(data);
  }),
);
r.post(
  "/customer/:customerId",
  route(async (req, res) =>
    res.status(201).json({
      contactId: await transaction((c) =>
        saveContact(c, req.user, {
          ...req.body,
          customer_id: id(req.params.customerId),
        }),
      ),
    }),
  ),
);
r.put(
  "/:id",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveContact(c, req.user, req.body, id(req.params.id)),
      ),
    }),
  ),
);
r.put(
  "/:id/transfer",
  route(async (req, res) => {
    await transaction((c) =>
      transferContact(
        c,
        req.user,
        req.params.id,
        req.body.targetCustomerId || req.body.customer_id,
        req.body.transferReason || req.body.reason,
      ),
    );
    res.json({ success: true });
  }),
);
r.delete(
  "/:id",
  route(async (req, res) => {
    await transaction(async (c) => {
      const [[row]] = await c.query(
        "SELECT * FROM customer_contacts WHERE id=?",
        [id(req.params.id)],
      );
      if (!row) fail(404, "Không tìm thấy liên hệ.");
      await record(
        c,
        req.user,
        "CUSTOMER",
        "customers",
        row.customer_id,
        true,
        "created_by",
        true,
      );
      const [[used]] = await c.query(
        "SELECT COUNT(*) n FROM deals WHERE contact_id=?",
        [row.id],
      );
      if (used.n) fail(409, "Liên hệ đang được sử dụng.");
      await c.query("DELETE FROM customer_contacts WHERE id=?", [row.id]);
    });
    res.json({ success: true });
  }),
);
module.exports = r;
