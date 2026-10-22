const { db } = require("./store");
const { fail, id } = require("./http");
const matrix = require("../config/roleMatrix");
const aliases = {
  admin: "Admin",
  administrator: "Admin",
  "quản trị hệ thống": "Admin",
  director: "Director",
  "giám đốc kinh doanh": "Director",
  "team lead": "Team Lead",
  "team leader": "Team Lead",
  team_lead: "Team Lead",
  "trưởng nhóm kinh doanh": "Team Lead",
  "sales rep": "Sales Rep",
  sales_rep: "Sales Rep",
  sales: "Sales Rep",
  employee: "Sales Rep",
  "sales executive": "Sales Rep",
  "nhân viên kinh doanh": "Sales Rep",
  marketing: "Marketing",
  "nhân viên marketing": "Marketing",
  "cust. success": "Cust. Success",
  customer_success: "Cust. Success",
  "chăm sóc khách hàng": "Cust. Success",
  accountant: "Accountant",
  "kế toán": "Accountant",
};
const normalizeRole = (value) =>
  aliases[
    String(value || "")
      .trim()
      .toLowerCase()
  ] || null;
const has = (user, ...roles) =>
  (user.roles || []).some((r) => roles.includes(r));
function permission(user, module, write = false) {
  const grants = (user.roles || [])
    .map((r) => ({ role: r, grant: matrix[module]?.[r] || "N" }))
    .filter((x) => x.grant !== "N" && (!write || /^[FW]/.test(x.grant)));
  if (!grants.length) fail(403, "Bạn không có quyền thực hiện thao tác này.");
  return grants;
}
function authorize(module) {
  return (req, res, next) => {
    try {
      permission(
        req.user,
        module,
        !["GET", "HEAD", "OPTIONS"].includes(req.method),
      );
      next();
    } catch (e) {
      next(e);
    }
  };
}
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!has(req.user, ...roles))
      return next(
        Object.assign(new Error("Bạn không có quyền thực hiện thao tác này."), {
          status: 403,
        }),
      );
    next();
  };
}
async function groups(user, c = db) {
  if (!user.group_id) return [];
  const [rows] = await c.query(
    "WITH RECURSIVE tree AS (SELECT id FROM `groups` WHERE id=? UNION DISTINCT SELECT g.id FROM `groups` g JOIN tree t ON g.parent_id=t.id) SELECT id FROM tree",
    [user.group_id],
  );
  return rows.map((r) => r.id);
}
async function scope(
  user,
  module,
  alias = "",
  write = false,
  c = db,
  owner = "created_by",
) {
  const grants = permission(user, module, write);
  const prefix = alias ? `${alias}.` : "";
  // Team leads are bounded by their organisation even where the module grants F.
  if (grants.some((x) => x.role !== "Team Lead" && !x.grant.includes("*")))
    return { sql: "1=1", params: [], name: "ALL" };
  if (grants.some((x) => x.role === "Team Lead")) {
    const ids = await groups(user, c);
    return {
      sql: `(${prefix}${owner}=?${ids.length ? ` OR ${prefix}${owner} IN (SELECT scope_user.id FROM users scope_user WHERE scope_user.group_id IN (${ids.map(() => "?").join(",")}))` : ""}${module === "LEAD" ? ` OR (${prefix}owner_id IS NULL AND (${prefix}group_id IS NULL${ids.length ? ` OR ${prefix}group_id IN (${ids.map(() => "?").join(",")})` : ""}))` : ""})`,
      params: [user.id, ...ids, ...(module === "LEAD" ? ids : [])],
      name: "GROUP",
    };
  }
  return { sql: `${prefix}${owner}=?`, params: [user.id], name: "OWN" };
}
async function record(
  c,
  user,
  module,
  table,
  rowId,
  write = false,
  owner = "created_by",
  lock = false,
) {
  rowId = id(rowId);
  const s = await scope(user, module, "", write, c, owner);
  const [rows] = await c.query(
    `SELECT * FROM \`${table}\` WHERE id=? AND (${s.sql})${lock ? " FOR UPDATE" : ""}`,
    [rowId, ...s.params],
  );
  if (!rows.length)
    fail(
      403,
      "Từ chối truy cập: Đây là dữ liệu riêng của nhân viên khác, bạn không có quyền xem!",
    );
  return rows[0];
}
async function ownerAllowed(c, user, module, ownerId) {
  const [rows] = await c.query(
    "SELECT id,group_id,is_active,status FROM users WHERE id=?",
    [id(ownerId)],
  );
  if (
    !rows.length ||
    !rows[0].is_active ||
    ["inactive", "Đã khóa"].includes(rows[0].status)
  )
    fail(400, "Người tiếp nhận không hoạt động.");
  const s = await scope(user, module, "", true, c);
  if (s.name === "OWN" && Number(ownerId) !== user.id)
    fail(403, "Không được giao dữ liệu ngoài phạm vi.");
  if (
    s.name === "GROUP" &&
    Number(ownerId) !== user.id &&
    !(await groups(user, c)).includes(rows[0].group_id)
  )
    fail(403, "Người tiếp nhận không thuộc nhóm quản lý.");
  return rows[0];
}
module.exports = {
  normalizeRole,
  has,
  permission,
  authorize,
  requireRoles,
  scope,
  record,
  ownerAllowed,
  groups,
};
