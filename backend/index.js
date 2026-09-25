const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware cấu hình đọc dữ liệu
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route kiểm tra trạng thái máy chủ
app.get('/api/v1', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hệ thống Backend CRM đang hoạt động!'
  });
});

// 1. POST /api/auth/forgot-password: Yêu cầu đặt lại mật khẩu (hiệu lực 30 phút, chống user enumeration)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email'
      });
    }

    // Kiểm tra user trong cơ sở dữ liệu
    const [users] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    // Nếu tìm thấy email -> tạo token có hạn 30 phút
    if (users.length > 0) {
      const user = users[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

      // Hủy hiệu lực các token cũ chưa sử dụng của user này
      await db.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
        [user.id]
      );

      // Lưu token mới vào bảng password_reset_tokens
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt]
      );

      // In liên kết ra terminal giả lập gửi email
      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
      console.log(`[EMAIL FORGOT PASSWORD] Đã gửi liên kết đặt lại mật khẩu đến ${email}: ${resetLink}`);
    }

    // Dù email có tồn tại hay không, trả về thông báo chung để bảo mật
    return res.status(200).json({
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu'
    });

  } catch (error) {
    console.error('Lỗi Forgot Password:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
});

// 2. POST /api/auth/reset-password: Cập nhật mật khẩu mới (chỉ dùng 1 lần, kiểm tra hạn 30 phút)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp token và mật khẩu mới'
      });
    }

    // Kiểm tra tính hợp lệ của token (chưa dùng và còn hạn sử dụng)
    const [tokenRecords] = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW() LIMIT 1',
      [token]
    );

    if (tokenRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
      });
    }

    const resetRecord = tokenRecords[0];

    // Băm mật khẩu mới bằng bcrypt
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Cập nhật mật khẩu cho người dùng
    await db.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      resetRecord.user_id
    ]);

    // Đánh dấu token đã được sử dụng (ngăn chặn tái sử dụng)
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [
      resetRecord.id
    ]);

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
    });

  } catch (error) {
    console.error('Lỗi Reset Password:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ nội bộ: ' + error.message
    });
  }
});

// Khởi chạy máy chủ
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});