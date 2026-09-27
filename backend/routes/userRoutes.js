const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/auth');
router.get('/', verifyToken, checkRole(['Admin']), userController.getUsers);
router.post('/', verifyToken, checkRole(['Admin']), userController.createUser);
router.put('/change-password', verifyToken, userController.changePassword);
module.exports = router;