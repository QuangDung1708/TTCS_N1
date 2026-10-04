const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const {
    getStages,
    getStageById,
    createStage,
    updateStage,
    reorderStages,
    deleteStage
} = require('../controllers/pipelineStageController');

// Mọi route pipeline đều cần xác thực & quyền Admin/Giám đốc
router.use(verifyToken, requireAdmin);

router.get('/', getStages);                // Lấy danh sách giai đoạn (sắp theo sort_order)
router.get('/:id', getStageById);          // Lấy chi tiết 1 giai đoạn
router.post('/', createStage);             // Tạo giai đoạn mới
router.put('/reorder', reorderStages);     // Cập nhật thứ tự hàng loạt (kéo thả)
router.put('/:id', updateStage);           // Cập nhật 1 giai đoạn
router.delete('/:id', deleteStage);        // Xóa / vô hiệu hóa giai đoạn

module.exports = router;
