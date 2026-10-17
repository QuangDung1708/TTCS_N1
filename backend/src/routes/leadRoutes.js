const router = require("express").Router();
const crypto = require("crypto");
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, number, json, date } = require("../core/http");
const { authenticate, rateLimit, hash } = require("../core/auth");
const {
  authorize,
  scope,
  record,
  requireRoles,
  ownerAllowed,
  has,
} = require("../core/access");
const { saveLead, score, assign } = require("../core/leads");
router.use(authenticate, authorize("LEAD"));
async function list(user, q, c = db) {
  const s = await scope(user, "LEAD", "l", false, c, "owner_id");
  let where = s.sql;
  const args = [...s.params];
  for (const k of [
    "status",
    "source_id",
    "temperature",
    "owner_id",
    "campaign_id",
  ])
    if (q[k]) {
      where += ` AND l.${k}=?`;
      args.push(q[k]);
    }
  if (q.from) {
    where += " AND l.created_at>=?";
    args.push(date(q.from));
  }
  if (q.to) {
    where += " AND l.created_at<DATE_ADD(?,INTERVAL 1 DAY)";
    args.push(date(q.to));
  }
  if (q.search) {
    where +=
      " AND (l.full_name LIKE ? OR l.email LIKE ? OR l.company_name LIKE ? OR l.phone LIKE ?)";
    args.push(...Array(4).fill("%" + q.search + "%"));
  }
  const [data] = await c.query(
    `SELECT l.* FROM leads l WHERE ${where} ORDER BY sla_breached DESC,score DESC,id DESC`,
    args,
  );
  return { data, total: data.length, scope: s.name };
}
router.get(
  "/",
  route(async (req, res) => res.json(await list(req.user, req.query))),
);
router.post(
  "/",
  route(async (req, res) =>
    res
      .status(201)
      .json({ id: await transaction((c) => saveLead(c, req.user, req.body)) }),
  ),
);
router.get(
  "/saved-filters",
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT * FROM saved_filters WHERE user_id=? AND entity_type='lead'",
      [req.user.id],
    );
    res.json({ data });
  }),
);
router.post(
  "/saved-filters",
  route(async (req, res) =>
    res.status(201).json({
      id: await insert(db, "saved_filters", {
        user_id: req.user.id,
        entity_type: "lead",
        filter_name: text(req.body.filter_name || req.body.name, "Tên bộ lọc"),
        criteria: JSON.stringify(req.body.criteria || {}),
      }),
    }),
  ),
);
router.delete(
  "/saved-filters/:id",
  route(async (req, res) => {
    await db.query(
      "DELETE FROM saved_filters WHERE id=? AND user_id=? AND entity_type='lead'",
      [id(req.params.id), req.user.id],
    );
    res.json({ success: true });
  }),
);
router.get(
  "/duplicates",
  route(async (req, res) => {
    const leads = (await list(req.user, {})).data;
    const cs = await scope(req.user, "CUSTOMER", "");
    const [customers] = await db.query(
      `SELECT id,name,email,phone FROM customers WHERE ${cs.sql}`,
      cs.params,
    );
    const data = [];
    const {
      normalizedPhone,
      normalized: clean,
    } = require("../core/duplicates");
    for (const lead of leads) {
      const same = (r) =>
        (!!lead.email &&
          lead.email.trim().toLowerCase() ===
            String(r.email || "")
              .trim()
              .toLowerCase()) ||
        (!!lead.phone &&
          normalizedPhone(lead.phone) === normalizedPhone(r.phone)) ||
        (!!lead.company_name &&
          clean(lead.company_name) === clean(r.company_name || r.name));
      const matches = leads.filter((r) => r.id !== lead.id && same(r));
      const existing = customers.filter(same);
      if (matches.length || existing.length)
        data.push({ lead, matches, customers: existing });
    }
    res.json({ data });
  }),
);
router.post(
  "/merge",
  requireRoles("Admin", "Director", "Team Lead", "Marketing"),
  route(async (req, res) => {
    const target = id(req.body.target_id),
      source = id(req.body.source_id);
    if (source === target) fail(400, "Cần hai lead khác nhau.");
    await transaction(async (c) => {
      const rows = [];
      for (const rid of [source, target].sort((a, b) => a - b))
        rows.push(
          await record(
            c,
            req.user,
            "LEAD",
            "leads",
            rid,
            true,
            "owner_id",
            true,
          ),
        );
      if (rows.some((r) => ["CONVERTED", "MERGED"].includes(r.status)))
        fail(409, "Lead đã chuyển đổi/gộp.");
      await c.query("UPDATE lead_activities SET lead_id=? WHERE lead_id=?", [
        target,
        source,
      ]);
      await update(c, "leads", source, {
        status: "MERGED",
        merged_into_id: target,
      });
      await audit(
        c,
        req.user,
        "MERGE",
        "leads",
        target,
        { source_id: source },
        { target_id: target },
        text(req.body.reason || "Gộp lead trùng", "Lý do", 2000),
      );
    });
    res.json({ success: true });
  }),
);
router.get(
  "/scoring-rules",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    const [data] = await db.query("SELECT * FROM lead_scoring_rules");
    const [[r]] = await db.query(
      "SELECT setting_value FROM crm_settings WHERE setting_key='lead_thresholds'",
    );
    res.json({
      data,
      thresholds: json(r?.setting_value, { warm: 30, hot: 70 }),
    });
  }),
);
router.put(
  "/scoring-rules",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    const rules = req.body.rules;
    if (!Array.isArray(rules) || rules.length > 100)
      fail(400, "Danh sách tiêu chí không hợp lệ.");
    const warm = number(req.body.warm ?? 30, "Ngưỡng ấm", -10000, 10000),
      hot = number(req.body.hot ?? 70, "Ngưỡng nóng", -10000, 10000);
    if (hot <= warm) fail(400, "Ngưỡng nóng phải lớn hơn ngưỡng ấm.");
    await transaction(async (c) => {
      const [before] = await c.query("SELECT * FROM lead_scoring_rules");
      await c.query("DELETE FROM lead_scoring_rules");
      for (const r of rules) {
        if (
          !["industry", "company_size", "source_id", "interest_level"].includes(
            r.field_name,
          )
        )
          fail(400, "Tiêu chí không hợp lệ.");
        await insert(c, "lead_scoring_rules", {
          field_name: r.field_name,
          match_value: text(String(r.match_value), "Giá trị"),
          points: number(r.points, "Điểm", -1000, 1000),
        });
      }
      await c.query(
        "INSERT INTO crm_settings (setting_key,setting_value) VALUES ('lead_thresholds',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
        [JSON.stringify({ warm, hot })],
      );
      const [leads] = await c.query(
        "SELECT * FROM leads WHERE status NOT IN ('CONVERTED','MERGED') FOR UPDATE",
      );
      for (const l of leads) await update(c, "leads", l.id, await score(c, l));
      await audit(
        c,
        req.user,
        "SCORING_RULES",
        "lead_scoring_rules",
        null,
        before,
        rules,
      );
    });
    res.json({ success: true });
  }),
);
router.get(
  "/assignment-rules",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT * FROM lead_assignment_rules ORDER BY priority,id",
    );
    res.json({ data });
  }),
);
router.put(
  "/assignment-rules",
  requireRoles("Admin", "Director"),
  route(async (req, res) => {
    if (!Array.isArray(req.body.rules) || req.body.rules.length > 100)
      fail(400, "Quy tắc không hợp lệ.");
    await transaction(async (c) => {
      const [old] = await c.query("SELECT * FROM lead_assignment_rules");
      await c.query("DELETE FROM lead_assignment_rules");
      for (const r of req.body.rules) {
        const gid = id(r.group_id);
        const [[g]] = await c.query("SELECT id FROM `groups` WHERE id=?", [
          gid,
        ]);
        if (!g) fail(400, "Nhóm không tồn tại.");
        await insert(c, "lead_assignment_rules", {
          name: text(r.name, "Tên quy tắc", 100),
          priority: number(r.priority, "Thứ tự", 0, 10000),
          group_id: gid,
          region: r.region || null,
          industry: r.industry || null,
          sla_minutes: number(r.sla_minutes || 60, "SLA phút", 1, 43200),
          is_active: r.is_active !== false,
        });
      }
      await audit(
        c,
        req.user,
        "ASSIGNMENT_RULES",
        "lead_assignment_rules",
        null,
        old,
        req.body.rules,
      );
    });
    res.json({ success: true });
  }),
);
router.get(
  "/forms",
  requireRoles("Admin", "Director", "Marketing"),
  route(async (req, res) => {
    const [data] = await db.query("SELECT * FROM lead_forms");
    res.json({ data });
  }),
);
router.post(
  "/forms",
  requireRoles("Admin", "Director", "Marketing"),
  route(async (req, res) => {
    const source = id(req.body.source_id);
    const [[s]] = await db.query(
      "SELECT id FROM sales_categories WHERE id=? AND type='lead_source'",
      [source],
    );
    if (!s) fail(400, "Nguồn không tồn tại.");
    if (req.body.campaign_id) {
      const [[r]] = await db.query("SELECT id FROM campaigns WHERE id=?", [
        id(req.body.campaign_id),
      ]);
      if (!r) fail(400, "Chiến dịch không tồn tại.");
    }
    const key = crypto.randomBytes(24).toString("hex");
    const rid = await insert(db, "lead_forms", {
      public_key: key,
      name: text(req.body.name, "Tên biểu mẫu", 100),
      source_id: source,
      campaign_id: req.body.campaign_id || null,
      created_by: req.user.id,
    });
    const base = process.env.PUBLIC_API_URL || "http://localhost:5001";
    res.status(201).json({
      id: rid,
      public_key: key,
      embed: `<iframe src="${base}/api/public/lead-forms/${key}" title="Liên hệ" width="100%" height="550"></iframe>`,
    });
  }),
);
router.get(
  "/:id",
  route(async (req, res) => {
    const lead = await record(
      db,
      req.user,
      "LEAD",
      "leads",
      req.params.id,
      false,
      "owner_id",
    );
    const [activities] = await db.query(
      "SELECT * FROM lead_activities WHERE lead_id=? ORDER BY created_at,id",
      [lead.id],
    );
    res.json({ data: { ...lead, activities } });
  }),
);
router.put(
  "/:id",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveLead(c, req.user, req.body, id(req.params.id)),
      ),
    }),
  ),
);
router.post(
  "/:id/assign",
  requireRoles("Admin", "Director", "Team Lead", "Marketing"),
  route(async (req, res) => {
    await transaction(async (c) => {
      const l = await record(
        c,
        req.user,
        "LEAD",
        "leads",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (["CONVERTED", "MERGED"].includes(l.status))
        fail(409, "Lead không thể phân bổ.");
      await ownerAllowed(c, req.user, "LEAD", req.body.owner_id);
      await assign(
        c,
        l,
        req.body.owner_id,
        req.user,
        text(req.body.reason || "Phân bổ thủ công", "Lý do", 2000),
        number(req.body.sla_minutes || 60, "SLA", 1, 43200),
      );
    });
    res.json({ success: true });
  }),
);
for (const action of ["accept", "reject"])
  router.post(
    "/:id/" + action,
    route(async (req, res) => {
      await transaction(async (c) => {
        const l = await record(
          c,
          req.user,
          "LEAD",
          "leads",
          req.params.id,
          true,
          "owner_id",
          true,
        );
        if (l.owner_id !== req.user.id || l.status !== "ASSIGNED")
          fail(409, "Chỉ người được phân mới được phản hồi lead này.");
        const reason =
          action === "reject"
            ? text(req.body.reason, "Lý do từ chối", 2000)
            : "Đã nhận lead";
        await update(
          c,
          "leads",
          l.id,
          action === "accept"
            ? { status: "CARING" }
            : {
                status: "QUEUED",
                owner_id: null,
                assigned_at: null,
                sla_due_at: null,
              },
        );
        await insert(c, "lead_activities", {
          lead_id: l.id,
          user_id: req.user.id,
          activity_type: action,
          content: reason,
        });
        await audit(
          c,
          req.user,
          action.toUpperCase(),
          "leads",
          l.id,
          { status: l.status },
          { status: action === "accept" ? "CARING" : "QUEUED" },
          reason,
        );
      });
      res.json({ success: true });
    }),
  );
router.post(
  "/:id/activities",
  route(async (req, res) => {
    const rid = await transaction(async (c) => {
      const l = await record(
        c,
        req.user,
        "LEAD",
        "leads",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (["CONVERTED", "MERGED"].includes(l.status))
        fail(409, "Lead không được sửa.");
      const rid = await insert(c, "lead_activities", {
        lead_id: l.id,
        user_id: req.user.id,
        activity_type: req.body.activity_type || "Liên hệ",
        content: text(req.body.content, "Nội dung", 10000),
      });
      await c.query(
        "UPDATE leads SET contacted_at=UTC_TIMESTAMP(),sla_breached=0 WHERE id=?",
        [l.id],
      );
      return rid;
    });
    res.status(201).json({ id: rid });
  }),
);
router.post(
  "/:id/convert",
  route(async (req, res) => {
    const result = await transaction(async (c) => {
      const l = await record(
        c,
        req.user,
        "LEAD",
        "leads",
        req.params.id,
        true,
        "owner_id",
        true,
      );
      if (["CONVERTED", "MERGED"].includes(l.status))
        fail(409, "Lead đã chuyển đổi/gộp.");
      const { saveCustomer, saveContact } = require("../core/customers");
      const { saveDeal } = require("../core/deals");
      let customerId;
      if (req.body.customer_id) {
        customerId = (
          await record(
            c,
            req.user,
            "CUSTOMER",
            "customers",
            req.body.customer_id,
            true,
            "created_by",
            true,
          )
        ).id;
      } else
        customerId = await saveCustomer(c, req.user, {
          ...(req.body.customer || {}),
          company_name: l.company_name,
          email: l.email,
          phone: l.phone,
          industry: l.industry,
          company_size: l.company_size,
          region: l.region,
          owner_id: l.owner_id || req.user.id,
        });
      const contactId = await saveContact(c, req.user, {
        customer_id: customerId,
        full_name: l.full_name,
        email: l.email,
        phone: l.phone,
      });
      const dealId = await saveDeal(c, req.user, {
        ...(req.body.deal || {}),
        title: req.body.deal?.title || l.company_name,
        customer_id: customerId,
        contact_id: contactId,
        owner_id: l.owner_id || req.user.id,
        source_id: l.source_id,
        campaign_id: l.campaign_id,
      });
      await c.query(
        "INSERT INTO customer_activities (customer_id,lead_id,user_id,activity_type,content,created_at) SELECT ?,lead_id,user_id,activity_type,content,created_at FROM lead_activities WHERE lead_id=?",
        [customerId, l.id],
      );
      await c.query(
        "UPDATE leads SET status='CONVERTED',converted_at=UTC_TIMESTAMP(),customer_id=?,contact_id=?,deal_id=? WHERE id=?",
        [customerId, contactId, dealId, l.id],
      );
      await audit(
        c,
        req.user,
        "CONVERT",
        "leads",
        l.id,
        { status: l.status },
        { customer_id: customerId, contact_id: contactId, deal_id: dealId },
      );
      return {
        customer_id: customerId,
        contact_id: contactId,
        deal_id: dealId,
      };
    });
    res.status(201).json(result);
  }),
);
module.exports = router;
module.exports.list = list;
const publicRouter = require("express").Router();
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Public metadata lets the Ant Design form use the same signed anti-spam flow.
publicRouter.get(
  "/lead-forms/:key/meta",
  route(async (req, res) => {
    await rateLimit("public-form:" + req.ip, 60, 15);
    const [[f]] = await db.query(
      "SELECT name,public_key FROM lead_forms WHERE public_key=? AND is_active=1",
      [req.params.key],
    );
    if (!f) fail(404, "Biểu mẫu không tồn tại.");
    const stamp = String(Date.now());
    const signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(f.public_key + stamp)
      .digest("hex");
    res
      .set("Cache-Control", "no-store")
      .json({ name: f.name, stamp, signature });
  }),
);
publicRouter.get(
  "/lead-forms/:key",
  route(async (req, res) => {
    const [[f]] = await db.query(
      "SELECT * FROM lead_forms WHERE public_key=? AND is_active=1",
      [req.params.key],
    );
    if (!f) fail(404, "Biểu mẫu không tồn tại.");
    const stamp = String(Date.now());
    const signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(f.public_key + stamp)
      .digest("hex");
    res.type("html").send(
      `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(f.name)}</title><form method="post"><h2>${escape(f.name)}</h2>${[
        ["full_name", "Họ tên"],
        ["email", "Email"],
        ["phone", "Số điện thoại"],
        ["company_name", "Công ty"],
        ["interest", "Nhu cầu quan tâm"],
      ]
        .map(
          ([k, l]) =>
            `<p><label>${l}<br><input name="${k}" maxlength="255" required></label></p>`,
        )
        .join(
          "",
        )}<input name="website_confirm" tabindex="-1" autocomplete="off" style="display:none"><input type="hidden" name="stamp" value="${stamp}"><input type="hidden" name="signature" value="${signature}"><button>Gửi thông tin</button></form></html>`,
    );
  }),
);
publicRouter.post(
  "/lead-forms/:key",
  route(async (req, res) => {
    await rateLimit("public-lead:" + req.ip, 10, 15);
    const [[f]] = await db.query(
      "SELECT * FROM lead_forms WHERE public_key=? AND is_active=1",
      [req.params.key],
    );
    if (!f) fail(404, "Biểu mẫu không tồn tại.");
    const b = req.body,
      stamp = Number(b.stamp),
      sig = crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(f.public_key + String(b.stamp))
        .digest("hex");
    if (
      b.website_confirm ||
      !Number.isFinite(stamp) ||
      Date.now() - stamp < 2000 ||
      Date.now() - stamp > 3600000 ||
      typeof b.signature !== "string" ||
      b.signature.length !== 64 ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(b.signature))
    )
      fail(400, "Biểu mẫu không hợp lệ hoặc đã hết hạn.");
    const rid = await transaction((c) =>
      saveLead(c, null, {
        full_name: b.full_name,
        email: b.email,
        phone: b.phone,
        company_name: b.company_name,
        interest: b.interest,
        source_id: f.source_id,
        campaign_id: f.campaign_id,
      }),
    );
    res
      .status(201)
      .json({ success: true, id: rid, message: "Đã nhận thông tin." });
  }),
);
module.exports.publicRouter = publicRouter;
