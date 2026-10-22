const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
// const { verifyToken } = require('../middlewares/authMiddleware'); // Nếu có middleware auth

// Endpoint PATCH: /api/contacts/:id/transfer-company
router.patch('/:id/transfer-company', contactController.transferCompany);

module.exports = router;