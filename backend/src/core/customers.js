const { insert, update, audit } = require("./store");
const { fail, id, text, email, phone } = require("./http");
const { record, ownerAllowed } = require("./access");
const { validateCustom } = require("./customFields");
const states = ["Tiềm năng", "Đang giao dịch", "Khách hàng", "Ngừng hợp tác"];
async function saveCustomer(c, user, b, rowId, importOptions = {}) {
  const old = rowId
    ? await record(
        c,
        user,
        "CUSTOMER",
        "customers",
        rowId,
        true,
        "created_by",
        true,
      )
    : null;
  const owner = await ownerAllowed(
    c,
    user,
    "CUSTOMER",
    b.created_by || b.owner_id || old?.created_by || user.id,
  );
  const name = text(
    b.company_name || b.name || old?.company_name || old?.name,
    "Tên công ty",
  );
  const status = b.status || old?.status || "Tiềm năng";
  if (!states.includes(status))
    fail(400, "Trạng thái khách hàng không hợp lệ.");
  const parent =
    b.parent_id === undefined
      ? old?.parent_id || null
      : b.parent_id
        ? id(b.parent_id)
        : null;
  if (parent) {
    await record(c, user, "CUSTOMER", "customers", parent);
    if (rowId) {
      const [tree] = await c.query(
        "WITH RECURSIVE tree AS (SELECT id FROM customers WHERE id=? UNION DISTINCT SELECT v.id FROM customers v JOIN tree t ON v.parent_id=t.id) SELECT id FROM tree",
        [id(rowId)],
      );
      if (tree.some((t) => t.id === parent))
        fail(400, "Quan hệ công ty mẹ/con không được tạo vòng lặp.");
    }
  }
  const data = {
    name,
    company_name: name,
    created_by: owner.id,
    group_id: owner.group_id,
    status,
    parent_id: parent,
  };
  for (const k of [
    "tax_code",
    "industry",
    "company_size",
    "website",
    "address",
    "region",
    "industry_code",
  ])
    data[k] =
      b[k] === undefined
        ? old?.[k] || null
        : b[k]
          ? text(b[k], k, k === "address" ? 2000 : 255)
          : null;
  if (data.tax_code && !/^\d{10}(?:-?\d{3})?$/.test(data.tax_code))
    fail(400, "Mã số thuế cần 10 hoặc 13 chữ số.");
  data.phone = b.phone === undefined ? old?.phone || null : phone(b.phone);
  data.email =
    b.email === undefined
      ? old?.email || null
      : b.email
        ? email(b.email)
        : null;
  data.custom_fields = await validateCustom(
    c,
    "customer",
    b.custom_fields || b.custom_fields_data || old?.custom_fields,
  );
  if (importOptions.rejectExactDuplicate)
    await require("./importDuplicates").rejectExactCustomer(c, data, b);
  if (importOptions.taxConflict)
    fail(409, "Trùng mã số thuế. Chọn bỏ qua hoặc cập nhật.");
  let cid = rowId;
  if (cid) await update(c, "customers", cid, data);
  else cid = await insert(c, "customers", data);
  await audit(
    c,
    user,
    old ? "UPDATE" : "CREATE",
    "customers",
    cid,
    old ? { ...old, custom_fields: old.custom_fields } : null,
    data,
  );
  return cid;
}
async function saveContact(c, user, b, contactId) {
  let old;
  if (contactId) {
    const [[r]] = await c.query("SELECT * FROM customer_contacts WHERE id=?", [
      id(contactId),
    ]);
    if (!r) fail(404, "Không tìm thấy liên hệ.");
    old = r;
    await record(
      c,
      user,
      "CUSTOMER",
      "customers",
      r.customer_id,
      true,
      "created_by",
      true,
    );
  }
  const customerId = b.customer_id || old?.customer_id;
  await record(
    c,
    user,
    "CUSTOMER",
    "customers",
    customerId,
    true,
    "created_by",
    true,
  );
  if (old && Number(customerId) !== old.customer_id)
    fail(400, "Dùng thao tác chuyển công ty để giữ lịch sử.");
  const role =
    b.decision_role || b.buying_role || old?.decision_role || "Người dùng cuối";
  if (
    ![
      "Người quyết định",
      "Người ảnh hưởng",
      "Người dùng cuối",
      "Người cản trở",
      "DECISION_MAKER",
      "INFLUENCER",
      "END_USER",
      "BLOCKER",
    ].includes(role)
  )
    fail(400, "Vai trò quyết định mua không hợp lệ.");
  const primary =
    b.is_primary === undefined ? !!old?.is_primary : !!b.is_primary;
  if (primary)
    await c.query(
      "UPDATE customer_contacts SET is_primary=0 WHERE customer_id=?",
      [customerId],
    );
  const data = {
    customer_id: id(customerId),
    full_name: text(b.full_name || b.name || old?.full_name, "Họ tên", 100),
    position: b.position || b.title || old?.position || null,
    phone: b.phone === undefined ? old?.phone || null : phone(b.phone),
    email:
      b.email === undefined
        ? old?.email || null
        : b.email
          ? email(b.email)
          : null,
    decision_role: role,
    is_primary: primary,
  };
  if (contactId) await update(c, "customer_contacts", contactId, data);
  else contactId = await insert(c, "customer_contacts", data);
  await audit(
    c,
    user,
    old ? "UPDATE" : "CREATE",
    "customer_contacts",
    contactId,
    old || null,
    data,
  );
  return contactId;
}
async function transferContact(c, user, contactId, target, reason) {
  const [[old]] = await c.query(
    "SELECT * FROM customer_contacts WHERE id=? FOR UPDATE",
    [id(contactId)],
  );
  if (!old) fail(404, "Không tìm thấy liên hệ.");
  await record(
    c,
    user,
    "CUSTOMER",
    "customers",
    old.customer_id,
    true,
    "created_by",
    true,
  );
  await record(
    c,
    user,
    "CUSTOMER",
    "customers",
    target,
    true,
    "created_by",
    true,
  );
  await update(c, "customer_contacts", old.id, {
    customer_id: id(target),
    is_primary: false,
  });
  await insert(c, "contact_histories", {
    contact_id: old.id,
    from_customer_id: old.customer_id,
    to_customer_id: id(target),
    user_id: user.id,
    reason: text(reason, "Lý do", 2000),
  });
  await audit(
    c,
    user,
    "TRANSFER",
    "customer_contacts",
    old.id,
    { customer_id: old.customer_id },
    { customer_id: id(target) },
    reason,
  );
}
module.exports = { saveCustomer, saveContact, transferContact };
