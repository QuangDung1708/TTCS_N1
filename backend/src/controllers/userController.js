const db = require('../config/db');

/**
 * [GET] /api/users
 * Lấy danh sách tài khoản kèm tính năng tìm kiếm, lọc và phân trang
 * Query parameters:
 *   - page: số trang hiện tại (mặc định: 1)
 *   - limit: số dòng trên mỗi trang (mặc định: 10)
 *   - search: từ khóa tìm kiếm (theo username hoặc email)
 *   - role: lọc theo vai trò (admin, user, ...)
 *   - status: lọc theo trạng thái (active, inactive, locked, ...)
 */
exports.getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

    // Chuẩn hóa kiểu dữ liệu số nguyên dương
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (page - 1) * limit;

    // Xây dựng câu lệnh WHERE động
    const conditions = [];
    const params = [];

    // Tìm kiếm tương đối (username hoặc email)
  const keyword = typeof search === 'string' ? search.trim() : (Array.isArray(search) ? String(search[0]).trim() : '');

if (keyword !== '') {
  conditions.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
  const searchPattern = `%${keyword}%`;
  params.push(searchPattern, searchPattern, searchPattern);
}

    // Lọc theo vai trò (role)
    if (role && role.trim() !== '') {
      conditions.push('u.role = ?');
      params.push(role.trim());
    }

    // Lọc theo trạng thái (status)
    if (status && status.trim() !== '') {
      conditions.push('u.status = ?');
      params.push(status.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Đếm tổng số bản ghi thỏa mãn điều kiện lọc
    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const [countRows] = await db.query(countSql, params);
    const totalRows = countRows[0] ? countRows[0].total : 0;
    const totalPages = Math.ceil(totalRows / limit);

    // 2. Truy vấn danh sách người dùng cho trang hiện tại
  const dataSql = `
  SELECT 
    u.id, 
    u.full_name, 
    u.email, 
    u.phone, 
    u.role_id, 
    u.group_id, 
    u.created_at
  FROM users u
  ${whereClause}
  ORDER BY u.id DESC
  LIMIT ? OFFSET ?
`;
    const [users] = await db.query(dataSql, [...params, limit, offset]);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: users,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages
      }
    });
  } catch (error) {
    console.error('Lỗi tại getUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ',
      error: error.message
    });
  }
};