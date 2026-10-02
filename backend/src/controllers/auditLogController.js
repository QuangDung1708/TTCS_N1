const db = require('../config/db');

// Lấy danh sách nhật ký thay đổi có lọc đa tiêu chí & phân trang
exports.getAuditLogs = async (req, res) => {
    try {
        let { page = 1, limit = 15, user_id, target_type, start_date, end_date } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 15;
        const offset = (page - 1) * limit;

        let whereClauses = ['1=1'];
        let queryParams = [];

        // Lọc theo người thực hiện
        if (user_id) {
            whereClauses.push('a.user_id = ?');
            queryParams.push(user_id);
        }

        // Lọc theo loại đối tượng (USER, CUSTOMER, KPI...)
        if (target_type) {
            whereClauses.push('a.target_type = ?');
            queryParams.push(target_type);
        }

        // Lọc theo khoảng thời gian (Từ ngày - Đến ngày)
        if (start_date) {
            whereClauses.push('a.created_at >= ?');
            queryParams.push(`${start_date} 00:00:00`);
        }
        if (end_date) {
            whereClauses.push('a.created_at <= ?');
            queryParams.push(`${end_date} 23:59:59`);
        }

        const whereSql = whereClauses.join(' AND ');

        // Đếm tổng số bản ghi
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM audit_logs a WHERE ${whereSql}`,
            queryParams
        );
        const total = countResult[0].total;

        // Truy vấn dữ liệu có phân trang
        const dataQuery = `
            SELECT a.*, u.full_name as executor_name, u.email as executor_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE ${whereSql}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        // MySQL driver cần tham số LIMIT/OFFSET dạng số nguyên
        const [logs] = await db.execute(dataQuery, [...queryParams, limit.toString(), offset.toString()]);

        return res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: logs
        });
    } catch (error) {
        console.error('Lỗi lấy Audit Logs:', error);
        return res.status(500).json({ message: 'Không thể tải nhật ký thay đổi!' });
    }
};