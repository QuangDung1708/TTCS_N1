const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
    // 1. Kiểm tra header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Không tìm thấy token xác thực!' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Dò xem token có bị đưa vào danh sách đen (đã đăng xuất) chưa?
        const [blacklisted] = await db.execute('SELECT * FROM token_blacklist WHERE token = ?', [token]);
        if (blacklisted.length > 0) {
            return res.status(401).json({ message: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại!' });
        }

        // 3. Xác thực token (dùng chung JWT_SECRET trong file .env)
       // Thêm chuỗi dự phòng giống hệt bên authController
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chuoi_bi_mat_mac_dinh');
        req.user = decoded; // Gắn thông tin user vào request để các API sau dùng
        
        next(); // Cho phép đi tiếp vào Controller
    } catch (error) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
};

module.exports = { verifyToken };