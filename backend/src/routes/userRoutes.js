const express = require('express');
const router = express.Router();
const multer = require('multer');

// Cấu hình Multer lưu file tạm vào Memory buffer để đọc trực tiếp
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn file tối đa 5MB
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
    executeImportUsers
} = require('../controllers/userController');

// Mọi route quản lý tài khoản đều yêu cầu đăng nhập
router.use(verifyToken);

// ==========================================
// CÁC ROUTE IMPORT EXCEL (S2-01)
// ==========================================
router.get('/import/template', requireAdmin, downloadTemplate);
router.post('/import/preview', requireAdmin, upload.single('file'), previewImportUsers);
router.post('/import/execute', requireAdmin, executeImportUsers);

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