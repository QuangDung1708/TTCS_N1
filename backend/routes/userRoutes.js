const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route POST /api/users
router.post('/', userController.createUser);

module.exports = router;