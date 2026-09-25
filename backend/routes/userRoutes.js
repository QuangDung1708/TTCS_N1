const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/auth');

// GET /api/users: Yêu cầu đăng nhập và có quyền Admin
router.get('/', verifyToken, checkRole(['Admin']), userController.getUsers);

module.exports = router;