const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route Đăng nhập (Mới thêm)
router.post('/login', authController.login);

// Các Route của Team (Giữ nguyên)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;