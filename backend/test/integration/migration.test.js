const h = require("./helpers");
const { migrate, schema } = require("../../sql/migrate");
const fs = require("fs");
const path = require("path");
afterAll(() => h.db.end());
test("Additive MySQL migration preserves original repository schema data and is repeatable", async () => {
  const c = await h.db.getConnection();
  try {
    await c.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of [...Object.keys(schema), "groups_table"])
      await c.query(`DROP TABLE IF EXISTS \`${table}\``);
    await c.query("SET FOREIGN_KEY_CHECKS=1");
    const sql = fs.readFileSync(
      path.join(__dirname, "../../sql/schema.sql"),
      "utf8",
    );
    // Use the original CREATE TABLE and INSERT statements only in the explicitly disposable DB.
    for (const part of sql.split(";")) {
      const statement = part
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();
      if (!statement || /^CREATE DATABASE|^USE /i.test(statement)) continue;
      await c.query(statement);
    }
    await c.query(
      "INSERT INTO groups_table (id,group_name) VALUES (7,'Legacy team')",
    );
    await c.query("UPDATE users SET group_id=7 WHERE id=1");
  } finally {
    c.release();
  }
  const [[before]] = await h.db.query(
    "SELECT email,password,full_name,group_id FROM users WHERE id=1",
  );
  const [products] = await h.db.query("SELECT * FROM products ORDER BY id");
  await migrate();
  await migrate();
  const [[after]] = await h.db.query(
    "SELECT email,password,full_name,group_id FROM users WHERE id=1",
  );
  expect(after).toEqual(before);
  const [retained] = await h.db.query(
    "SELECT id,code,name,list_price FROM products ORDER BY id",
  );
  expect(retained).toEqual(
    products.map(({ id, code, name, list_price }) => ({
      id,
      code,
      name,
      list_price,
    })),
  );
  const [[group]] = await h.db.query("SELECT name FROM `groups` WHERE id=7");
  expect(group.name).toBe("Legacy team");
  const [[role]] = await h.db.query(
    "SELECT role_code FROM user_roles WHERE user_id=1",
  );
  expect(role.role_code).toBe("Admin");
  const [[count]] = await h.db.query("SELECT COUNT(*) n FROM leads");
  expect(count.n).toBe(0);
  await h.db.query("DROP TABLE groups_table");
});
