const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không tìm thấy token xác thực!' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Kiểm tra token trong danh sách đen (blacklist)
        const [blacklisted] = await db.execute('SELECT id FROM token_blacklist WHERE token = ?', [token]);
        if (blacklisted.length > 0) {
            return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};

module.exports = { verifyToken };