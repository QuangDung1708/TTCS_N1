const router = require("express").Router();
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, date, number, json } = require("../core/http");
const { authenticate } = require("../core/auth");
const {
  authorize,
  requireRoles,
  ownerAllowed,
  has,
  permission,
} = require("../core/access");
router.use(authenticate);
const readNotifications = (req, res, next) => {
  try {
    permission(req.user, "AUTO");
    next();
  } catch (e) {
    next(e);
  }
};
router.get(
  "/notifications",
  readNotifications,
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT * FROM crm_notifications WHERE user_id=? ORDER BY id DESC LIMIT 100",
      [req.user.id],
    );
    res.json({ data });
  }),
);
router.put(
  "/notifications/:id/read",
  readNotifications,
  route(async (req, res) => {
    await db.query(
      "UPDATE crm_notifications SET read_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?",
      [id(req.params.id), req.user.id],
    );
    res.json({ success: true });
  }),
);
router.get(
  "/settings",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    const [data] = await db.query("SELECT * FROM crm_settings");
    res.json({ data });
  }),
);
router.put(
  "/settings",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    const days = number(req.body.care_days, "Số ngày chăm sóc", 1, 3650);
    await db.query(
      "INSERT INTO crm_settings (setting_key,setting_value) VALUES ('care_days',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      [String(days)],
    );
    res.json({ success: true });
  }),
);
router.post(
  "/targets",
  authorize("KPI"),
  route(async (req, res) => {
    const rid = await transaction(async (c) => {
      const owner = await ownerAllowed(c, req.user, "KPI", req.body.user_id);
      const start = date(req.body.start_date),
        end = date(req.body.end_date);
      if (end < start) fail(400, "Kỳ chỉ tiêu không hợp lệ.");
      const data = {
        user_id: owner.id,
        start_date: start,
        end_date: end,
        amount: number(req.body.amount, "Chỉ tiêu"),
      };
      const [[overlap]] = await c.query(
        "SELECT id FROM sales_targets WHERE user_id=? AND start_date<=? AND end_date>=? FOR UPDATE",
        [owner.id, end, start],
      );
      if (overlap) fail(409, "Kỳ chỉ tiêu bị trùng.");
      const rid = await insert(c, "sales_targets", data);
      await audit(
        c,
        req.user,
        "TARGET_CHANGE",
        "sales_targets",
        rid,
        null,
        data,
      );
      return rid;
    });
    res.status(201).json({ id: rid });
  }),
);
const auditRouter = require("express").Router();
auditRouter.use(authenticate, authorize("USER_LOG"));
auditRouter.get(
  "/",
  route(async (req, res) => {
    let where = "1=1";
    const args = [];
    for (const k of ["user_id", "entity_type", "action_type"])
      if (req.query[k]) {
        where += ` AND ${k}=?`;
        args.push(req.query[k]);
      }
    if (req.query.from) {
      where += " AND created_at>=?";
      args.push(date(req.query.from));
    }
    if (req.query.to) {
      where += " AND created_at<DATE_ADD(?,INTERVAL 1 DAY)";
      args.push(date(req.query.to));
    }
    const [data] = await db.query(
      `SELECT * FROM audit_logs WHERE ${where} ORDER BY id DESC LIMIT 500`,
      args,
    );
    if (!has(req.user, "Admin", "Director")) {
      for (const row of data)
        for (const field of ["before_value", "after_value"]) {
          if (row[field]) {
            let value;
            try {
              value = JSON.parse(row[field]);
            } catch {
              value =
                row.entity_type === "products"
                  ? "[Đã ẩn dữ liệu giá vốn]"
                  : row[field];
            }
            const redact = (v) => {
              if (Array.isArray(v)) return v.map(redact);
              if (v && typeof v === "object")
                return Object.fromEntries(
                  Object.entries(v)
                    .filter(
                      ([k]) =>
                        !["cost_price", "margin", "profit_margin"].includes(k),
                    )
                    .map(([k, v]) => [k, redact(v)]),
                );
              return v;
            };
            row[field] = JSON.stringify(redact(value));
          }
        }
    }
    res.json({ data });
  }),
);
module.exports = { router, auditRouter };
