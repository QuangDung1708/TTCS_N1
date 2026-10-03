const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 1. Kiểm tra Token & Trạng thái tài khoản (Thu hồi phiên ngay nếu bị khóa)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({ message: 'Thiếu mã xác thực (Token)!' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'crm_secret_key_2026', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn!' });
        }
        req.user = user;
        return next(); // BẮT BUỘC PHẢI RETURN ĐỂ TRÁNH LỖI ERR_HTTP_HEADERS_SENT
    });
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