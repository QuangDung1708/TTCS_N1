const pool = require('../db');
// Lấy danh sách audit logs có hỗ trợ lọc và phân trang
const getAuditLogs = async (req, res) => {
    try {
        let { user_id, target_entity, start_date, end_date, page, limit } = req.query;

        // Xử lý phân trang mặc định (page = 1, limit = 10)
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        let queryParams = [];

        // Lọc theo người dùng (user_id)
        if (user_id) {
            query += ' AND user_id = ?';
            queryParams.push(user_id);
        }

        // Lọc theo loại đối tượng (target_entity)
        if (target_entity) {
            query += ' AND target_entity = ?';
            queryParams.push(target_entity);
        }

        // Lọc theo khoảng thời gian (start_date và end_date)
        if (start_date) {
            query += ' AND created_at >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            query += ' AND created_at <= ?';
            queryParams.push(end_date);
        }

        // Thêm sắp xếp mới nhất lên đầu và phân trang (LIMIT / OFFSET)
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const [rows] = await pool.query(query, queryParams);

        // Lấy tổng số bản ghi để phục vụ việc phân trang ở frontend
        let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
        let countParams = [];
        if (user_id) {
            countQuery += ' AND user_id = ?';
            countParams.push(user_id);
        }
        if (target_entity) {
            countQuery += ' AND target_entity = ?';
            countParams.push(target_entity);
        }
        if (start_date) {
            countQuery += ' AND created_at >= ?';
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ' AND created_at <= ?';
            countParams.push(end_date);
        }

        const [countRows] = await pool.query(countQuery, countParams);
        const totalRecords = countRows[0].total;

        res.json({
            success: true,
            pagination: {
                total: totalRecords,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalRecords / limit)
            },
            data: rows
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAuditLogs
};