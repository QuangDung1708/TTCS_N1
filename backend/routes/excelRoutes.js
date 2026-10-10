const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelController = require('../controllers/excelController');

// Cấu hình Multer lưu file vào bộ nhớ tạm (RAM)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

// Route tải file mẫu
router.get('/excel/template', excelController.downloadTemplate);

// Route upload và parse file
router.post('/excel/upload', upload.single('file'), excelController.parseExcelUpload);

module.exports = router;