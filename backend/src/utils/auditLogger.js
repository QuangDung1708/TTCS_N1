const db = require('../config/db');

// Hàm ghi log độc lập, có cơ chế bắt lỗi tuyệt đối không để crash server
const logAudit = async (data) => {
    try {
        if (!db) return;
        const { userName, actionType, entityType, entityId, beforeValue, afterValue, description } = data;
        
        await db.execute(`
            INSERT INTO audit_logs (user_name, action_type, entity_type, entity_id, before_value, after_value, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            userName || 'Quản trị viên',
            actionType || 'UPDATE',
            entityType || 'Hệ thống',
            entityId || null,
            beforeValue || null,
            afterValue || null,
            description || ''
        ]);
    } catch (err) {
        console.warn('Ghi log phụ thất bại (tiến trình chính vẫn an toàn):', err.message);
    }
};

module.exports = { logAudit };