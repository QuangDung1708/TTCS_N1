const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const productController = require('../controllers/productController');

// Tất cả API sản phẩm đều yêu cầu đăng nhập
router.use(verifyToken);

router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/toggle-status', productController.toggleProductStatus);

module.exports = router;