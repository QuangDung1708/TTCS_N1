const { insert, update, audit } = require("./store");
const { fail, id, text, number, date } = require("./http");
const { record, ownerAllowed, has } = require("./access");
const { validateCustom } = require("./customFields");
async function findStage(c, value, allowInactive = false) {
  const [[s]] = await c.query(
    "SELECT * FROM pipeline_stages WHERE id=? OR code=? OR name=? ORDER BY id LIMIT 1",
    [Number(value) || 0, String(value), String(value)],
  );
  if (!s || (!s.is_active && !allowInactive))
    fail(400, "Giai đoạn không tồn tại hoặc ngừng sử dụng.");
  return s;
}
async function saveDeal(c, user, b, dealId) {
  const old = dealId
    ? await record(c, user, "DEAL", "deals", dealId, true, "owner_id", true)
    : null;
  if (old && old.status !== "OPEN")
    fail(409, "Cơ hội đã đóng. Cần mở lại trước khi chỉnh sửa.");
  const v = { ...old, ...b };
  const customer = await record(
    c,
    user,
    "CUSTOMER",
    "customers",
    v.customer_id,
    false,
  );
  const owner = await ownerAllowed(c, user, "DEAL", v.owner_id || user.id);
  const stage = await findStage(c, v.stage_id || v.stage, !!old);
  if (old && stage.id !== old.stage_id)
    fail(400, "Dùng API chuyển giai đoạn để kiểm tra điều kiện.");
  const expected = date(v.expected_close_date);
  if (!old && expected < new Date().toISOString().slice(0, 10))
    fail(400, "Ngày dự kiến chốt không được ở quá khứ.");
  let contact = null;
  if (v.contact_id) {
    const [[r]] = await c.query(
      "SELECT id FROM customer_contacts WHERE id=? AND customer_id=?",
      [id(v.contact_id), customer.id],
    );
    if (!r) fail(400, "Liên hệ chính phải thuộc khách hàng.");
    contact = r.id;
  }
  if (!contact) fail(400, "Cần người liên hệ chính.");
  const source = id(v.source_id || v.lead_source_id);
  const [[sourceRow]] = await c.query(
    "SELECT id FROM sales_categories WHERE id=? AND type='lead_source'",
    [source],
  );
  if (!sourceRow) fail(400, "Nguồn không hợp lệ.");
  if (v.campaign_id) {
    const [[campaign]] = await c.query("SELECT id FROM campaigns WHERE id=?", [
      id(v.campaign_id),
    ]);
    if (!campaign) fail(400, "Chiến dịch không tồn tại.");
  }
  const probability = number(
    v.probability ?? stage.win_probability,
    "Xác suất",
    0,
    100,
  );
  const note = v.probability_note || null;
  const changedProbability =
    !old ||
    (b.probability !== undefined &&
      Number(b.probability) !== Number(old.probability));
  if (
    changedProbability &&
    probability !== Number(stage.win_probability) &&
    !note
  )
    fail(400, "Sửa xác suất cần ghi chú.");
  const data = {
    title: text(v.title, "Tên cơ hội"),
    customer_id: customer.id,
    contact_id: contact,
    owner_id: owner.id,
    group_id: owner.group_id,
    source_id: source,
    campaign_id: v.campaign_id || null,
    stage_id: stage.id,
    stage: stage.code,
    probability,
    probability_note: note,
    amount: number(v.amount ?? 0, "Giá trị"),
    expected_close_date: expected,
    custom_fields: await validateCustom(c, "deal", v.custom_fields),
  };
  if (old) {
    const [[items]] = await c.query(
      "SELECT COUNT(*) n FROM deal_items WHERE deal_id=?",
      [old.id],
    );
    if (items.n) data.amount = old.amount;
  }
  let rid = dealId;
  if (rid) await update(c, "deals", rid, data);
  else rid = await insert(c, "deals", data);
  await audit(
    c,
    user,
    old ? "UPDATE" : "CREATE",
    "deals",
    rid,
    old || null,
    data,
  );
  if (!old)
    await insert(c, "customer_activities", {
      customer_id: customer.id,
      deal_id: rid,
      user_id: user.id,
      activity_type: "Cơ hội",
      content: "Tạo cơ hội: " + data.title,
    });
  return rid;
}
async function validateTransition(c, user, dealId, nextId, b = {}) {
  const deal = await record(
    c,
    user,
    "DEAL",
    "deals",
    dealId,
    true,
    "owner_id",
    true,
  );
  if (deal.status !== "OPEN") fail(409, "Cơ hội đã đóng.");
  const next = await findStage(c, nextId);
  const [[current]] = await c.query(
    "SELECT * FROM pipeline_stages WHERE id=?",
    [deal.stage_id],
  );
  if (!current) fail(409, "Cơ hội chưa được gắn giai đoạn hợp lệ.");
  let missing = null;
  if (current.exit_condition === "require_meeting") {
    const [[r]] = await c.query(
      "SELECT COUNT(*) n FROM customer_activities WHERE deal_id=? AND activity_type IN ('meeting','Cuộc gặp')",
      [deal.id],
    );
    if (!r.n) missing = "Chưa có cuộc gặp được ghi nhận cho cơ hội.";
  }
  if (current.exit_condition === "require_contact" && !deal.contact_id)
    missing = "Chưa có người liên hệ chính.";
  if (current.exit_condition === "require_products") {
    const [[r]] = await c.query(
      "SELECT COUNT(*) n FROM deal_items WHERE deal_id=?",
      [deal.id],
    );
    if (!r.n) missing = "Chưa có dòng sản phẩm.";
  }
  if (current.exit_condition === "require_quote") {
    const [tables] = await c.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quotes'",
    );
    if (!tables.length) missing = "Chưa có báo giá cho cơ hội.";
    else {
      const [[r]] = await c.query(
        "SELECT COUNT(*) n FROM quotes WHERE deal_id=?",
        [deal.id],
      );
      if (!r.n) missing = "Chưa có báo giá cho cơ hội.";
    }
  }
  if (missing) {
    if (!b.override_reason || !has(user, "Admin", "Director", "Team Lead"))
      fail(422, missing);
    text(b.override_reason, "Lý do ghi đè", 2000);
  }
  return { deal, next, missing };
}
async function transition(c, user, dealId, next, b) {
  const {
    deal,
    next: stage,
    missing,
  } = await validateTransition(c, user, dealId, next, b);
  await update(c, "deals", deal.id, {
    stage_id: stage.id,
    stage: stage.code,
    probability: stage.win_probability,
    probability_note: null,
  });
  await audit(
    c,
    user,
    missing ? "STAGE_OVERRIDE" : "STAGE_CHANGE",
    "deals",
    deal.id,
    { stage_id: deal.stage_id },
    { stage_id: stage.id },
    b.override_reason || null,
  );
  await insert(c, "customer_activities", {
    customer_id: deal.customer_id,
    deal_id: deal.id,
    user_id: user.id,
    activity_type: "Giai đoạn",
    content: `Chuyển ${deal.stage} → ${stage.name}${missing ? " — " + b.override_reason : ""}`,
  });
}
async function close(c, user, dealId, b) {
  const d = await record(
    c,
    user,
    "DEAL",
    "deals",
    dealId,
    true,
    "owner_id",
    true,
  );
  if (d.status !== "OPEN") fail(409, "Cơ hội đã đóng.");
  const status = String(b.status || b.stage || "").toUpperCase();
  if (!["WON", "LOST"].includes(status))
    fail(400, "Kết quả phải là WON hoặc LOST.");
  const reasonId = id(status === "WON" ? b.win_reason_id : b.loss_reason_id);
  const [[reason]] = await c.query("SELECT * FROM deal_reasons WHERE id=?", [
    reasonId,
  ]);
  if (!reason || reason.type.toUpperCase() !== status)
    fail(400, "Lý do thắng/thua không hợp lệ.");
  await validateTransition(c, user, d.id, d.stage_id, b);
  const data = { status };
  if (status === "WON") {
    data.actual_amount = number(b.actual_amount, "Giá trị chốt thực tế");
    data.signed_date = date(b.signed_date);
    data.win_reason_id = reasonId;
  } else {
    data.loss_reason_id = reasonId;
    data.loss_note = b.loss_note || null;
    data.competitor_id = b.competitor_id ? id(b.competitor_id) : null;
    if (data.competitor_id) {
      const [[r]] = await c.query("SELECT id FROM competitors WHERE id=?", [
        data.competitor_id,
      ]);
      if (!r) fail(400, "Đối thủ không tồn tại.");
    }
  }
  if (b.override_reason)
    await audit(
      c,
      user,
      "STAGE_OVERRIDE",
      "deals",
      d.id,
      { stage_id: d.stage_id },
      { status },
      text(b.override_reason, "Lý do ghi đè", 2000),
    );
  await update(c, "deals", d.id, data);
  await audit(c, user, "CLOSE", "deals", d.id, { status: d.status }, data);
  await insert(c, "customer_activities", {
    customer_id: d.customer_id,
    deal_id: d.id,
    user_id: user.id,
    activity_type: "Kết quả",
    content: `Đóng ${status}: ${d.title}`,
  });
}
module.exports = { saveDeal, validateTransition, transition, close, findStage };
