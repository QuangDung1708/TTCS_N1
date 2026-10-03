    const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { getAuditLogs } = require('../controllers/auditLogController');

// Chỉ Quản trị viên (Admin) mới có quyền xem nhật ký hệ thống
router.get('/', verifyToken, requireAdmin, getAuditLogs);

module.exports = router;