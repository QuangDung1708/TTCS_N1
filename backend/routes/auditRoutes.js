const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');

// Định nghĩa route GET /api/audit-logs
router.get('/', getAuditLogs);

module.exports = router;    