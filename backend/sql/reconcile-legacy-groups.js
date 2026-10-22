// Called with the migration advisory lock held and the application stopped.
// DML checkpoints survive the implicit commits caused by ALTER TABLE.
async function reconcileLegacyGroups(c) {
  const [tables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='groups_table'",
  );
  if (!tables.length) return;
  const [references] = await c.query(
    "SELECT TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME='groups_table'",
  );
  if (
    references.some(
      (r) => r.TABLE_NAME !== "users" || r.COLUMN_NAME !== "group_id",
    )
  )
    throw new Error(
      "Unsupported references to groups_table; no group links were changed.",
    );
  const [canonical] = await c.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='group_id' AND REFERENCED_TABLE_NAME='groups'",
  );
  if (references.length && canonical.length)
    throw new Error(
      "users.group_id references both group tables; resolve ambiguous constraints before migration.",
    );
  const [legacy] = await c.query(
    "SELECT id,group_name,description FROM groups_table ORDER BY id",
  );
  const [[limits]] = await c.query(
    "SELECT GREATEST(COALESCE((SELECT MAX(id) FROM `groups`),0),COALESCE((SELECT MAX(id) FROM groups_table),0))+1 next_id",
  );
  let nextId = Number(limits.next_id);
  await c.beginTransaction();
  try {
    for (const g of legacy) {
      const [[mapping]] = await c.query(
        "SELECT * FROM crm_legacy_group_map WHERE legacy_group_id=?",
        [g.id],
      );
      if (mapping) {
        const [[target]] = await c.query("SELECT id FROM `groups` WHERE id=?", [
          mapping.group_id,
        ]);
        if (!target)
          throw new Error("Missing mapped group for legacy ID " + g.id);
        continue;
      }
      const [[existing]] = await c.query(
        "SELECT id,name FROM `groups` WHERE id=?",
        [g.id],
      );
      if (
        existing &&
        existing.name !== g.group_name &&
        !references.length &&
        !canonical.length
      ) {
        const [[users]] = await c.query(
          "SELECT COUNT(*) n FROM users WHERE group_id=?",
          [g.id],
        );
        if (users.n)
          throw new Error(
            "Ambiguous users.group_id without a foreign key for legacy group " +
              g.id +
              "; group links were preserved.",
          );
      }
      // A colliding ID is a different group. Preserve the canonical group and
      // reserve a fresh ID above BOTH tables, including unprocessed legacy IDs.
      const targetId =
        existing && existing.name !== g.group_name ? nextId++ : g.id;
      if (!existing || targetId !== g.id)
        await c.query(
          "INSERT INTO `groups` (id,name,description) VALUES (?,?,?)",
          [targetId, g.group_name, g.description],
        );
      await c.query(
        "INSERT INTO crm_legacy_group_map (legacy_group_id,group_id,remap_users) VALUES (?,?,?)",
        [g.id, targetId, references.length ? 1 : 0],
      );
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  }
  for (const fk of references)
    await c.query(
      "ALTER TABLE users DROP FOREIGN KEY " + c.escapeId(fk.CONSTRAINT_NAME),
    );
  await c.beginTransaction();
  try {
    // One joined update avoids accidentally mapping a newly assigned ID again.
    // The mapping and checkpoint are committed together, so reruns are safe
    // even if the process stopped after dropping the old FK.
    await c.query(
      "UPDATE users u JOIN crm_legacy_group_map m ON m.legacy_group_id=u.group_id SET u.group_id=m.group_id WHERE m.remap_users=1 AND m.users_remapped=0",
    );
    await c.query(
      "UPDATE crm_legacy_group_map SET users_remapped=1 WHERE remap_users=1 AND users_remapped=0",
    );
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  }
}
module.exports = { reconcileLegacyGroups };
