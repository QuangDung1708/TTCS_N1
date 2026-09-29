const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const { sendResetEmail } = require('../utils/mailer');

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
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email!' });
        }

        // 1. Kiểm tra user có tồn tại hay không
        const [users] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
        
        // TIÊU CHÍ AC: Email không tồn tại vẫn trả về cùng thông điệp chung để bảo mật
        const genericSuccessMessage = 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.';

        if (users.length === 0) {
            return res.status(200).json({ message: genericSuccessMessage });
        }

        // 2. Tạo token ngẫu nhiên bảo mật cao (64 ký tự hex)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. Thời hạn: Đúng 30 phút tính từ thời điểm hiện tại
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // 4. Lưu token vào bảng password_resets
        await db.execute(
            'INSERT INTO password_resets (email, token, expires_at, is_used) VALUES (?, ?, ?, 0)',
            [email, resetToken, expiresAt]
        );

        // 5. Tạo link đặt lại mật khẩu dẫn về Frontend (port 5173)
        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

        // 6. Gửi Email (hoặc log ra console)
        await sendResetEmail(email, resetLink);

        return res.status(200).json({ message: genericSuccessMessage });

    } catch (error) {
        console.error('Lỗi Forgot Password:', error);
        return res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu đặt lại mật khẩu.' });
    }
};

// ... các hàm login, logout, forgotPassword giữ nguyên ...

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin!' });
        }

        // 1. Kiểm tra token có tồn tại, chưa dùng và còn hạn không
        const [records] = await db.execute(
            'SELECT * FROM password_resets WHERE token = ? AND is_used = 0 AND expires_at > NOW()',
            [token]
        );

        if (records.length === 0) {
            return res.status(400).json({ 
                message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (quá 30 phút)!' 
            });
        }

        const resetRecord = records[0];

        // 2. Băm mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Cập nhật mật khẩu mới vào bảng users, reset luôn số lần đăng nhập sai
        await db.execute(
            'UPDATE users SET password = ?, failed_login_attempts = 0, lock_until = NULL WHERE email = ?',
            [hashedPassword, resetRecord.email]
        );

        // 4. Đánh dấu token này ĐÃ SỬ DỤNG (chỉ dùng được 1 lần)
        await db.execute(
            'UPDATE password_resets SET is_used = 1 WHERE id = ?',
            [resetRecord.id]
        );

        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' });

    } catch (error) {
        console.error('Lỗi Reset Password:', error);
        return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu.' });
    }
};

module.exports = { login, logout, forgotPassword, resetPassword };