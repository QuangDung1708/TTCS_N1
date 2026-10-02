const multer = require('multer');

// Lưu file vào bộ nhớ RAM tạm thời để Sharp xử lý cắt ảnh trước khi ghi ra đĩa
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận định dạng JPG, JPEG, PNG
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file định dạng JPG hoặc PNG!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // Giới hạn tối đa 2MB
    },
    fileFilter: fileFilter
});

module.exports = upload;