const db = require("../config/db");
async function transaction(fn) {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
async function audit(
  c,
  user,
  action,
  entity,
  entityId,
  before,
  after,
  reason = null,
) {
  await c.execute(
    "INSERT INTO audit_logs (user_id,user_name,action_type,entity_type,entity_id,before_value,after_value,description) VALUES (?,?,?,?,?,?,?,?)",
    [
      user?.id || null,
      user?.full_name || "Hệ thống",
      action,
      entity,
      entityId || null,
      before == null ? null : JSON.stringify(before),
      after == null ? null : JSON.stringify(after),
      reason,
    ],
  );
}
async function legacyAliases(c, table, data) {
  const aliases = {
    customer_contacts: {
      name: "full_name",
      title: "position",
      buying_role: "decision_role",
    },
    products: { sku: "code" },
  };
  if (!aliases[table]) return data;
  const [columns] = await c.query(`SHOW COLUMNS FROM \`${table}\``);
  const compatible = { ...data };
  for (const [legacy, canonical] of Object.entries(aliases[table]))
    if (canonical in data && columns.some((column) => column.Field === legacy))
      compatible[legacy] = data[canonical];
  return compatible;
}
async function insert(c, table, data) {
  data = await legacyAliases(c, table, data);
  const keys = Object.keys(data);
  const [r] = await c.execute(
    `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    keys.map((k) => data[k] ?? null),
  );
  return r.insertId;
}
async function update(c, table, rowId, data) {
  data = await legacyAliases(c, table, data);
  const keys = Object.keys(data);
  if (!keys.length) return;
  await c.execute(
    `UPDATE \`${table}\` SET ${keys.map((k) => `\`${k}\`=?`).join(",")} WHERE id=?`,
    [...keys.map((k) => data[k] ?? null), rowId],
  );
}
module.exports = { db, transaction, audit, insert, update };
