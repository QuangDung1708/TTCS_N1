const { fail, json } = require("./http");
const baseFields = [
  "company_name",
  "tax_code",
  "industry",
  "company_size",
  "website",
  "address",
  "phone",
  "email",
  "status",
];
const cell = (value) =>
  String(value ?? "")
    .trim()
    .normalize("NFC");
function value(field, v) {
  const text = cell(v);
  if (field === "email") return text.toLowerCase();
  if (field === "phone")
    return text.replace(/[ .-]/g, "").replace(/^\+84/, "0");
  return text;
}
function customValue(v) {
  if (v && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .filter(
          (key) => v[key] !== null && v[key] !== undefined && v[key] !== "",
        )
        .map((key) => [key, customValue(v[key])]),
    );
  return typeof v === "string" ? v.normalize("NFC") : v;
}
async function rejectExactCustomer(c, data, input) {
  const optional = ["region", "industry_code"].filter((field) =>
    Object.hasOwn(input, field),
  );
  const fields = [...baseFields, ...optional];
  const [matches] = await c.query(
    `SELECT ${[...baseFields, "region", "industry_code", "custom_fields"].map((field) => `\`${field}\``).join(",")} FROM customers WHERE company_name=?`,
    [data.company_name],
  );
  const checkCustom =
    Object.hasOwn(input, "custom_fields") ||
    Object.hasOwn(input, "custom_fields_data");
  const custom = JSON.stringify(customValue(json(data.custom_fields, {})));
  if (
    matches.some(
      (row) =>
        fields.every(
          (field) => value(field, row[field]) === value(field, data[field]),
        ) &&
        (!checkCustom ||
          JSON.stringify(customValue(json(row.custom_fields, {}))) === custom),
    )
  )
    fail(
      409,
      "Trùng khách hàng: thông tin giống hoàn toàn một hồ sơ đã có hoặc dòng trước trong tệp. Dòng này không hợp lệ và không được nhập.",
      { duplicate_blocked: true },
    );
}
async function rejectExactLead(c, data) {
  const fields = [
    "full_name",
    "company_name",
    "email",
    "phone",
    "interest",
    "source_id",
    "campaign_id",
    "industry",
    "company_size",
    "region",
    "interest_level",
  ];
  const [matches] = await c.query(
    `SELECT ${fields.map((field) => `\`${field}\``).join(",")} FROM leads WHERE full_name=? AND company_name=?`,
    [data.full_name, data.company_name],
  );
  if (
    matches.some((row) =>
      fields.every(
        (field) => value(field, row[field]) === value(field, data[field]),
      ),
    )
  )
    fail(
      409,
      "Trùng lead: thông tin giống hoàn toàn một hồ sơ đã có hoặc dòng trước trong tệp. Dòng này không hợp lệ và không được nhập.",
      { duplicate_blocked: true },
    );
}
async function lockImport(c, entity) {
  const [[lock]] = await c.query(
    "SELECT GET_LOCK(CONCAT('crm-import:',LEFT(SHA2(CONCAT(DATABASE(),?),256),40)),10) acquired",
    [entity],
  );
  if (!lock.acquired)
    fail(409, "Đang có lượt nhập dữ liệu cùng loại. Vui lòng thử lại sau.");
}
async function unlockImport(c, entity) {
  await c.query(
    "SELECT RELEASE_LOCK(CONCAT('crm-import:',LEFT(SHA2(CONCAT(DATABASE(),?),256),40)))",
    [entity],
  );
}
module.exports = {
  rejectExactCustomer,
  rejectExactLead,
  lockImport,
  unlockImport,
};
