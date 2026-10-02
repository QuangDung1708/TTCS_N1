const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import middleware upload ảnh riêng để không đụng với Excel
const avatarUpload = require('../middleware/uploadMiddleware');

// Cấu hình Multer cho Import Excel (Sprint 1)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB cho file Excel
});

const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const {
    getUsers,
    createUser,
    updateUser,
    getMetadata,
    lockAndHandoverUser,
    getUserCustomerCount,
    downloadTemplate,
    previewImportUsers,
    executeImportUsers,
    uploadAvatar
} = require('../controllers/userController');
// Mọi route quản lý tài khoản đều yêu cầu đăng nhập
router.use(verifyToken);

// ==========================================
// CÁC ROUTE IMPORT EXCEL (S2-01)
// ==========================================
router.get('/import/template', requireAdmin, downloadTemplate);
router.post('/import/preview', requireAdmin, upload.single('file'), previewImportUsers);
router.post('/import/execute', requireAdmin, executeImportUsers);
// [S2-03] Route tải lên ảnh đại diện cá nhân
router.post('/avatar', (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'Dung lượng ảnh vượt quá giới hạn 2MB!' });
            }
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, uploadAvatar);

// ==========================================
// CÁC ROUTE QUẢN TRỊ TÀI KHOẢN KHÁC
// ==========================================
router.get('/meta/options', requireAdmin, getMetadata);
router.get('/', requireAdmin, getUsers);
router.get('/:id/customers-count', requireAdmin, getUserCustomerCount);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.put('/:id/roles', requireAdmin, updateUser);
router.put('/:id/lock', requireAdmin, lockAndHandoverUser);

module.exports = router;