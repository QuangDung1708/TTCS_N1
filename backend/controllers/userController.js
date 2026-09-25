const pool = require('../db');

// Controller: Lấy danh sách users có phân trang và tìm kiếm
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search ? req.query.search.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];

    if (search) {
      whereClause = 'WHERE email LIKE ? OR full_name LIKE ?';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // 1. Đếm tổng số bản ghi
    const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // 2. Lấy danh sách users tối giản (không dùng created_at)
    const dataSql = `
      SELECT 
        id, 
        email, 
        full_name, 
        role_id
      FROM users
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [users] = await pool.query(dataSql, [...queryParams, limit, offset]);

    // 3. Chuẩn hóa response theo yêu cầu: bọc trong meta và có message
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách thành công',
      data: users,
      meta: {
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: page
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy danh sách users:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
};

module.exports = {
  getUsers
};