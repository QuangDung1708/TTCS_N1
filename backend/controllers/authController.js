const db = require('../db');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra đầu vào
    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu!' });
    }

    // Truy vấn kiểm tra người dùng trong CSDL
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    const user = rows[0];

    // Kiểm tra mật khẩu
    const isMatch = (password === user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    // Cấp Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET || 'secretkey123',
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};