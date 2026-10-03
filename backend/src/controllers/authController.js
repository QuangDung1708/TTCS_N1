const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// [S1-01] ĐĂNG NHẬP, KHÓA 15S & BẢO MẬT THÔNG TIN
// ==========================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu!' });
        }

        // Truy vấn kèm tính toán số giây còn lại trực tiếp bằng MySQL để không lệch múi giờ
        const [users] = await db.execute(
            `SELECT u.*, r.role_name, r.data_scope, g.name AS group_name,
                    TIMESTAMPDIFF(SECOND, NOW(), u.lock_until) AS seconds_left
             FROM users u
             JOIN roles r ON u.role_id = r.id
             LEFT JOIN \`groups\` g ON u.group_id = g.id
             WHERE u.email = ?`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác!' });
        }

        const user = users[0];

        // 1. Kiểm tra nếu tài khoản đang trong thời gian bị khóa
        if (user.seconds_left && user.seconds_left > 0) {
            return res.status(403).json({
                message: `Tài khoản tạm thời bị khóa do nhập sai quá 5 lần.`,
                secondsLeft: user.seconds_left
            });
        }

        // 2. So khớp mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            const attempts = (user.failed_attempts || 0) + 1;

            if (attempts >= 5) {
                // Khóa đúng 15 giây bằng hàm DATE_ADD của MySQL
                await db.execute(
                    'UPDATE users SET failed_attempts = 0, lock_until = DATE_ADD(NOW(), INTERVAL 15 SECOND) WHERE id = ?',
                    [user.id]
                );
                return res.status(403).json({
                    message: 'Bạn đã nhập sai 5 lần liên tiếp. Tài khoản bị tạm khóa trong 15 giây!',
                    secondsLeft: 15
                });
            } else {
                await db.execute(
                    'UPDATE users SET failed_attempts = ? WHERE id = ?',
                    [attempts, user.id]
                );
                const remaining = 5 - attempts;
                return res.status(401).json({
                    message: `Email hoặc mật khẩu không chính xác! (Còn ${remaining} lần thử trước khi bị khóa)`
                });
            }
        }

        // 3. Đăng nhập thành công -> Reset sạch sẽ
        await db.execute(
            'UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, email: user.email, role_id: user.role_id },
            process.env.JWT_SECRET || 'crm_secret_key_2026',
            { expiresIn: '2h' }
        );

        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.id,
                name: user.full_name || user.name,
                full_name: user.full_name || user.name,
                email: user.email,
                phone: user.phone || '',
                avatar: user.avatar || '',
                email_signature: user.email_signature || '',
                role_id: user.role_id,
                role_name: user.role_name,
                data_scope: user.data_scope,
                group_name: user.group_name
            }
        });
    } catch (error) {
        console.error('Lỗi login:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập!' });
    }
};

// ==========================================
// [S1-02] ĐĂNG XUẤT PHÍA SERVER
// ==========================================
const logout = async (req, res) => {
    try {
        return res.status(200).json({ message: 'Đăng xuất thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi đăng xuất!' });
    }
};

// ==========================================
// [S1-03] QUÊN MẬT KHẨU
// ==========================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp địa chỉ email!' });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

        if (users.length === 0) {
            return res.status(200).json({
                message: 'Nếu email tồn tại trong hệ thống, thông tin khôi phục mật khẩu đã được gửi thành công!'
            });
        }

        const user = users[0];
        const tempPassword = 'Crm@' + Math.floor(100000 + Math.random() * 900000);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        return res.status(200).json({
            message: 'Mật khẩu tạm thời đã được tạo thành công!',
            tempPassword: tempPassword
        });
    } catch (error) {
        console.error('Lỗi forgot password:', error);
        return res.status(500).json({ message: 'Lỗi server khi xử lý quên mật khẩu!' });
    }
};

// ==========================================
// [S1-03] ĐẶT LẠI MẬT KHẨU BẰNG TOKEN/LINK
// ==========================================
const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 8 ký tự!' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu!' });
    }
};

// ==========================================
// [S1-04] ĐỔI MẬT KHẨU
// ==========================================
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ mật khẩu!' });
        }

        const passRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passRegex.test(newPassword)) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ và số!' });
        }

        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Người dùng không tồn tại!' });
        }

        const isMatch = await bcrypt.compare(oldPassword, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi changePassword:', error);
        return res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu!' });
    }
};

module.exports = {
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword
};