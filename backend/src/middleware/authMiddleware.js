const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 1. Kiểm tra Token & Trạng thái tài khoản (Thu hồi phiên ngay nếu bị khóa)
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy mã xác thực (Token)!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure');
        
        // Kiểm tra trực tiếp trạng thái tài khoản trong DB
        const [users] = await db.execute(
            'SELECT id, email, full_name, role_id, group_id, status FROM users WHERE id = ?', 
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Tài khoản không còn tồn tại!' });
        }

        const currentUser = users[0];

        // Chặn và thu hồi phiên nếu tài khoản bị khóa
        if (currentUser.status === 'LOCKED' || currentUser.status === 'INACTIVE') {
            return res.status(403).json({ 
                message: 'Tài khoản của bạn đã bị khóa. Phiên làm việc đã bị thu hồi!' 
            });
        }

        req.user = {
            ...decoded,
            status: currentUser.status,
            group_id: currentUser.group_id
        };

        next();
    } catch (error) {
        return res.status(403).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!' });
    }
};

// 2. Middleware chặn quyền Admin / Giám đốc
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Chưa xác thực người dùng!' });
    }
    // Cho phép nếu là Admin (role_id = 1) hoặc có scope = 'ALL'
    if (req.user.role_id === 1 || req.user.data_scope === 'ALL') {
        return next();
    }
    return res.status(403).json({ message: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên!' });
};

module.exports = { verifyToken, requireAdmin };