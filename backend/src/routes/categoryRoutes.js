const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const categoryController = require('../controllers/categoryController');

router.use(verifyToken);

router.get('/:type', categoryController.getCategories);
router.post('/:type', categoryController.createCategory);
router.put('/:type/:id', categoryController.updateCategory);
router.patch('/:type/swap-order', categoryController.swapOrder);
router.delete('/:type/:id', categoryController.deleteCategory);

module.exports = router;