const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { 
    getUsers, 
    createUser, 
    updateUser, 
    getMetadata, 
    lockAndHandoverUser, 
    getUserCustomerCount 
} = require('../controllers/userController');

// Tất cả các route quản lý tài khoản đều yêu cầu xác thực đăng nhập
router.use(verifyToken);

// 1. Lấy dữ liệu danh mục nhóm và vai trò
router.get('/meta/options', requireAdmin, getMetadata);

// 2. Lấy danh sách nhân viên (có tìm kiếm, lọc, phân trang)
router.get('/', requireAdmin, getUsers);

// 3. Đếm số lượng khách hàng cần bàn giao của một nhân viên (S1-10)
router.get('/:id/customers-count', requireAdmin, getUserCustomerCount);

// 4. Tạo tài khoản người dùng mới (gửi mật khẩu tạm)
router.post('/', requireAdmin, createUser);

// 5. Cập nhật thông tin / vai trò người dùng (S1-09)
router.put('/:id', requireAdmin, updateUser);
router.put('/:id/roles', requireAdmin, updateUser);

// 6. Khóa tài khoản và chuyển giao dữ liệu khách hàng (S1-10 & N1-111)
router.put('/:id/lock', requireAdmin, lockAndHandoverUser);

module.exports = router;