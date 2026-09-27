const bcrypt = require('bcrypt');
const db = require('../db');

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
    const [countResult] = await db.query(countSql, queryParams);
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

    const [users] = await db.query(dataSql, [...queryParams, limit, offset]);

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
    console.error('Lỗi khi lấy danh sách user:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
};

// Controller xử lý tạo tài khoản người dùng
const createUser = async (req, res) => {
  try {
    const { email, full_name, password, phone, role_id, group_id } = req.body;

    // 1. Kiểm tra các trường bắt buộc
    if (!email || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ email và họ tên'
      });
    }

    // 2. Kiểm tra trùng email trong CSDL
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    // 3. Đặt mật khẩu và băm bằng bcrypt
    const rawPassword = password || '123456aA@';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

    // 4. Lưu user mới vào DB
    const insertSql = `
      INSERT INTO users (email, full_name, password, phone, role_id, group_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      email,
      full_name,
      hashedPassword,
      phone || null,
      role_id || null,
      group_id || null
    ]);

    // 5. In console thông báo
    console.log(`Đã tạo tài khoản cho ${email} với mật khẩu: ${rawPassword}`);

    // 6. Phản hồi 201 Created
    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng mới thành công',
      data: {
        userId: result.insertId,
        email,
        full_name,
        role_id: role_id || null,
        group_id: group_id || null
      }
    });

  } catch (error) {
    console.error('Lỗi khi tạo user:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
};

// Controller xử lý đổi mật khẩu (S1-04)
const changePassword = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không xác thực được người dùng'
      });
    }

    // 1. Validation đầu vào
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới'
      });
    }

    // Validate mật khẩu mới: tối thiểu 8 ký tự, gồm cả chữ và số
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!\%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ và số'
      });
    }

    // 2. Tìm user trong DB
    const [users] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    const user = users[0];
    const currentHashedPassword = user.password_hash || user.password;

    // 3. Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu cũ không chính xác'
      });
    }

    // 4. Kiểm tra mật khẩu mới không trùng mật khẩu cũ
    const isSame = await bcrypt.compare(newPassword, currentHashedPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ'
      });
    }

    // 5. Băm mật khẩu mới
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật linh hoạt theo cột thực tế có trong Database
    if (user.password_hash !== undefined) {
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHashedPassword, userId]);
    } else {
      await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId]);
    }

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
    });

  } catch (error) {
    console.error('Lỗi khi đổi mật khẩu:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  changePassword
};