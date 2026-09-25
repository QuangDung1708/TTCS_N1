const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');
const { verifyToken, checkRole } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware cấu hình
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route kiểm tra hệ thống cơ bản
app.get('/api/v1', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hệ thống Backend CRM đang hoạt động!'
  });
});

// POST /api/users: Thêm nhân viên mới
app.post('/api/users', verifyToken, checkRole(['Admin']), async (req, res) => {
  try {
    const { email, full_name, phone, role_id, group_id } = req.body;

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

    // 3. Đặt mật khẩu mặc định và băm bằng bcrypt
    const defaultPassword = '123456aA@';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

  // 4. Lưu user mới vào DB (bỏ trường password)
    const insertSql = `
      INSERT INTO users (email, full_name, phone, role_id, group_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(insertSql, [
      email,
      full_name,
      phone || null,
      role_id || null,
      group_id || null
    ]);

    // 5. In console thông báo cấp tài khoản tạm thời
    console.log(`Đã gửi email cấp tài khoản đến ${email} với pass: 123456aA@`);

    // 6. Phản hồi 200 OK kèm thông tin user vừa tạo
    return res.status(200).json({
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
});

// Lắng nghe cổng kết nối
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});