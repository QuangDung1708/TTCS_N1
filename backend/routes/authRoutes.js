const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route Đăng nhập
router.post('/login', authController.login);

module.exports = router;