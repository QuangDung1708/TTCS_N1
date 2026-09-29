const express = require('express');
const router = express.Router();
const { login, logout, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', verifyToken, changePassword);
module.exports = router;