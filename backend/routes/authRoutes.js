const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// API Đăng nhập
router.post('/login', authController.login);

// API Quên & Đặt lại mật khẩu
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;