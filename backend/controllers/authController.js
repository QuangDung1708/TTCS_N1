const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const db = require('../db'); // File kết nối cơ sở dữ liệu

// ----------------------------------------------------
// 1. API ĐĂNG NHẬP (LOGIN WITH JWT)
// ----------------------------------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu' });
    }

    // Trích xuất thông tin người dùng từ DB theo email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }

    const user = users[0];

    // Đối chiếu mật khẩu nhập vào với mật khẩu đã mã hóa (password_hash)
    const isMatch = await bcrypt.compare(password, user.password_hash || user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }

    // Khởi tạo mã JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET || 'secretkey_default',
      { expiresIn: '1d' }
    );

    // Trả về kết quả thành công kèm Token
    return res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// ----------------------------------------------------
// 2. CÁC HÀM XỬ LÝ QUÊN VÀ ĐẶT LẠI MẬT KHẨU
// ----------------------------------------------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng cung cấp email' });
    }
    // Logic gửi email đặt lại mật khẩu ở đây
    return res.status(200).json({ message: 'Yêu cầu đặt lại mật khẩu đã được gửi qua email' });
  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Thông tin không hợp lệ' });
    }
    // Logic cập nhật mật khẩu mới ở đây
    return res.status(200).json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};