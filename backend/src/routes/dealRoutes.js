const router = require("express").Router();
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, number, date, json } = require("../core/http");
const { authenticate } = require("../core/auth");
const {
  authorize,
  scope,
  record,
  ownerAllowed,
  requireRoles,
} = require("../core/access");
const { saveDeal, transition, close } = require("../core/deals");
router.use(authenticate, authorize("DEAL"));
async function list(user, q, c = db) {
  const s = await scope(user, "DEAL", "d", false, c, "owner_id");
  let where = s.sql;
  const args = [...s.params];
  for (const k of ["owner_id", "group_id", "status", "stage_id", "customer_id"])
    if (q[k]) {
      where += ` AND d.${k}=?`;
      args.push(q[k]);
    }
  if (q.from) {
    where += " AND d.expected_close_date>=?";
    args.push(date(q.from));
  }
  if (q.to) {
    where += " AND d.expected_close_date<=?";
    args.push(date(q.to));
  }
  if (q.search) {
    where += " AND d.title LIKE ?";
    args.push("%" + q.search + "%");
  }
  if (q.custom_fields) {
    for (const [key, value] of Object.entries(json(q.custom_fields))) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key))
        fail(400, "Trường lọc không hợp lệ.");
      where += " AND JSON_UNQUOTE(JSON_EXTRACT(d.custom_fields,?))=?";
      args.push("$." + key, String(value));
    }
  }
  const [data] = await c.query(
    `SELECT d.*,c.company_name,c.name customer_name,u.full_name owner_name FROM deals d JOIN customers c ON c.id=d.customer_id LEFT JOIN users u ON u.id=d.owner_id WHERE ${where} ORDER BY d.id DESC`,
    args,
  );
  return { data, total: data.length, scope: s.name };
}
router.get(
  "/",
  route(async (req, res) => {
    const result = await list(req.user, req.query);
    const [stages] = await db.query(
      "SELECT * FROM pipeline_stages ORDER BY sort_order,id",
    );
    const [reasons] = await db.query("SELECT * FROM deal_reasons");
    const [competitors] = await db.query("SELECT * FROM competitors");
    res.json({ ...result, deals: result.data, stages, reasons, competitors });
  }),
);
router.get(
  "/export",
  route(async (req, res) => {
    const { workbook } = require("../core/workbook");
    const visible = (await list(req.user, req.query)).data;
    const details = new Map();
    if (visible.length) {
      const [rows] = await db.query(
        `SELECT d.id,cc.full_name contact_name,g.name group_name,
          src.name source_name,cam.name campaign_name,ps.name stage_name,
          wr.name win_reason_name,lr.name loss_reason_name,co.name competitor_name
         FROM deals d
         LEFT JOIN customer_contacts cc ON cc.id=d.contact_id
         LEFT JOIN \`groups\` g ON g.id=d.group_id
         LEFT JOIN sales_categories src ON src.id=d.source_id
         LEFT JOIN campaigns cam ON cam.id=d.campaign_id
         LEFT JOIN pipeline_stages ps ON ps.id=d.stage_id
         LEFT JOIN deal_reasons wr ON wr.id=d.win_reason_id
         LEFT JOIN deal_reasons lr ON lr.id=d.loss_reason_id
         LEFT JOIN competitors co ON co.id=d.competitor_id
         WHERE d.id IN (?)`,
        [visible.map((row) => row.id)],
      );
      for (const row of rows) details.set(row.id, row);
    }
    const keys = [
      "opportunity_title",
      "company_name",
      "contact_name",
      "owner_name",
      "group_name",
      "source_name",
      "campaign_name",
      "stage_name",
      "status",
      "expected_amount",
      "probability",
      "probability_note",
      "expected_close_date",
      "actual_amount",
      "signed_date",
      "win_reason_name",
      "loss_reason_name",
      "competitor_name",
      "loss_note",
      "created_at",
    ];
    const data = visible.map((row) => {
      const custom = json(row.custom_fields, {});
      const out = {
        ...row,
        ...details.get(row.id),
        opportunity_title: row.title,
        expected_amount: row.amount,
        status:
          { OPEN: "Đang mở", WON: "Chốt thành công", LOST: "Chưa thành công" }[
            row.status
          ] || row.status,
      };
      for (const [key, value] of Object.entries(custom)) {
        const column = Object.hasOwn(out, key) ? "Tùy chỉnh: " + key : key;
        if (!keys.includes(column)) keys.push(column);
        out[column] = value;
      }
      return out;
    });
    res
      .attachment("co-hoi.xlsx")
      .send(await workbook("deal", keys, data, false));
  }),
);
router.get(
  "/kanban",
  route(async (req, res) => {
    const result = await list(req.user, req.query);
    const [stages] = await db.query(
      "SELECT * FROM pipeline_stages ORDER BY sort_order,id",
    );
    res.json({
      data: stages.map((s) => {
        const deals = result.data.filter(
          (d) => d.stage_id === s.id && d.status === "OPEN",
        );
        return {
          ...s,
          count: deals.length,
          total: deals.reduce((sum, d) => sum + Number(d.amount), 0),
          deals,
        };
      }),
    });
  }),
);
router.get(
  "/flagged",
  requireRoles("Admin", "Director", "Team Lead"),
  route(async (req, res) => {
    const result = await list(req.user, req.query);
    res.json({
      data: result.data.filter(
        (d) => d.status === "OPEN" && (d.stagnant || d.overdue),
      ),
    });
  }),
);
router.get(
  "/forecast",
  requireRoles("Admin", "Director", "Team Lead"),
  route(async (req, res) => {
    const s = await scope(req.user, "DEAL", "d", false, db, "owner_id");
    const now = new Date();
    const y = now.getUTCFullYear(),
      m = now.getUTCMonth();
    const iso = (d) => d.toISOString().slice(0, 10);
    const periods = {
      this_month: [
        new Date(Date.UTC(y, m, 1)),
        new Date(Date.UTC(y, m + 1, 1)),
      ],
      next_month: [
        new Date(Date.UTC(y, m + 1, 1)),
        new Date(Date.UTC(y, m + 2, 1)),
      ],
      this_quarter: [
        new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)),
        new Date(Date.UTC(y, Math.floor(m / 3) * 3 + 3, 1)),
      ],
    };
    const result = {};
    for (const [name, [from, to]] of Object.entries(periods)) {
      const params = [iso(from), iso(to), iso(from), iso(to), ...s.params];
      let filter = "";
      if (req.query.owner_id) {
        filter += " AND d.owner_id=?";
        params.push(id(req.query.owner_id));
      }
      if (req.query.group_id) {
        filter += " AND d.group_id=?";
        params.push(id(req.query.group_id));
      }
      const [rows] = await db.query(
        `SELECT d.owner_id,d.group_id,SUM(CASE WHEN d.status='OPEN' AND d.expected_close_date>=? AND d.expected_close_date<? THEN d.amount*s.win_probability/100 ELSE 0 END) forecast,SUM(CASE WHEN d.status='WON' AND d.signed_date>=? AND d.signed_date<? THEN d.actual_amount ELSE 0 END) actual FROM deals d LEFT JOIN pipeline_stages s ON s.id=d.stage_id WHERE (${s.sql}) ${filter} GROUP BY d.owner_id,d.group_id`,
        params,
      );
      const us = await scope(req.user, "KPI", "u", false, db, "id");
      const targetParams = [iso(from), iso(to), ...us.params];
      let tf = "";
      if (req.query.owner_id) {
        tf += " AND u.id=?";
        targetParams.push(id(req.query.owner_id));
      }
      if (req.query.group_id) {
        tf += " AND u.group_id=?";
        targetParams.push(id(req.query.group_id));
      }
      const [targets] = await db.query(
        `SELECT u.id owner_id,u.group_id,SUM(t.amount) target FROM sales_targets t JOIN users u ON u.id=t.user_id WHERE t.start_date>=? AND t.end_date<? AND (${us.sql}) ${tf} GROUP BY u.id,u.group_id`,
        targetParams,
      );
      const map = new Map(rows.map((r) => [r.owner_id, { ...r, target: 0 }]));
      for (const t of targets)
        map.set(t.owner_id, {
          ...(map.get(t.owner_id) || {
            owner_id: t.owner_id,
            group_id: t.group_id,
            forecast: 0,
            actual: 0,
          }),
          target: Number(t.target),
        });
      const staff = [...map.values()];
      const groups = new Map();
      for (const r of staff) {
        const g = groups.get(r.group_id) || {
          group_id: r.group_id,
          forecast: 0,
          actual: 0,
          target: 0,
        };
        for (const k of ["forecast", "actual", "target"]) g[k] += Number(r[k]);
        groups.set(r.group_id, g);
      }
      result[name] = {
        from: iso(from),
        to_exclusive: iso(to),
        users: staff,
        groups: [...groups.values()],
        forecast: staff.reduce((n, r) => n + Number(r.forecast), 0),
        actual: staff.reduce((n, r) => n + Number(r.actual), 0),
        target: staff.reduce((n, r) => n + Number(r.target), 0),
      };
    }
    res.json({ data: result });
  }),
);
router.post(
  "/reassign",
  requireRoles("Admin", "Director", "Team Lead"),
  route(async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500)
      fail(400, "Danh sách cơ hội không hợp lệ.");
    const reason = text(req.body.reason, "Lý do", 2000);
    await transaction(async (c) => {
      const owner = await ownerAllowed(c, req.user, "DEAL", req.body.owner_id);
      for (const rid of [...new Set(ids.map(id))].sort((a, b) => a - b)) {
        const d = await record(
          c,
          req.user,
          "DEAL",
          "deals",
          rid,
          true,
          "owner_id",
          true,
        );
        if (d.status !== "OPEN")
          fail(409, "Cơ hội đã đóng; cần mở lại trước khi đổi chủ sở hữu.");
        await update(c, "deals", d.id, {
          owner_id: owner.id,
          group_id: owner.group_id,
        });
        await audit(
          c,
          req.user,
          "OWNER_CHANGE",
          "deals",
          d.id,
          { owner_id: d.owner_id },
          { owner_id: owner.id },
          reason,
        );
      }
    });
    res.json({ success: true });
  }),
);
router.post(
  "/",
  route(async (req, res) =>
    res
      .status(201)
      .json({ id: await transaction((c) => saveDeal(c, req.user, req.body)) }),
  ),
);
router.get(
  "/:id",
  route(async (req, res) => {
    const deal = await record(
      db,
      req.user,
      "DEAL",
      "deals",
      req.params.id,
      false,
      "owner_id",
    );
    const [items] = await db.query(
      "SELECT i.*,p.name product_name FROM deal_items i JOIN products p ON p.id=i.product_id WHERE i.deal_id=?",
      [deal.id],
    );
    res.json({
      data: { ...deal, items, custom_fields_data: json(deal.custom_fields) },
    });
  }),
);
router.put(
  "/:id",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveDeal(c, req.user, req.body, id(req.params.id)),
      ),
    }),
  ),
);
router.put(
  "/:id/stage",
  route(async (req, res) => {
    await transaction((c) =>
      ["WON", "LOST"].includes(String(req.body.stage).toUpperCase())
        ? close(c, req.user, req.params.id, req.body)
        : transition(
            c,
            req.user,
            req.params.id,
            req.body.stage_id || req.body.stage,
            req.body,
          ),
    );
    res.json({ success: true });
  }),
);
router.post(
  "/:id/close",
  route(async (req, res) => {
    await transaction((c) => close(c, req.user, req.params.id, req.body));
    res.json({ success: true });
  }),
);
router.post(
  "/:id/reopen",
  requireRoles("Admin", "Director", "Team Lead"),
  route(async (req, res) => {
    await transaction(async (c) => {
      const d = await record(
        c,
        req.user,
        "DEAL",
        "deals",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (d.status === "OPEN") fail(409, "Cơ hội đang mở.");
      const reason = text(req.body.reason, "Lý do", 2000);
      await update(c, "deals", d.id, {
        status: "OPEN",
        actual_amount: null,
        signed_date: null,
        win_reason_id: null,
        loss_reason_id: null,
        competitor_id: null,
        loss_note: null,
      });
      await audit(
        c,
        req.user,
        "REOPEN",
        "deals",
        d.id,
        { status: d.status },
        { status: "OPEN" },
        reason,
      );
    });
    res.json({ success: true });
  }),
);
router.put(
  "/:id/items",
  route(async (req, res) => {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length > 200)
      fail(400, "Dòng sản phẩm không hợp lệ.");
    await transaction(async (c) => {
      const d = await record(
        c,
        req.user,
        "DEAL",
        "deals",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (d.status !== "OPEN") fail(409, "Cơ hội đã đóng.");
      const [old] = await c.query("SELECT * FROM deal_items WHERE deal_id=?", [
        d.id,
      ]);
      await c.query("DELETE FROM deal_items WHERE deal_id=?", [d.id]);
      for (const item of items) {
        const [[p]] = await c.query("SELECT * FROM products WHERE id=?", [
          id(item.product_id),
        ]);
        if (!p || String(p.status).toUpperCase() !== "ACTIVE")
          fail(400, "Sản phẩm không hoạt động.");
        const qty = number(item.quantity, "Số lượng", 0.001, 1000000),
          price = number(item.unit_price ?? p.list_price, "Đơn giá", 0, 1e12);
        const periods =
            p.type === "SUBSCRIPTION"
              ? number(item.periods, "Số kỳ", 1, 1200)
              : 1,
          months =
            p.type === "SUBSCRIPTION"
              ? number(item.period_months || 1, "Số tháng/kỳ", 1, 120)
              : 1;
        if (!Number.isInteger(periods) || !Number.isInteger(months))
          fail(400, "Số kỳ phải là số nguyên.");
        if (qty * price * periods > 1e12)
          fail(400, "Giá trị dòng sản phẩm vượt giới hạn cho phép.");
        await c.query(
          "INSERT INTO deal_items (deal_id,product_id,quantity,unit_price,periods,period_months,line_total) VALUES (?,?,?,?,?,?,ROUND(CAST(? AS DECIMAL(18,3))*CAST(? AS DECIMAL(18,2))*?,2))",
          [d.id, p.id, qty, price, periods, months, qty, price, periods],
        );
      }
      const [[total]] = await c.query(
        "SELECT COALESCE(SUM(line_total),0) amount FROM deal_items WHERE deal_id=?",
        [d.id],
      );
      if (Number(total.amount) > 1e12)
        fail(400, "Tổng giá trị cơ hội vượt giới hạn cho phép.");
      await c.query(
        "UPDATE deals SET amount=(SELECT COALESCE(SUM(line_total),0) FROM deal_items WHERE deal_id=?),annual_value=(SELECT COALESCE(SUM(CASE WHEN p.type='SUBSCRIPTION' THEN i.quantity*i.unit_price*12/i.period_months ELSE i.line_total END),0) FROM deal_items i JOIN products p ON p.id=i.product_id WHERE i.deal_id=?) WHERE id=?",
        [d.id, d.id, d.id],
      );
      await audit(c, req.user, "PRICE_CHANGE", "deals", d.id, old, items);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/:id/activities",
  route(async (req, res) => {
    const rid = await transaction(async (c) => {
      const d = await record(
        c,
        req.user,
        "DEAL",
        "deals",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (d.status !== "OPEN") fail(409, "Cơ hội đã đóng.");
      const type = text(req.body.activity_type, "Loại hoạt động", 50);
      const rid = await insert(c, "customer_activities", {
        customer_id: d.customer_id,
        deal_id: d.id,
        user_id: req.user.id,
        activity_type: type,
        content: text(req.body.content, "Nội dung", 10000),
      });
      await c.query(
        "UPDATE deals SET last_activity_at=UTC_TIMESTAMP(),stagnant=0 WHERE id=?",
        [d.id],
      );
      return rid;
    });
    res.status(201).json({ id: rid });
  }),
);
module.exports = router;
module.exports.list = list;
