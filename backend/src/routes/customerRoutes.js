const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { buildDataScope } = require('../middleware/rbacMiddleware');
const { getCustomers, getCustomerById } = require('../controllers/customerController');

// Mọi route khách hàng đều phải đăng nhập
router.use(verifyToken);

// Danh sách khách hàng (tự động lọc theo quyền)
router.get('/', buildDataScope({ userField: 'created_by', groupField: 'group_id' }), getCustomers);

// Xem chi tiết khách hàng theo ID
router.get('/:id', getCustomerById);

module.exports = router;