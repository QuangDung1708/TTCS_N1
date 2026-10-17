const router = require("express").Router();
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, json, number } = require("../core/http");
const { authenticate } = require("../core/auth");
const {
  authorize,
  scope,
  record,
  requireRoles,
  ownerAllowed,
  permission,
} = require("../core/access");
const {
  saveCustomer,
  saveContact,
  transferContact,
} = require("../core/customers");
router.use(authenticate, authorize("CUSTOMER"));
async function list(user, q, c = db) {
  const s = await scope(user, "CUSTOMER", "c", false, c);
  let where = s.sql;
  const args = [...s.params];
  const parentScope = await scope(user, "CUSTOMER", "p", false, c);
  const dealScope = await scope(user, "DEAL", "d", false, c, "owner_id");
  for (const k of ["status", "industry", "company_size", "region"])
    if (q[k]) {
      where += ` AND c.${k}=?`;
      args.push(q[k]);
    }
  if (q.owner_id) {
    where += " AND c.created_by=?";
    args.push(id(q.owner_id));
  }
  if (q.search) {
    where +=
      " AND (c.name LIKE ? OR c.tax_code LIKE ? OR EXISTS(SELECT 1 FROM customer_contacts ct WHERE ct.customer_id=c.id AND (ct.phone LIKE ? OR ct.full_name LIKE ?)))";
    args.push(...Array(4).fill("%" + q.search + "%"));
  }
  if (q.custom_fields) {
    const fields = json(q.custom_fields);
    for (const [key, value] of Object.entries(fields)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key))
        fail(400, "Trường lọc không hợp lệ.");
      where += " AND JSON_UNQUOTE(JSON_EXTRACT(c.custom_fields,?))=?";
      args.push("$." + key, String(value));
    }
  }
  const [rows] = await c.query(
    `SELECT c.*,u.full_name assigned_user_name,p.company_name parent_company_name,
 (SELECT COUNT(*) FROM support_tickets st WHERE st.customer_id=c.id AND st.status IN ('Mới','Đang xử lý')) unresolved_tickets_count,
 (SELECT COALESCE(SUM(COALESCE(d.actual_amount,d.amount)),0) FROM deals d WHERE d.customer_id=c.id AND d.status='WON' AND (${dealScope.sql})) total_signed
 FROM customers c LEFT JOIN users u ON u.id=c.created_by LEFT JOIN customers p ON p.id=c.parent_id AND (${parentScope.sql}) WHERE ${where} ORDER BY c.id`,
    [...dealScope.params, ...parentScope.params, ...args],
  );
  return {
    success: true,
    scope: s.name,
    total: rows.length,
    data: rows.map((r) => ({
      ...r,
      custom_fields_data: json(r.custom_fields),
      risk_level: r.unresolved_tickets_count >= 2 ? "Nguy cấp" : "Bình thường",
      total_contract_value: Number(r.total_signed),
    })),
  };
}
router.get(
  "/",
  route(async (req, res) => res.json(await list(req.user, req.query))),
);
router.get(
  "/users-list",
  route(async (req, res) => {
    const s = await scope(req.user, "CUSTOMER", "u", false, db, "id");
    const [rows] = await db.query(
      `SELECT u.id,u.full_name,u.email,u.role_code,u.group_id,g.name group_name,(SELECT JSON_ARRAYAGG(ur.role_code) FROM user_roles ur WHERE ur.user_id=u.id) roles FROM users u LEFT JOIN \`groups\` g ON g.id=u.group_id WHERE u.is_active=1 AND (${s.sql}) ORDER BY u.full_name`,
      s.params,
    );
    res.json({ data: rows });
  }),
);
router.get(
  "/custom-fields-active",
  route(async (req, res) => {
    const [rows] = await db.query(
      "SELECT * FROM custom_fields WHERE entity_type='customer' AND is_active=1",
    );
    res.json({ data: rows });
  }),
);
router.get(
  "/saved-filters",
  route(async (req, res) => {
    const [rows] = await db.query(
      "SELECT * FROM saved_filters WHERE user_id=? AND entity_type='customer'",
      [req.user.id],
    );
    res.json({ data: rows });
  }),
);
router.post(
  "/saved-filters",
  route(async (req, res) =>
    res.status(201).json({
      id: await insert(db, "saved_filters", {
        user_id: req.user.id,
        entity_type: "customer",
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
      "DELETE FROM saved_filters WHERE id=? AND user_id=? AND entity_type='customer'",
      [id(req.params.id), req.user.id],
    );
    res.json({ success: true });
  }),
);
router.get(
  "/care-list",
  route(async (req, res) => {
    const [[setting]] = await db.query(
      "SELECT setting_value FROM crm_settings WHERE setting_key='care_days'",
    );
    const days = number(
      req.query.days || setting?.setting_value || 30,
      "Số ngày",
      1,
      3650,
    );
    const result = await list(req.user, req.query);
    const cutoff = Date.now() - days * 86400000;
    const [latest] = await db.query(
      "SELECT customer_id,MAX(created_at) last_at FROM customer_activities GROUP BY customer_id",
    );
    const times = new Map(latest.map((x) => [x.customer_id, x.last_at]));
    result.data = result.data
      .filter(
        (c) =>
          Math.max(
            Date.parse((c.last_contacted_at || c.created_at) + "Z"),
            Date.parse((times.get(c.id) || c.created_at) + "Z"),
          ) < cutoff,
      )
      .sort((a, b) => b.total_contract_value - a.total_contract_value);
    result.total = result.data.length;
    res.json(result);
  }),
);
router.put(
  "/:id/contacted",
  route(async (req, res) => {
    await transaction(async (c) => {
      await record(
        c,
        req.user,
        "CUSTOMER",
        "customers",
        req.params.id,
        true,
        "created_by",
        true,
      );
      await c.query(
        "UPDATE customers SET last_contacted_at=UTC_TIMESTAMP() WHERE id=?",
        [id(req.params.id)],
      );
      await insert(c, "customer_activities", {
        customer_id: id(req.params.id),
        user_id: req.user.id,
        activity_type: "Liên hệ",
        content: "Đã liên hệ chăm sóc định kỳ",
      });
    });
    res.json({ success: true });
  }),
);
router.get(
  "/detect-duplicates",
  route(async (req, res) => {
    const rows = (await list(req.user, {})).data;
    const {
      normalized: normalize,
      similar,
      website,
    } = require("../core/duplicates");
    const result = [];
    for (let i = 0; i < rows.length; i++)
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i],
          b = rows[j],
          an = normalize(a.company_name),
          bn = normalize(b.company_name);
        const reasons = [];
        if (a.tax_code && a.tax_code === b.tax_code) reasons.push("tax_code");
        if (a.website && website(a.website) === website(b.website))
          reasons.push("website");
        if (similar(an, bn)) reasons.push("company_name");
        if (reasons.length) result.push({ left: a, right: b, reasons });
      }
    res.json({ data: result });
  }),
);
router.post(
  "/merge",
  requireRoles("Admin", "Director", "Team Lead"),
  route(async (req, res) => {
    const target = id(req.body.target_id || req.body.targetId),
      source = id(req.body.source_id || req.body.sourceId);
    if (target === source) fail(400, "Cần hai khách hàng khác nhau.");
    await transaction(async (c) => {
      for (const rid of [target, source].sort((a, b) => a - b))
        await record(
          c,
          req.user,
          "CUSTOMER",
          "customers",
          rid,
          true,
          "created_by",
          true,
        );
      const [[cycle]] = await c.query(
        "WITH RECURSIVE tree AS (SELECT id FROM customers WHERE id=? UNION DISTINCT SELECT v.id FROM customers v JOIN tree t ON v.parent_id=t.id) SELECT COUNT(*) n FROM tree WHERE id=?",
        [source, target],
      );
      if (cycle.n) fail(409, "Không gộp công ty mẹ vào công ty con.");
      const [[primary]] = await c.query(
        "SELECT id FROM customer_contacts WHERE customer_id=? AND is_primary=1 LIMIT 1",
        [target],
      );
      if (primary)
        await c.query(
          "UPDATE customer_contacts SET is_primary=0 WHERE customer_id=?",
          [source],
        );
      for (const table of [
        "customer_contacts",
        "deals",
        "customer_activities",
        "customer_files",
        "support_tickets",
        "quotes",
      ])
        await c.query(`UPDATE ${table} SET customer_id=? WHERE customer_id=?`, [
          target,
          source,
        ]);
      await c.query("UPDATE leads SET customer_id=? WHERE customer_id=?", [
        target,
        source,
      ]);
      await c.query("UPDATE customers SET parent_id=? WHERE parent_id=?", [
        target,
        source,
      ]);
      await audit(
        c,
        req.user,
        "MERGE",
        "customers",
        target,
        { source_id: source },
        { target_id: target },
        req.body.reason || "Gộp khách hàng trùng",
      );
      await c.query("DELETE FROM customers WHERE id=?", [source]);
    });
    res.json({ success: true });
  }),
);
router.get(
  "/:id/360",
  route(async (req, res) => {
    const customer = await record(
      db,
      req.user,
      "CUSTOMER",
      "customers",
      req.params.id,
    );
    const cid = customer.id;
    const s = await scope(req.user, "CUSTOMER", "c");
    let showActivities = true;
    try {
      permission(req.user, "ACTIVITY");
    } catch {
      showActivities = false;
    }
    const ds = await scope(req.user, "DEAL", "d", false, db, "owner_id");
    const [
      [contacts],
      [tickets],
      [deals],
      [activities],
      [files],
      [groupBreakdown],
    ] = await Promise.all([
      db.query(
        "SELECT * FROM customer_contacts WHERE customer_id=? ORDER BY is_primary DESC,id",
        [cid],
      ),
      db.query(
        "SELECT * FROM support_tickets WHERE customer_id=? ORDER BY id DESC",
        [cid],
      ),
      db.query(
        `SELECT d.* FROM deals d WHERE d.customer_id=? AND (${ds.sql}) ORDER BY d.id DESC`,
        [cid, ...ds.params],
      ),
      db.query(
        `SELECT a.*,u.full_name author_name FROM customer_activities a LEFT JOIN users u ON u.id=a.user_id WHERE a.customer_id=? AND ?=1 AND (a.deal_id IS NULL OR a.deal_id IN (SELECT d.id FROM deals d WHERE ${ds.sql})) ORDER BY a.created_at DESC,a.id DESC`,
        [cid, showActivities ? 1 : 0, ...ds.params],
      ),
      db.query(
        "SELECT id,file_name,mime_type,size_bytes,created_at FROM customer_files WHERE customer_id=?",
        [cid],
      ),
      db.query(
        `WITH RECURSIVE tree AS (SELECT id FROM customers WHERE id=? UNION DISTINCT SELECT ch.id FROM customers ch JOIN tree t ON ch.parent_id=t.id)
 SELECT c.id,c.company_name,c.tax_code,COALESCE((SELECT SUM(COALESCE(d.actual_amount,d.amount)) FROM deals d WHERE d.customer_id=c.id AND d.status='WON' AND (${ds.sql})),0) contract_value FROM customers c JOIN tree t ON t.id=c.id WHERE ${s.sql}`,
        [cid, ...ds.params, ...s.params],
      ),
    ]);
    const signedValue = deals
      .filter((d) => d.status === "WON")
      .reduce((n, d) => n + Number(d.actual_amount ?? d.amount), 0);
    const openDealsValue = deals
      .filter((d) => d.status === "OPEN")
      .reduce((n, d) => n + Number(d.amount), 0);
    customer.risk_level =
      tickets.filter((t) => ["Mới", "Đang xử lý"].includes(t.status)).length >=
      2
        ? "Nguy cấp"
        : "Bình thường";
    res.json({
      success: true,
      data: {
        customer,
        contacts,
        tickets,
        deals,
        activities,
        files,
        signedValue,
        openDealsValue,
        groupBreakdown,
        groupTotalValue: groupBreakdown.reduce(
          (n, c) => n + Number(c.contract_value),
          0,
        ),
      },
    });
  }),
);
router.get(
  "/:id",
  route(async (req, res) =>
    res.json({
      data: await record(db, req.user, "CUSTOMER", "customers", req.params.id),
    }),
  ),
);
router.post(
  "/",
  route(async (req, res) =>
    res.status(201).json({
      id: await transaction((c) => saveCustomer(c, req.user, req.body)),
    }),
  ),
);
router.put(
  "/:id",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveCustomer(c, req.user, req.body, id(req.params.id)),
      ),
    }),
  ),
);
router.delete(
  "/:id",
  route(async (req, res) => {
    await transaction(async (c) => {
      const row = await record(
        c,
        req.user,
        "CUSTOMER",
        "customers",
        req.params.id,
        true,
        "created_by",
        true,
      );
      for (const table of [
        "customer_contacts",
        "customer_activities",
        "deals",
        "support_tickets",
        "customer_files",
      ]) {
        const [[r]] = await c.query(
          `SELECT COUNT(*) n FROM ${table} WHERE customer_id=?`,
          [row.id],
        );
        if (r.n)
          fail(
            409,
            "Khách hàng có dữ liệu liên quan; hãy chuyển trạng thái Ngừng hợp tác.",
          );
      }
      await c.query("DELETE FROM customers WHERE id=?", [row.id]);
      await audit(c, req.user, "DELETE", "customers", row.id, row, null);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/contacts",
  route(async (req, res) =>
    res.status(201).json({
      id: await transaction((c) => saveContact(c, req.user, req.body)),
    }),
  ),
);
router.put(
  "/contacts/:contactId",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveContact(c, req.user, req.body, id(req.params.contactId)),
      ),
    }),
  ),
);
router.put(
  "/contacts/:contactId/primary",
  route(async (req, res) =>
    res.json({
      id: await transaction((c) =>
        saveContact(
          c,
          req.user,
          { is_primary: true },
          id(req.params.contactId),
        ),
      ),
    }),
  ),
);
router.put(
  "/contacts/:contactId/reassign",
  route(async (req, res) => {
    await transaction((c) =>
      transferContact(
        c,
        req.user,
        req.params.contactId,
        req.body.customer_id || req.body.targetCustomerId,
        req.body.reason || req.body.transferReason,
      ),
    );
    res.json({ success: true });
  }),
);
router.delete(
  "/contacts/:contactId",
  route(async (req, res) => {
    await transaction(async (c) => {
      const [[r]] = await c.query(
        "SELECT * FROM customer_contacts WHERE id=?",
        [id(req.params.contactId)],
      );
      if (!r) fail(404, "Không tìm thấy liên hệ.");
      await record(
        c,
        req.user,
        "CUSTOMER",
        "customers",
        r.customer_id,
        true,
        "created_by",
        true,
      );
      const [[used]] = await c.query(
        "SELECT COUNT(*) n FROM deals WHERE contact_id=?",
        [r.id],
      );
      if (used.n) fail(409, "Liên hệ đang gắn với cơ hội.");
      await c.query("DELETE FROM customer_contacts WHERE id=?", [r.id]);
      await audit(c, req.user, "DELETE", "customer_contacts", r.id, r, null);
    });
    res.json({ success: true });
  }),
);
router.post(
  "/activities",
  route(async (req, res) => {
    const cid = id(req.body.customer_id);
    const rid = await transaction(async (c) => {
      await record(
        c,
        req.user,
        "CUSTOMER",
        "customers",
        cid,
        true,
        "created_by",
        true,
      );
      const content = text(req.body.content, "Nội dung", 20000);
      return insert(c, "customer_activities", {
        customer_id: cid,
        user_id: req.user.id,
        activity_type: req.body.activity_type || "Ghi chú",
        content,
      });
    });
    res.status(201).json({ id: rid });
  }),
);
async function ticket(req, res) {
  const rid = await transaction(async (c) => {
    let old = null;
    if (req.params.ticketId) {
      const [[r]] = await c.query(
        "SELECT * FROM support_tickets WHERE id=? FOR UPDATE",
        [id(req.params.ticketId)],
      );
      if (!r) fail(404, "Không tìm thấy yêu cầu.");
      old = r;
    }
    const cid = old?.customer_id || id(req.body.customer_id);
    const customer = await record(
      c,
      req.user,
      "CUSTOMER",
      "customers",
      cid,
      true,
      "created_by",
      true,
    );
    const priority = req.body.priority || old?.priority || "Cao",
      status = req.body.status || old?.status || "Mới";
    if (
      !["Thấp", "Trung bình", "Cao", "Khẩn cấp"].includes(priority) ||
      !["Mới", "Đang xử lý", "Đã xử lý", "Đã đóng"].includes(status)
    )
      fail(400, "Trạng thái hoặc mức ưu tiên không hợp lệ.");
    const assignee = await ownerAllowed(
      c,
      req.user,
      "CUSTOMER",
      req.body.assigned_to || old?.assigned_to || req.user.id,
    );
    const data = {
      customer_id: cid,
      title: text(req.body.title || old?.title, "Tiêu đề"),
      priority,
      status,
      assigned_to: assignee.id,
    };
    let tid = old?.id;
    if (tid) await update(c, "support_tickets", tid, data);
    else tid = await insert(c, "support_tickets", data);
    const [[count]] = await c.query(
      "SELECT COUNT(*) n FROM support_tickets WHERE customer_id=? AND status IN ('Mới','Đang xử lý')",
      [cid],
    );
    await update(c, "customers", cid, {
      risk_level: count.n >= 2 ? "Nguy cấp" : "Bình thường",
    });
    if (count.n >= 2)
      await c.query(
        "INSERT INTO crm_notifications (user_id,event_key,message) VALUES (?,?,?) ON DUPLICATE KEY UPDATE message=VALUES(message)",
        [
          customer.created_by,
          "customer-risk:" + cid,
          "Khách hàng " +
            customer.company_name +
            " có nhiều yêu cầu chưa xử lý.",
        ],
      );
    await insert(c, "customer_activities", {
      customer_id: cid,
      user_id: req.user.id,
      activity_type: "Hỗ trợ",
      content: `${old ? "Cập nhật" : "Tạo"} yêu cầu: ${data.title} (${status})`,
    });
    return tid;
  });
  res.json({ id: rid });
}
router.post("/tickets", route(ticket));
router.put("/tickets/:ticketId", route(ticket));
const fileUpload = require("multer")({
  storage: require("multer").memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
router.post(
  "/:id/files",
  fileUpload.single("file"),
  route(async (req, res) => {
    await record(db, req.user, "CUSTOMER", "customers", req.params.id, true);
    if (!req.file) fail(400, "Thiếu tệp.");
    const storage = crypto.randomUUID(),
      dir = path.join(__dirname, "../../uploads/customer-files");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, storage), req.file.buffer);
    try {
      const rid = await insert(db, "customer_files", {
        customer_id: id(req.params.id),
        file_name: path.basename(req.file.originalname),
        storage_name: storage,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        user_id: req.user.id,
      });
      res.status(201).json({ id: rid });
    } catch (e) {
      await fs.unlink(path.join(dir, storage));
      throw e;
    }
  }),
);
router.get(
  "/:id/files/:fileId",
  route(async (req, res) => {
    await record(db, req.user, "CUSTOMER", "customers", req.params.id);
    const [[f]] = await db.query(
      "SELECT * FROM customer_files WHERE id=? AND customer_id=?",
      [id(req.params.fileId), id(req.params.id)],
    );
    if (!f) fail(404, "Không tìm thấy tệp.");
    res.download(
      path.join(
        __dirname,
        "../../uploads/customer-files",
        path.basename(f.storage_name),
      ),
      f.file_name,
    );
  }),
);
router.post(
  "/deals",
  route(async (req, res) =>
    res.status(201).json({
      id: await transaction((c) =>
        require("../core/deals").saveDeal(c, req.user, req.body),
      ),
    }),
  ),
);
module.exports = router;
module.exports.list = list;
