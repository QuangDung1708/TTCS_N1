const h = require("./helpers");
const { migrate, schema } = require("../../sql/migrate");
const fs = require("fs");
const path = require("path");
const { ensureForeignKey } = require("../../sql/ensure-foreign-key");
afterAll(async () => {
  try {
    // Failure fixtures deliberately leave invalid links/types. Restore this
    // guarded disposable DB before another integration suite starts.
    await originalSchema();
    await migrate();
    await h.db.query("DROP TABLE groups_table");
  } finally {
    await h.db.end();
  }
});
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

async function dropLeadHistoryFk() {
  const [fks] = await h.db.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_activities' AND COLUMN_NAME='lead_id' AND REFERENCED_TABLE_NAME='leads'",
  );
  for (const fk of fks)
    await h.db.query(
      "ALTER TABLE lead_activities DROP FOREIGN KEY " +
        h.db.escapeId(fk.CONSTRAINT_NAME),
    );
}
test.each(["INT UNSIGNED", "BIGINT UNSIGNED"])(
  "Migration aligns an empty lead history to an existing %s lead ID and remains repeatable",
  async (type) => {
    await originalSchema();
    await migrate();
    await dropLeadHistoryFk();
    await h.db.query(
      `ALTER TABLE leads MODIFY id ${type} NOT NULL AUTO_INCREMENT`,
    );
    // Reproduce the old migration's actual FK failure before exercising the fix.
    await expect(
      h.db.query(
        "ALTER TABLE lead_activities ADD CONSTRAINT fk_reproduction FOREIGN KEY (lead_id) REFERENCES leads(id)",
      ),
    ).rejects.toThrow();
    await h.db.query(
      "INSERT INTO leads (id,full_name) VALUES (2147483650,'Existing lead')",
    );
    await migrate();
    await migrate();
    await h.db.query(
      "INSERT INTO lead_activities (lead_id,activity_type,content) VALUES (2147483650,'NOTE','Preserved history')",
    );
    const [[row]] = await h.db.query(
      "SELECT l.full_name,a.content FROM lead_activities a JOIN leads l ON l.id=a.lead_id",
    );
    expect(row).toEqual({
      full_name: "Existing lead",
      content: "Preserved history",
    });
    await expect(
      h.db.query(
        "INSERT INTO lead_activities (lead_id,activity_type,content) VALUES (123,'NOTE','Orphan')",
      ),
    ).rejects.toThrow();
    await h.db.query("DROP TABLE groups_table");
  },
);
test("Integer alignment preserves populated history, nullability, default and comment", async () => {
  await originalSchema();
  await migrate();
  await dropLeadHistoryFk();
  await h.db.query(
    "ALTER TABLE leads MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
  );
  await h.db.query(
    "ALTER TABLE lead_activities MODIFY lead_id BIGINT NOT NULL DEFAULT 9 COMMENT 'Original association'",
  );
  await h.db.query(
    "INSERT INTO leads (id,full_name) VALUES (9,'Retained lead')",
  );
  await h.db.query(
    "INSERT INTO lead_activities (activity_type,content) VALUES ('NOTE','Do not lose this')",
  );
  await migrate();
  const [[row]] = await h.db.query(
    "SELECT lead_id,content FROM lead_activities",
  );
  expect(row).toEqual({ lead_id: 9, content: "Do not lose this" });
  const [[col]] = await h.db.query(
    "SHOW FULL COLUMNS FROM lead_activities WHERE Field='lead_id'",
  );
  expect(col.Type).toMatch(/bigint.*unsigned/);
  expect(col.Null).toBe("NO");
  expect(String(col.Default)).toBe("9");
  expect(col.Comment).toBe("Original association");
  await h.db.query("DROP TABLE groups_table");
});
test("Migration refuses to narrow populated IDs and preserves orphaned history", async () => {
  await originalSchema();
  await migrate();
  await dropLeadHistoryFk();
  await h.db.query(
    "ALTER TABLE lead_activities MODIFY lead_id BIGINT NOT NULL",
  );
  await h.db.query(
    "INSERT INTO lead_activities (lead_id,activity_type,content) VALUES (2147483650,'NOTE','Unresolved orphan')",
  );
  await expect(migrate()).rejects.toThrow(
    "would narrow a populated integer column",
  );
  const [[row]] = await h.db.query(
    "SELECT lead_id,content FROM lead_activities",
  );
  expect(row).toEqual({ lead_id: 2147483650, content: "Unresolved orphan" });
  await h.db.query("DROP TABLE groups_table");
});
test("Negative signed IDs are rejected before an unsigned conversion can change stored data", async () => {
  await originalSchema();
  await migrate();
  await dropLeadHistoryFk();
  await h.db.query(
    "ALTER TABLE leads MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT",
  );
  await h.db.query(
    "INSERT INTO lead_activities (lead_id,activity_type,content) VALUES (-1,'NOTE','Negative association')",
  );
  await expect(migrate()).rejects.toThrow(
    "stored values are outside the parent integer range",
  );
  const [[row]] = await h.db.query(
    "SELECT lead_id,content FROM lead_activities",
  );
  expect(row).toEqual({ lead_id: -1, content: "Negative association" });
  await h.db.query("DROP TABLE groups_table");
});
test("Unsupported storage engines produce a precise diagnosis without conversion or deletion", async () => {
  await h.db.query(
    "CREATE TABLE crm_test_fk_parent (id INT PRIMARY KEY) ENGINE=MyISAM",
  );
  await h.db.query(
    "CREATE TABLE crm_test_fk_child (id INT PRIMARY KEY,parent_id INT) ENGINE=InnoDB",
  );
  const c = await h.db.getConnection();
  try {
    await expect(
      ensureForeignKey(
        c,
        "crm_test_fk_child",
        "parent_id",
        "crm_test_fk_parent",
      ),
    ).rejects.toThrow("both tables must use InnoDB");
    const [[row]] = await c.query(
      "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='crm_test_fk_parent'",
    );
    expect(row.ENGINE).toBe("MyISAM");
  } finally {
    c.release();
    await h.db.query("DROP TABLE crm_test_fk_child,crm_test_fk_parent");
  }
});
