// backend/controllers/filterController.js
// Giả sử dự án dùng pool kết nối PostgreSQL hoặc MySQL tương tự
const db = require('../config/db'); 

const getFilteredData = async (req, res) => {
    try {
        const { industry, size, owner, tax_code, phone } = req.query;

        // Xây dựng câu truy vấn động an toàn tránh SQL Injection
        let query = 'SELECT * FROM companies WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        if (industry) {
            query += ` AND industry = $${paramIndex++}`;
            params.push(industry);
        }

        if (size) {
            query += ` AND size = $${paramIndex++}`;
            params.push(size);
        }

        if (owner) {
            query += ` AND owner ILIKE $${paramIndex++}`; // Sử dụng ILIKE để tìm kiếm không phân biệt hoa thường (PostgreSQL)
            params.push(`%${owner}%`);
        }

        if (tax_code) {
            query += ` AND tax_code = $${paramIndex++}`;
            params.push(tax_code);
        }

        if (phone) {
            query += ` AND phone LIKE $${paramIndex++}`;
            params.push(`%${phone}%`);
        }

        query += ' ORDER BY id DESC';

        const result = await db.query(query, params);
        
        return res.status(200).json({
            success: true,
            message: 'Lọc dữ liệu thành công',
            total: result.rows ? result.rows.length : result.length,
            data: result.rows || result
        });
    } catch (error) {
        console.error('Lỗi khi dynamic query:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lọc dữ liệu' });
    }
};

module.exports = {
    getFilteredData
};