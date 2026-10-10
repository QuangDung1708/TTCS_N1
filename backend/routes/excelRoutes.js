const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelController = require('../controllers/excelController');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

// Endpoint tải file mẫu
router.get('/excel/template', excelController.downloadTemplate);

// Endpoint upload và parse file Excel
router.post('/excel/upload', upload.single('file'), excelController.parseExcelUpload);

module.exports = router;