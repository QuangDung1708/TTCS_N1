const pool = require('./db');

const logAudit = async ({ user_id, action, target_entity, target_id, old_value, new_value, ip_address }) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, target_entity, target_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(query, [
      user_id || null,
      action,
      target_entity || null,
      target_id || null,
      old_value || null,
      new_value || null,
      ip_address || null
    ]);
    console.log('✅ Đã ghi Audit Log thành công!');
  } catch (error) {
    console.error('❌ Lỗi ghi Audit Log:', error.message);
  }
};

module.exports = { logAudit };