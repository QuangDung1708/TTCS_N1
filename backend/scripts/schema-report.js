// Metadata only: no customer records or credential values are printed.
require("dotenv").config();
const { db } = require("../src/core/store");
const { schema } = require("../sql/migrate");
(async () => {
  const report = { database: process.env.DB_NAME || "crm_db", tables: [] };
  for (const [table, columns] of Object.entries(schema)) {
    const [rows] = await db.query(
      "SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
      [table],
    );
    report.tables.push({
      table,
      exists: !!rows.length,
      missingColumns: Object.keys(columns).filter(
        (k) => !rows.some((r) => r.COLUMN_NAME === k),
      ),
      columns: rows,
    });
  }
  console.log(JSON.stringify(report, null, 2));
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
