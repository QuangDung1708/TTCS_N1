const { insert, update, audit } = require("./store");
const { fail, id, text, email, phone, json, number } = require("./http");
const { scope, record, ownerAllowed, has } = require("./access");
async function score(c, b) {
  const [rules] = await c.query("SELECT * FROM lead_scoring_rules");
  let points = 0;
  for (const r of rules)
    if (
      String(b[r.field_name] ?? "").toLowerCase() ===
      r.match_value.toLowerCase()
    )
      points += Number(r.points);
  const [[r]] = await c.query(
    "SELECT setting_value FROM crm_settings WHERE setting_key='lead_thresholds'",
  );
  const thresholds = json(r?.setting_value, { warm: 30, hot: 70 });
  return {
    score: points,
    temperature:
      points >= thresholds.hot
        ? "HOT"
        : points >= thresholds.warm
          ? "WARM"
          : "COLD",
  };
}
async function saveLead(c, user, b, leadId, importOptions = {}) {
  const old = leadId
    ? await record(c, user, "LEAD", "leads", leadId, true, "owner_id", true)
    : null;
  if (old && ["CONVERTED", "MERGED"].includes(old.status))
    fail(409, "Lead đã chuyển đổi/gộp không được sửa.");
  const v = { ...old, ...b };
  const source = id(v.source_id || v.lead_source_id);
  const [[s]] = await c.query(
    "SELECT id FROM sales_categories WHERE id=? AND type='lead_source' AND status='active'",
    [source],
  );
  if (!s) fail(400, "Lead bắt buộc có nguồn hợp lệ.");
  const campaign = v.campaign_id ? id(v.campaign_id) : null;
  if (campaign) {
    const [[r]] = await c.query("SELECT id FROM campaigns WHERE id=?", [
      campaign,
    ]);
    if (!r) fail(400, "Chiến dịch không tồn tại.");
  }
  const data = {
    full_name: text(v.full_name || v.name, "Họ tên", 100),
    company_name: text(v.company_name, "Công ty"),
    email: v.email ? email(v.email) : null,
    phone: phone(v.phone),
    interest: v.interest ? text(v.interest, "Nhu cầu", 2000) : null,
    source_id: source,
    campaign_id: campaign,
    industry: v.industry || null,
    company_size: v.company_size || null,
    region: v.region || null,
    interest_level: v.interest_level || null,
  };
  if (!data.email && !data.phone)
    fail(400, "Lead cần email hoặc số điện thoại.");
  if (!old) {
    data.created_by = user?.id || null;
    data.status = "NEW";
    if (user) {
      const s = await scope(user, "LEAD", "", true, c, "owner_id");
      if (s.name === "OWN") {
        data.owner_id = user.id;
        data.group_id = user.group_id;
        data.status = "ASSIGNED";
        data.assigned_at = new Date();
        data.sla_due_at = new Date(Date.now() + 3600000);
      }
    }
  }
  if (importOptions.rejectExactDuplicate)
    await require("./importDuplicates").rejectExactLead(c, data);
  Object.assign(data, await score(c, data));
  let rid = leadId;
  if (rid) await update(c, "leads", rid, data);
  else rid = await insert(c, "leads", data);
  await audit(
    c,
    user,
    old ? "UPDATE" : "CREATE",
    "leads",
    rid,
    old || null,
    data,
  );
  if (
    b.owner_id != null &&
    Number(b.owner_id) !== Number(old?.owner_id || data.owner_id || 0)
  ) {
    if (!has(user || {}, "Admin", "Director", "Team Lead", "Marketing"))
      fail(403, "Bạn không có quyền phân bổ lead.");
    await ownerAllowed(c, user, "LEAD", b.owner_id);
    await assign(
      c,
      { ...old, ...data, id: rid },
      b.owner_id,
      user,
      text(b.assignment_reason || "Phân bổ trong hồ sơ lead", "Lý do", 2000),
      number(b.sla_minutes || 60, "SLA", 1, 43200),
    );
  }
  return rid;
}
async function assign(c, lead, userId, actor, reason, sla = 60) {
  const [[u]] = await c.query(
    "SELECT u.id,u.group_id FROM users u WHERE u.id=? AND u.is_active=1 AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role_code='Sales Rep')",
    [id(userId)],
  );
  if (!u) fail(400, "Người nhận phải là nhân viên kinh doanh đang hoạt động.");
  await c.query(
    "UPDATE leads SET owner_id=?,group_id=?,status='ASSIGNED',assigned_at=UTC_TIMESTAMP(),sla_due_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE),sla_breached=0 WHERE id=?",
    [u.id, u.group_id, sla, lead.id],
  );
  await audit(
    c,
    actor,
    "ASSIGN",
    "leads",
    lead.id,
    { owner_id: lead.owner_id },
    { owner_id: u.id },
    reason,
  );
  await c.query(
    "INSERT INTO crm_notifications (user_id,event_key,message) VALUES (?,?,?) ON DUPLICATE KEY UPDATE message=VALUES(message)",
    [u.id, "lead-assigned:" + lead.id, "Bạn được phân lead: " + lead.full_name],
  );
}
async function assignPending(c) {
  const [leads] = await c.query(
    // businessJobs already holds the database-wide crm-worker advisory lock.
    // Ordinary row locks also work on MariaDB 10.4 shipped with XAMPP.
    "SELECT * FROM leads WHERE owner_id IS NULL AND status='NEW' ORDER BY id LIMIT 1000 FOR UPDATE",
  );
  const [rules] = await c.query(
    "SELECT * FROM lead_assignment_rules WHERE is_active=1 ORDER BY priority,id FOR UPDATE",
  );
  for (const lead of leads) {
    const r = rules.find(
      (r) =>
        (!r.region || r.region === lead.region) &&
        (!r.industry || r.industry === lead.industry),
    );
    if (!r) {
      await update(c, "leads", lead.id, { status: "QUEUED" });
      continue;
    }
    const [users] = await c.query(
      "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id AND ur.role_code='Sales Rep' WHERE u.group_id=? AND u.is_active=1 AND u.status NOT IN ('Đã khóa','inactive') ORDER BY u.id",
      [r.group_id],
    );
    if (!users.length) {
      await update(c, "leads", lead.id, {
        status: "QUEUED",
        group_id: r.group_id,
      });
      continue;
    }
    const u = users.find((u) => u.id > Number(r.last_user_id || 0)) || users[0];
    await assign(
      c,
      lead,
      u.id,
      null,
      "Phân bổ tự động: " + r.name,
      r.sla_minutes,
    );
    r.last_user_id = u.id;
    await update(c, "lead_assignment_rules", r.id, { last_user_id: u.id });
  }
}
module.exports = { score, saveLead, assign, assignPending };
