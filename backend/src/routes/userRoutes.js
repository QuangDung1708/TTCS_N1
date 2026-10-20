const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// [GET] /api/users - Lấy danh sách tài khoản, tìm kiếm và phân trang
router.get('/', userController.getUsers);

module.exports = router;