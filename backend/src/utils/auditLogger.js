const db = require('../config/db');

/**
 * Hàm ghi nhật ký thay đổi dữ liệu nhạy cảm
 * @param {Object} logData
 * @param {number} logData.userId - ID người thao tác
 * @param {string} logData.userName - Tên người thao tác
 * @param {string} logData.action - Hành động (vd: UPDATE_ROLE, TRANSFER_OWNER)
 * @param {string} logData.targetType - Đối tượng (vd: USER, CUSTOMER)
 * @param {number} logData.targetId - ID đối tượng
 * @param {Object} logData.oldValue - Giá trị cũ
 * @param {Object} logData.newValue - Giá trị mới
 */
const logAudit = async ({ userId, userName, action, targetType, targetId, oldValue, newValue, ipAddress = null }) => {
    try {
        const query = `
            INSERT INTO audit_logs 
            (user_id, user_name, action, target_type, target_id, old_value, new_value, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.execute(query, [
            userId,
            userName || 'Hệ thống',
            action,
            targetType,
            targetId,
            JSON.stringify(oldValue),
            JSON.stringify(newValue),
            ipAddress
        ]);
    } catch (error) {
        console.error('❌ Lỗi khi ghi Audit Log:', error.message);
        // Không throw error để tránh làm sập luồng chính của người dùng
    }
};

module.exports = { logAudit };