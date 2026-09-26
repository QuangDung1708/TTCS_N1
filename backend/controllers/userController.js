const bcrypt = require('bcrypt');
const db = require('../db');

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

module.exports = {
  createUser
};