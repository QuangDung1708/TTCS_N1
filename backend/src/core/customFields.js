const { fail, json, date } = require("./http");
async function validateCustom(c, entity, values) {
  values = json(values, {});
  if (!values || Array.isArray(values) || typeof values !== "object")
    fail(400, "Trường tùy chỉnh không hợp lệ.");
  const [fields] = await c.query(
    "SELECT * FROM custom_fields WHERE entity_type=?",
    [entity],
  );
  for (const f of fields) {
    if (!f.is_active) continue;
    const v = values[f.field_key];
    if (v === undefined || v === null || v === "") {
      if (f.is_required) fail(400, `Thiếu trường ${f.field_name}.`);
      continue;
    }
    if (
      f.field_type === "number" &&
      (typeof v !== "number" || !Number.isFinite(v))
    )
      fail(400, `${f.field_name} phải là số.`);
    if (f.field_type === "date") date(v);
    if (
      ["select", "dropdown"].includes(f.field_type) &&
      !json(f.options, []).includes(v)
    )
      fail(400, `${f.field_name} không thuộc danh sách chọn.`);
    if (f.field_type === "text" && typeof v !== "string")
      fail(400, `${f.field_name} phải là văn bản.`);
  }
  for (const key of Object.keys(values))
    if (!fields.some((f) => f.field_key === key))
      fail(400, `Trường tùy chỉnh chưa khai báo: ${key}`);
  return JSON.stringify(values);
}
module.exports = { validateCustom };
