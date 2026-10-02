const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const categoryController = require('../controllers/categoryController');

router.use(verifyToken);

// Xem danh mục theo loại: industry, company_size, lead_source, activity_type
router.get('/:type', categoryController.getCategoriesByType);

// Thay đổi danh mục: chỉ quản trị
router.post('/', requireAdmin, categoryController.createCategory);
router.put('/sort-order', requireAdmin, categoryController.updateSortOrder); // phải đặt TRƯỚC '/:id'
router.put('/:id', requireAdmin, categoryController.updateCategory);
router.delete('/:id', requireAdmin, categoryController.deleteCategory);

module.exports = router;