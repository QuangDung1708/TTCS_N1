const pool = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const sendResetEmail = async (toEmail, resetLink) => {
  let transporter;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  const mailOptions = {
    from: `"Hệ thống Hỗ trợ" <${process.env.EMAIL_USER || 'no-reply@system.com'}>`,
    to: toEmail,
    subject: 'Yêu cầu đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2>Yêu cầu đặt lại mật khẩu</h2>
        <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.</p>
        <p>Vui lòng bấm vào liên kết bên dưới để tiến hành đổi mật khẩu mới (hiệu lực 15 phút):</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Đặt lại mật khẩu</a></p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  if (!process.env.EMAIL_USER) {
    console.log('Xem trước email test:', nodemailer.getTestMessageUrl(info));
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email' });
    }

    const [users] = await pool.query('SELECT id, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, users[0].id]
    );

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    await sendResetEmail(email, resetLink);

    return res.status(200).json({
      success: true,
      message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn'
    });
  } catch (error) {
    console.error('Lỗi Forgot Password:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp token và mật khẩu mới' });
    }

    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi Reset Password:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password || user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET || 'secretkey_default',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role_id: user.role_id }
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword
};