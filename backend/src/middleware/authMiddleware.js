const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

    // 🛑 CHẶN TOKEN RÁC: NẾU TOKEN RỖNG HOẶC LÀ CHUỖI "undefined" / "null" THÌ DỪNG LẠI NGAY
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực hợp lệ!' });
    }

    // Dùng đúng SECRET KEY khớp hoàn toàn với authController.js
    const secretKey = process.env.JWT_SECRET || 'CRM_ENTERPRISE_SUPER_SECRET_KEY_2026';
    const decoded = jwt.verify(token, secretKey);

    const userId = decoded.id || decoded.userId;
    if (userId) {
      const [rows] = await db.query('SELECT id, status, role_id FROM users WHERE id = ?', [userId]);
      if (rows.length > 0 && (rows[0].status === 'Đã khóa' || rows[0].status === 'inactive')) {
        return res.status(401).json({ message: 'Tài khoản đã bị khóa! Phiên làm việc đã kết thúc.' });
      }
      if (rows.length > 0) {
        req.user = { ...decoded, ...rows[0] };
        return next();
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    // Không console.error nữa để terminal sạch sẽ
    return res.status(401).json({ message: 'Phiên làm việc không hợp lệ hoặc đã hết hạn!' });
  }
};

// Hỗ trợ cả 3 cách import để không bị TypeError ở userRoutes hay categoryRoutes
module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
module.exports.authMiddleware = verifyToken;