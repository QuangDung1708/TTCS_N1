const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Định nghĩa API: POST /login
router.post('/login', login);

module.exports = router;