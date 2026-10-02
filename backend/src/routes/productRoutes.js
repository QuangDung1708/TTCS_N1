const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Khai báo tập hợp các endpoint RESTful API
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/status', productController.updateProductStatus);
router.delete('/:id', productController.deleteProduct);

module.exports = router;