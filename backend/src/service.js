const crypto = require("node:crypto");
const { hashPassword } = require("./store");
const { parse, validate, safeRow, fail, report } = require("./excel");
function createService({ store, now = Date.now }) {
  const plans = new Map();
  let queue = Promise.resolve();
  function cleanup() {
    for (const [id, p] of plans) if (p.expiresAt <= now()) plans.delete(id);
  }
  function getPlan(id) {
    cleanup();
    if (typeof id !== "string" || !plans.has(id))
      throw fail(
        "Bản xem trước không tồn tại hoặc đã hết hạn. Vui lòng chọn lại tệp.",
        410,
      );
    return plans.get(id);
  }
  async function preview(buffer) {
    cleanup();
    if (plans.size >= 20)
      throw fail("Đang có quá nhiều bản xem trước. Vui lòng thử lại sau.", 429);
    const raw = await parse(buffer);
    // Recheck after parsing to enforce the cap for parallel uploads too.
    cleanup();
    if (plans.size >= 20)
      throw fail("Đang có quá nhiều bản xem trước. Vui lòng thử lại sau.", 429);
    const checked = validate(raw, store.state.users);
    const id = crypto.randomBytes(24).toString("hex");
    const expiresAt = now() + 15 * 60_000;
    plans.set(id, { raw, checked, expiresAt, result: null });
    const rows = checked.map(safeRow);
    return {
      previewId: id,
      expiresAt,
      total: rows.length,
      valid: rows.filter((r) => r.valid).length,
      invalid: rows.filter((r) => !r.valid).length,
      rows,
    };
  }
  async function execute(id) {
    const operation = queue.then(async () => {
      const plan = getPlan(id);
      if (plan.result) return plan.result;
      // Do not trust preview: DB may have changed since upload.
      const checked = validate(plan.raw, store.state.users);
      const created = [];
      const rows = [];
      for (const row of checked) {
        if (!row.valid) {
          rows.push({ ...safeRow(row), status: "SKIPPED" });
          continue;
        }
        created.push({
          id: crypto.randomUUID(),
          name: row.name,
          email: row.email,
          passwordHash: await hashPassword(row.password),
          role: row.role,
          group: row.group,
          phone: row.phone,
          createdAt: new Date(now()).toISOString(),
        });
        rows.push({ ...safeRow(row), status: "IMPORTED" });
      }
      if (!created.length)
        throw fail(
          "Không có dòng hợp lệ để nhập. Hãy sửa tệp và kiểm tra lại.",
          422,
        );
      store.append(created);
      plan.raw = []; // Drop temporary plaintext passwords once import has finished.
      plan.checked = [];
      plan.result = {
        total: rows.length,
        imported: created.length,
        skipped: rows.length - created.length,
        rows,
      };
      return plan.result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  async function downloadReport(id) {
    const plan = getPlan(id);
    return report(plan.result ? plan.result.rows : plan.checked.map(safeRow));
  }
  return { preview, execute, downloadReport };
}
module.exports = { createService };
