// Lấy thông tin cá nhân của tài khoản đang đăng nhập
const getProfile = async (req, res) => {
    try {
        const db = require('../config/db');
        const [users] = await db.execute(`
            SELECT u.id, u.full_name, u.email, u.phone, u.role_code, u.avatar, 
                   u.email_signature, g.name AS group_name
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE u.id = ?
        `, [req.user.id]);

        if (users.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        return res.json({ user: users[0] });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi lấy hồ sơ cá nhân' });
    }
};

// Cập nhật hồ sơ cá nhân và chữ ký email (S2-02, S2-03)
const updateProfile = async (req, res) => {
    try {
        const db = require('../config/db');
        const userId = req.user.id;
        const { full_name, phone, email_signature, avatar } = req.body;

        // Ràng buộc regex SĐT Việt Nam (AC S2-02)
        if (phone && !/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(phone)) {
            return res.status(400).json({ message: 'Số điện thoại Việt Nam không hợp lệ!' });
        }

        await db.execute(`
            UPDATE users 
            SET full_name = ?, phone = ?, email_signature = ?, avatar = ?
            WHERE id = ?
        `, [full_name, phone || null, email_signature || null, avatar || null, userId]);

        const [updated] = await db.execute(`
            SELECT u.id, u.full_name, u.email, u.phone, u.role_code, u.avatar, 
                   u.email_signature, g.name AS group_name
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE u.id = ?
        `, [userId]);

        return res.json({ message: 'Cập nhật hồ sơ thành công!', user: updated[0] });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật hồ sơ vào database' });
    }
};