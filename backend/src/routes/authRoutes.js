const express = require('express');
const router = express.Router();
const { login, logout, forgotPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/forgot-password', forgotPassword); // Route mới

module.exports = router;