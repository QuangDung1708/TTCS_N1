const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { buildDataScope } = require('../middleware/rbacMiddleware');
const { getCustomers, getCustomerById } = require('../controllers/customerController');

// Mọi route khách hàng đều phải xác thực token
router.use(verifyToken);

// Lấy danh sách khách hàng (lọc theo phạm vi dữ liệu với tiền tố c.)
router.get('/', buildDataScope({ userField: 'c.created_by', groupField: 'c.group_id' }), getCustomers);

// Xem chi tiết khách hàng theo ID
router.get('/:id', getCustomerById);

module.exports = router;