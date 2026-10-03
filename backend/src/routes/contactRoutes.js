const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getContactsByCustomer,
    createContact,
    updateContact,
    transferContactCustomer,
    deleteContact
} = require('../controllers/contactController');

router.use(verifyToken);

// Các route theo khách hàng
router.get('/customer/:customerId', getContactsByCustomer);
router.post('/customer/:customerId', createContact);

// Các route thao tác trực tiếp trên liên hệ
router.put('/:id', updateContact);
router.put('/:id/transfer', transferContactCustomer);
router.delete('/:id', deleteContact);

module.exports = router;