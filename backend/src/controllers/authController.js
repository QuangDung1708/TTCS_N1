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

// 1. Đăng nhập (S1-01: AC 1, AC 2, AC 3 Khóa tạm 15 phút sau 5 lần sai)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
        }

        // Lấy thông tin người dùng kèm vai trò và phạm vi dữ liệu (data_scope)
        const [users] = await db.query(`
            SELECT u.*, r.role_name, r.data_scope 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = ?
        `, [email.trim()]);

        if (users.length === 0) {
            // AC 2: Không tiết lộ email có tồn tại hay không
            return res.status(401).json({ message: 'Tài khoản hoặc mật khẩu không chính xác.' });
        }

        const user = users[0];

        // Kiểm tra khóa vĩnh viễn
        const statusStr = String(user.status || '').toLowerCase().trim();
        const isPermanentlyLocked = statusStr === 'đã khóa' || statusStr === 'inactive' || statusStr === 'locked' || statusStr === '0';
        if (isPermanentlyLocked) {
            return res.status(403).json({ 
                message: 'Tài khoản của bạn đã bị khóa! Vui lòng liên hệ Quản trị hệ thống.' 
            });
        }

        // AC 3: Kiểm tra khóa tạm thời 15 phút
        if (user.lock_until && new Date(user.lock_until) > new Date()) {
            const remainingMs = new Date(user.lock_until) - new Date();
            const remainingMin = Math.ceil(remainingMs / (60 * 1000));
            const remainingSec = Math.ceil(remainingMs / 1000);
            return res.status(403).json({
                message: `Tài khoản tạm thời bị khóa do nhập sai 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMin} phút!`,
                isTemporaryLock: true,
                remainingSeconds: remainingSec
            });
        }

        // Kiểm tra mật khẩu
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
            // Tăng số lần đăng nhập sai
            const failedAttempts = (user.failed_login_attempts || 0) + 1;

            if (failedAttempts >= 5) {
                // AC 3: Khóa 15 phút sau 5 lần sai liên tiếp
                const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                await db.execute(
                    'UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?',
                    [failedAttempts, lockUntil, user.id]
                );
                return res.status(403).json({
                    message: 'Tài khoản đã bị tạm khóa 15 phút do nhập sai 5 lần liên tiếp!',
                    isTemporaryLock: true,
                    remainingSeconds: 15 * 60
                });
            } else {
                await db.execute(
                    'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
                    [failedAttempts, user.id]
                );
                const remaining = 5 - failedAttempts;
                return res.status(401).json({
                    message: `Tài khoản hoặc mật khẩu không chính xác. Bạn còn ${remaining} lần thử trước khi bị tạm khóa.`
                });
            }
        }

        // Đăng nhập thành công -> Reset failed_login_attempts và lock_until
        await db.execute('UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);

        const roleCode = user.role_name || user.role_code || 'Sales Executive';
        const dataScope = user.data_scope || 'OWN';

        const secretKey = process.env.JWT_SECRET || 'CRM_ENTERPRISE_SUPER_SECRET_KEY_2026';
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role_code: roleCode,
                role_name: roleCode,
                data_scope: dataScope,
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
                role_code: roleCode,
                role_name: roleCode,
                data_scope: dataScope,
                group_id: user.group_id,
                avatar: user.avatar_url || user.avatar_thumb_url || null
            }
        });
    } catch (error) {
        console.error('Lỗi login:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.', error: error.message });
    }
};

// 2. Đăng xuất (S1-02)
const logout = async (req, res) => {
    return res.json({ message: 'Đăng xuất thành công' });
};

// 3. Quên mật khẩu - S1-03:
// AC 1: Liên kết đặt lại có hiệu lực 30 phút
// AC 2: Liên kết chỉ dùng được 1 lần
// AC 3: Email không tồn tại vẫn hiển thị cùng một thông báo
// Ghi chú: Link API với bên thứ 3 để gửi pass/link về mail thật
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email!' });
        }

        const [users] = await db.execute('SELECT id, email, full_name FROM users WHERE email = ?', [email.trim()]);
        
        // Nếu user tồn tại, tạo token và gửi email thật
        if (users.length > 0) {
            const token = crypto.randomBytes(24).toString('hex');
            const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 phút (AC 1)

            await db.execute(
                'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [token, expires, users[0].id]
            );

            if (typeof sendResetPasswordEmail === 'function') {
                try {
                    await sendResetPasswordEmail(users[0].email, token);
                    console.log(`[SMTP] Đã gửi email khôi phục mật khẩu thành công tới: ${users[0].email}`);
                } catch (mailErr) {
                    console.error('[SMTP ERROR] Lỗi khi gửi mail:', mailErr.message);
                }
            } else {
                console.log(`[TEST TOKEN]: Mã xác thực cho ${users[0].email} là: ${token}`);
            }
        }

        // AC 3: Email không tồn tại vẫn hiển thị cùng một thông báo chung
        return res.json({ 
            message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu (hiệu lực 30 phút) đã được gửi đến email của bạn.' 
        });
    } catch (error) {
        console.error('Lỗi forgotPassword:', error);
        return res.status(500).json({ message: 'Lỗi gửi email xác thực. Vui lòng kiểm tra cấu hình SMTP!' });
    }
};

// 4. Đặt lại mật khẩu mới (S1-03: AC 2 - Liên kết chỉ dùng được 1 lần)
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
        // AC 2: Hủy token ngay sau khi đổi mật khẩu để chỉ dùng được 1 lần
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