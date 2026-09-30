const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendResetEmail } = require('../utils/mailer');

// ==========================================
// 1. ĐĂNG NHẬP (Tích hợp nạp data_scope & group_id)
// ==========================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu!' });
        }

        const [users] = await db.execute(`
            SELECT u.*, r.role_name, r.data_scope, g.name AS group_name
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE u.email = ?
        `, [email]);

        if (users.length === 0) {
            return res.status(400).json({ message: 'Tài khoản không tồn tại!' });
        }

        const user = users[0];

        if (user.lock_until && new Date(user.lock_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
            return res.status(403).json({
                message: `Tài khoản tạm thời bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút!`
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const newAttempts = user.failed_login_attempts + 1;
            if (newAttempts >= 5) {
                const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                await db.execute('UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?', [newAttempts, lockUntil, user.id]);
                return res.status(403).json({ message: 'Nhập sai 5 lần liên tiếp. Tài khoản bị khóa 15 phút!' });
            } else {
                await db.execute('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
                return res.status(400).json({ message: `Mật khẩu không chính xác! Bạn còn ${5 - newAttempts} lần thử.` });
            }
        }
        if (user.status === 'LOCKED') {
            return res.status(403).json({
                message: 'Tài khoản này đã bị khóa do nhân viên nghỉ việc hoặc vi phạm chính sách. Vui lòng liên hệ Quản trị viên!'
            });
        }

        if (user.status === 'INACTIVE') {
            return res.status(403).json({
                message: 'Tài khoản này hiện đang tạm ngừng hoạt động!'
            });
        }

        await db.execute('UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role_id: user.role_id,
                group_id: user.group_id,
                data_scope: user.data_scope || 'OWN'
            },
            process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure',
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role_id: user.role_id,
                role_name: user.role_name,
                group_id: user.group_id,
                group_name: user.group_name || 'Ban Giám Đốc',
                data_scope: user.data_scope
            }
            
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return res.status(500).json({ message: 'Lỗi server khi đăng nhập!' });
    }
};

// ==========================================
// 2. ĐĂNG XUẤT (Blacklist Token)
// ==========================================
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];

        await db.execute('INSERT INTO token_blacklist (token) VALUES (?)', [token]);
        return res.status(200).json({ message: 'Đăng xuất thành công!' });
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        return res.status(500).json({ message: 'Lỗi server khi đăng xuất!' });
    }
};

// ==========================================
// 3. QUÊN MẬT KHẨU (Sinh Token 30 phút)
// ==========================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email!' });
        }

        const [users] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
        const genericSuccessMessage = 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.';

        if (users.length === 0) {
            return res.status(200).json({ message: genericSuccessMessage });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await db.execute(
            'INSERT INTO password_resets (email, token, expires_at, is_used) VALUES (?, ?, ?, 0)',
            [email, resetToken, expiresAt]
        );

        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
        await sendResetEmail(email, resetLink);

        return res.status(200).json({ message: genericSuccessMessage });
    } catch (error) {
        console.error('Lỗi Forgot Password:', error);
        return res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu đặt lại mật khẩu.' });
    }
};

// ==========================================
// 4. ĐẶT LẠI MẬT KHẨU TỪ LINK EMAIL
// ==========================================
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin!' });
        }

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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute(
            'UPDATE users SET password = ?, failed_login_attempts = 0, lock_until = NULL WHERE email = ?',
            [hashedPassword, resetRecord.email]
        );

        await db.execute('UPDATE password_resets SET is_used = 1 WHERE id = ?', [resetRecord.id]);

        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.' });
    } catch (error) {
        console.error('Lỗi Reset Password:', error);
        return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu.' });
    }
};

// ==========================================
// 5. ĐỔI MẬT KHẨU KHI ĐANG ĐĂNG NHẬP
// ==========================================
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới!' });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ và số!' 
            });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác!' });
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        const authHeader = req.headers.authorization;
        const currentToken = authHeader.split(' ')[1];
        await db.execute('INSERT INTO token_blacklist (token) VALUES (?)', [currentToken]);

        return res.status(200).json({ 
            message: 'Đổi mật khẩu thành công! Phiên đăng nhập đã được thu hồi, vui lòng đăng nhập lại.' 
        });
    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu:', error);
        return res.status(500).json({ message: 'Lỗi server khi xử lý đổi mật khẩu!' });
    }
};

module.exports = { login, logout, forgotPassword, resetPassword, changePassword };