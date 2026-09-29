const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;
  // ... code hàm login giữ nguyên ...

const logout = async (req, res) => {
    try {
        // Lấy token từ header (bảo vệ ở Middleware đã check an toàn rồi)
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];

        // Nhét token này vào danh sách đen
        await db.execute('INSERT INTO token_blacklist (token) VALUES (?)', [token]);

        res.status(200).json({ message: 'Đăng xuất thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
    }
};

// Nhớ xuất (export) thêm hàm logout ra nhé
module.exports = { login, logout };

  try {
    // 1. Tìm user theo email
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
    }

    // 2. Kiểm tra tài khoản có đang bị khóa hay không (Subtask N1-85)
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lock_until) - new Date()) / 1000);
      return res.status(403).json({ 
        message: `Tài khoản đã bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${remainingTime} giây.` 
      });
    } 

    // 3. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Logic xử lý khi sai mật khẩu: Tăng số lần sai
      let attempts = user.failed_login_attempts + 1;
      let lockUntil = null;

      // Nếu sai đến lần thứ 5, thiết lập thời gian khóa là 15 phút (900000 ms) kể từ hiện tại
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 30 * 1000); 
      }

      await db.execute(
        'UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?',
        [attempts, lockUntil, user.id]
      );

      if (attempts >= 5) {
        return res.status(403).json({ message: 'Bạn đã nhập sai 5 lần. Tài khoản bị khóa 30s !' });
      }

      return res.status(401).json({ message: `Email hoặc mật khẩu không chính xác! (Sai ${attempts}/5 lần)` });
    }

    // 4. Nếu đăng nhập thành công: Reset lại số lần sai về 0
    await db.execute(
      'UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?',
      [user.id]
    );

    // 5. Tạo token JWT (Subtask N1-84)
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id },
      process.env.JWT_SECRET || 'chuoi_bi_mat_mac_dinh',
      { expiresIn: '8h' } // Token có hạn 8 tiếng (Phục vụ cho S1-02 sau này)
    );

    res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id
      }
    });

  } catch (error) {
    console.error('Lỗi server:', error);
    res.status(500).json({ message: 'Lỗi hệ thống, vui lòng thử lại sau!' });
  }
};
// Hàm xử lý đăng xuất
const logout = async (req, res) => {
    try {
        // Lấy token từ header
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];

        // Nhét token này vào danh sách đen
        await db.execute('INSERT INTO token_blacklist (token) VALUES (?)', [token]);

        res.status(200).json({ message: 'Đăng xuất thành công!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
    }
};
module.exports = { login, logout };