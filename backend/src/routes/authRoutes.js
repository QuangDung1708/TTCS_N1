const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Route Đăng nhập (ai cũng vào được)
router.post('/login', login);

// Route Đăng xuất (Phải qua ải verifyToken mới được vào hàm logout)
router.post('/logout', verifyToken, logout);

module.exports = router;