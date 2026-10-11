const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

// Kiểm tra và nạp mailService an toàn
let sendResetPasswordEmail = null;
try {
    const mailService = require('../services/mailService');
    sendResetPasswordEmail = mailService.sendResetPasswordEmail;
} catch (err) {
    console.warn('Lưu ý: Chưa nạp được mailService, vui lòng kiểm tra file mailService.js');
}
const user = users[0];
console.log('🔍 [DEBUG LOGIN] Trạng thái tài khoản trong DB:', {
  email: user.email,
  status: user.status
});

// 1. Đăng nhập
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
        }

        // Đảm bảo có lấy cột status:
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        const user = users[0];

        if (user.status === 'Đã khóa') {
  return res.status(403).json({ 
    message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị hệ thống!' 
  });
}

        if (user.status === 'locked') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
        }

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            isMatch = false;
        }

        // Hỗ trợ kiểm tra plain-text nếu dữ liệu test chưa băm mật khẩu
        if (!isMatch && user.password === password) {
            isMatch = true;
        }

        if (!isMatch) {
  return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' });
}

// ⛔ THÊM ĐOẠN NÀY ĐỂ CHẶN TÀI KHOẢN BỊ KHÓA (HOÀN THÀNH AC 1):
const statusStr = String(user.status || '').toLowerCase().trim();
const isLocked = statusStr === 'đã khóa' || statusStr === 'inactive' || statusStr === 'locked' || statusStr === '0';

if (isLocked) {
  console.log(` Đã chặn tài khoản bị khóa đăng nhập: ${user.email}`);
  return res.status(403).json({ 
    message: 'Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Quản trị hệ thống.' 
  });
}

const secretKey = process.env.JWT_SECRET || 'CRM_ENTERPRISE_SUPER_SECRET_KEY_2026';
const token = jwt.sign(

            {
                id: user.id,
                email: user.email,
                role_code: user.role_code,
                group_id: user.group_id
            },
            secretKey,
            { expiresIn: '8h' }
        );

        return res.json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role_code: user.role_code,
                group_id: user.group_id
            }
        });
    } catch (error) {
        console.error('Lỗi login:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.', error: error.message });
    }
};

// 2. Đăng xuất
const logout = async (req, res) => {
    return res.json({ message: 'Đăng xuất thành công' });
};

// 3. Quên mật khẩu - Gửi mã xác thực về Email thật
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email!' });
        }

        const [users] = await db.execute('SELECT id, email, full_name FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Địa chỉ email này không tồn tại trong hệ thống!' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        await db.execute(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
            [token, expires, email]
        );

        if (typeof sendResetPasswordEmail === 'function') {
            await sendResetPasswordEmail(email, token);
        } else {
            console.log(`[TEST TOKEN]: Mã xác thực cho ${email} là: ${token}`);
        }

        return res.json({ message: 'Đã gửi mã xác thực thành công! Vui lòng kiểm tra email của bạn.' });
    } catch (error) {
        console.error('Lỗi forgotPassword:', error);
        return res.status(500).json({ message: 'Lỗi gửi email xác thực. Vui lòng kiểm tra cấu hình SMTP!' });
    }
};

// 4. Đặt lại mật khẩu mới
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Thiếu mã xác thực hoặc mật khẩu mới!' });
        }

        const [users] = await db.execute(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, users[0].id]
        );

        return res.json({ message: 'Đặt lại mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi resetPassword:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đổi mật khẩu!' });
    }
};

// 5. Đổi mật khẩu trong hệ thống
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu cũ và mới.' });
        }

        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(oldPassword, users[0].password);
        } catch (e) {
            isMatch = false;
        }

        if (!isMatch && users[0].password === oldPassword) {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không chính xác.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

        return res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi changePassword:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đổi mật khẩu.' });
    }
};

module.exports = {
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword
};