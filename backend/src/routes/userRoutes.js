const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getUsers, createUser, updateUser, getMetadata } = require('../controllers/userController');

// Mọi route quản trị người dùng đều phải đăng nhập
router.use(verifyToken);

// Middleware kiểm tra quyền Quản trị viên (Chỉ Admin / Giám đốc mới có quyền quản lý tài khoản)
const requireAdmin = (req, res, next) => {
    if (req.user.data_scope !== 'ALL' && req.user.role_id !== 1) {
        return res.status(403).json({ 
            message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền quản lý tài khoản!' 
        });
    }
    next();
};

// Lấy danh mục roles và groups phục vụ dropdown trên giao diện
router.get('/meta/options', getMetadata);

// Lấy danh sách người dùng (Tìm kiếm, Lọc, Phân trang 20 dòng)
router.get('/', requireAdmin, getUsers);

// Tạo người dùng mới (Gửi mail mật khẩu tạm)
router.post('/', requireAdmin, createUser);

// Cập nhật thông tin / trạng thái người dùng
router.put('/:id', requireAdmin, updateUser);

module.exports = router;