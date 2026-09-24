const express = require('express');
const router = express.Router();
const pool = require('../db'); // Import kết nối database từ file db.js

// Import 2 middleware xác thực và phân quyền (chỉnh đường dẫn nếu file auth của bạn nằm ở thư mục khác)
const { verifyToken, checkRole } = require('../middlewares/auth');

// GET /api/users
router.get('/', verifyToken, checkRole(['Admin']), async (req, res) => {
  try {
    // 1. Lấy và chuẩn hoá Query Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search ? req.query.search.trim() : '';
    const offset = (page - 1) * limit;

    // 2. Xây dựng điều kiện lọc tìm kiếm linh hoạt
    let whereClause = '';
    const queryParams = [];
    const countParams = [];

    if (search) {
      whereClause = ' WHERE u.email LIKE ? OR u.full_name LIKE ?';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
    }

// 3. Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*) AS total FROM users u${whereClause}`;
    const [countRows] = await pool.query(countSql, countParams);
    const total_records = countRows[0].total;
    const total_pages = Math.ceil(total_records / limit);

   // 4. Lấy dữ liệu JOIN bảng users, roles và groups
    const dataSql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        r.name AS role_name,
        g.name AS group_name,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN \`groups\` g ON u.group_id = g.id
      ${whereClause}
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    const [users] = await pool.query(dataSql, queryParams);

    // 5. Trả kết quả JSON chuẩn format
    return res.status(200).json({
      success: true,
      data: users,
      total_records,
      total_pages,
      current_page: page
    });

  } catch (error) {
    console.error('GET /api/users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server'
    });
  }
});

module.exports = router;