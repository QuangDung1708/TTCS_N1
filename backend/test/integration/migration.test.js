const h = require("./helpers");
const { migrate, schema } = require("../../sql/migrate");
const fs = require("fs");
const path = require("path");
afterAll(() => h.db.end());
async function originalSchema() {
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
}
test("Additive MySQL migration preserves original repository schema data and is repeatable", async () => {
  await originalSchema();
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

async function collidingGroups() {
  await originalSchema();
  await h.db.query(
    "CREATE TABLE `groups` (id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100),description TEXT) ENGINE=InnoDB",
  );
  await h.db.query(
    "INSERT INTO `groups` (id,name) VALUES (2,'Canonical team')",
  );
  await h.db.query(
    "INSERT INTO groups_table (id,group_name,description) VALUES (2,'Different legacy team','Legacy description')",
  );
  await h.db.query("UPDATE users SET group_id=2 WHERE id=1");
  await h.db.query(
    "CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY,company_name VARCHAR(255),group_id INT) ENGINE=InnoDB",
  );
  await h.db.query(
    "INSERT INTO customers (id,company_name,group_id) VALUES (41,'Existing customer',2)",
  );
}
test("Colliding legacy group IDs preserve both groups, canonical customers and the user's actual legacy membership", async () => {
  await collidingGroups();
  await migrate();
  await migrate();
  const [groups] = await h.db.query("SELECT id,name FROM `groups` ORDER BY id");
  expect(groups).toEqual([
    { id: 2, name: "Canonical team" },
    { id: 7, name: "Legacy team" },
    { id: 8, name: "Different legacy team" },
  ]);
  const [[user]] = await h.db.query("SELECT group_id FROM users WHERE id=1");
  expect(user.group_id).toBe(8);
  const [[customer]] = await h.db.query(
    "SELECT group_id FROM customers WHERE id=41",
  );
  expect(customer.group_id).toBe(2);
  const [[legacy]] = await h.db.query(
    "SELECT group_name FROM groups_table WHERE id=2",
  );
  expect(legacy.group_name).toBe("Different legacy team");
  const [[fk]] = await h.db.query(
    "SELECT REFERENCED_TABLE_NAME target FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='group_id' AND REFERENCED_TABLE_NAME IS NOT NULL",
  );
  expect(fk.target).toBe("groups");
  await h.db.query("DROP TABLE groups_table");
});
test("A checkpoint resumes after the legacy FK was dropped without mapping users twice", async () => {
  await collidingGroups();
  await migrate();
  const [fks] = await h.db.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='group_id' AND REFERENCED_TABLE_NAME='groups'",
  );
  for (const fk of fks)
    await h.db.query(
      "ALTER TABLE users DROP FOREIGN KEY " + h.db.escapeId(fk.CONSTRAINT_NAME),
    );
  // Recreate the durable state immediately after the old FK's implicit commit.
  await h.db.query("UPDATE users SET group_id=2 WHERE id=1");
  await h.db.query("UPDATE crm_legacy_group_map SET users_remapped=0");
  await migrate();
  await migrate();
  const [[user]] = await h.db.query("SELECT group_id FROM users WHERE id=1");
  expect(user.group_id).toBe(8);
  const [[count]] = await h.db.query("SELECT COUNT(*) n FROM `groups`");
  expect(count.n).toBe(3);
  await h.db.query("DROP TABLE groups_table");
});
test("Ambiguous membership without either FK stops instead of guessing a role scope", async () => {
  await collidingGroups();
  const [fks] = await h.db.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='group_id' AND REFERENCED_TABLE_NAME='groups_table'",
  );
  for (const fk of fks)
    await h.db.query(
      "ALTER TABLE users DROP FOREIGN KEY " + h.db.escapeId(fk.CONSTRAINT_NAME),
    );
  await expect(migrate()).rejects.toThrow("Ambiguous users.group_id");
  const [[user]] = await h.db.query("SELECT group_id FROM users WHERE id=1");
  expect(user.group_id).toBe(2);
  const [[group]] = await h.db.query("SELECT name FROM `groups` WHERE id=2");
  expect(group.name).toBe("Canonical team");
  await h.db.query("DROP TABLE groups_table");
});
