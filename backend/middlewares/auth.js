const jwt = require('jsonwebtoken');

// 1. Middleware kiểm tra Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Token thường gửi theo dạng: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy token xác thực (Access Token missing)'
    });
  }

  try {
    const secretKey = 'my_super_secret_key_123';
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("CHI TIET LOI TOKEN:", error.message); // In lý do lỗi vào Terminal
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
};

// 2. Middleware kiểm tra quyền (Role)
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // req.user được gán từ verifyToken (chú ý: tên trường role tuỳ theo lúc bạn sinh token lúc login: req.user.role hoặc req.user.role_name)
    const userRole = req.user?.role || req.user?.role_name;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này (Forbidden)'
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};