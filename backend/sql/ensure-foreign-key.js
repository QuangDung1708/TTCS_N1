function integerType(type) {
  const m =
    /^(tinyint|smallint|mediumint|int|bigint)(?:\(\d+\))?( unsigned)?$/i.exec(
      type,
    );
  if (!m) return null;
  const bits = { tinyint: 8, smallint: 16, mediumint: 24, int: 32, bigint: 64 }[
    m[1].toLowerCase()
  ];
  const unsigned = Boolean(m[2]);
  return {
    bits,
    unsigned,
    min: unsigned ? 0n : -(1n << BigInt(bits - 1)),
    max: (1n << BigInt(unsigned ? bits : bits - 1)) - 1n,
  };
}
async function ensureForeignKey(c, table, column, parent) {
  const [existing] = await c.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME=? AND REFERENCED_COLUMN_NAME='id'",
    [table, column, parent],
  );
  if (existing.length) return;
  const q = (name) => c.escapeId(name);
  const [[child]] = await c.query(
    `SHOW FULL COLUMNS FROM ${q(table)} WHERE Field=?`,
    [column],
  );
  const [[target]] = await c.query(
    `SHOW FULL COLUMNS FROM ${q(parent)} WHERE Field='id'`,
  );
  const [tables] = await c.query(
    "SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?)",
    [table, parent],
  );
  const engines = Object.fromEntries(
    tables.map((t) => [t.TABLE_NAME, t.ENGINE]),
  );
  const context = `${table}.${column} (${child?.Type || "missing"}, ${engines[table]}) -> ${parent}.id (${target?.Type || "missing"}, ${engines[parent]})`;
  const fail = (reason) => {
    throw new Error(
      `Cannot add foreign key ${context}: ${reason}. Existing records were preserved.`,
    );
  };
  if (!child || !target) fail("missing column");
  if (
    engines[table]?.toLowerCase() !== "innodb" ||
    engines[parent]?.toLowerCase() !== "innodb"
  )
    fail(
      "both tables must use InnoDB; storage engines were not changed automatically",
    );
  const [parentIndexes] = await c.query(`SHOW INDEX FROM ${q(parent)}`);
  if (
    !parentIndexes.some(
      (i) =>
        i.Column_name === "id" &&
        !i.Non_unique &&
        Number(i.Seq_in_index) === 1 &&
        parentIndexes.filter((j) => j.Key_name === i.Key_name).length === 1,
    )
  )
    fail("parent id must have a single-column PRIMARY or UNIQUE index");
  const sourceType = integerType(child.Type),
    targetType = integerType(target.Type);
  if (!sourceType || !targetType)
    fail("only integer ID columns can be aligned automatically");
  if (
    sourceType.bits !== targetType.bits ||
    sourceType.unsigned !== targetType.unsigned
  ) {
    const [dependencies] = await c.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL) OR (REFERENCED_TABLE_NAME=? AND REFERENCED_COLUMN_NAME=?))",
      [table, column, table, column],
    );
    if (dependencies.length)
      fail(
        "child column already participates in another foreign key; it was not changed",
      );
    const [[range]] = await c.query(
      `SELECT CAST(MIN(${q(column)}) AS CHAR) min_value,CAST(MAX(${q(column)}) AS CHAR) max_value,COUNT(*) n FROM ${q(table)}`,
    );
    if (range.n && targetType.bits < sourceType.bits)
      fail("conversion would narrow a populated integer column");
    if (
      range.min_value !== null &&
      (BigInt(range.min_value) < targetType.min ||
        BigInt(range.max_value) > targetType.max)
    )
      fail("stored values are outside the parent integer range");
    if (
      child.Extra ||
      (child.Default !== null && !/^-?\d+$/.test(String(child.Default)))
    )
      fail(
        "generated attributes or expression defaults require explicit review",
      );
    if (
      child.Default !== null &&
      (BigInt(child.Default) < targetType.min ||
        BigInt(child.Default) > targetType.max)
    )
      fail("column default is outside the parent integer range");
    const defaultSql =
      child.Default === null
        ? child.Null === "YES"
          ? " DEFAULT NULL"
          : ""
        : ` DEFAULT ${c.escape(child.Default)}`;
    await c.query(
      `ALTER TABLE ${q(table)} MODIFY COLUMN ${q(column)} ${target.Type} ${child.Null === "YES" ? "NULL" : "NOT NULL"}${defaultSql} COMMENT ${c.escape(child.Comment)}`,
    );
  }
  const [[orphans]] = await c.query(
    `SELECT COUNT(*) n FROM ${q(table)} child LEFT JOIN ${q(parent)} parent ON parent.id=child.${q(column)} WHERE child.${q(column)} IS NOT NULL AND parent.id IS NULL`,
  );
  if (orphans.n) fail(`${orphans.n} orphaned records`);
  try {
    await c.query(
      `ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(`fk_crm_${table}_${column}`)} FOREIGN KEY (${q(column)}) REFERENCES ${q(parent)} (id) ON DELETE RESTRICT`,
    );
  } catch (e) {
    fail(
      `${e.code || "SQL_ERROR"} (errno ${e.errno || "unknown"}) while creating the constraint`,
    );
  }
}
module.exports = { ensureForeignKey };
