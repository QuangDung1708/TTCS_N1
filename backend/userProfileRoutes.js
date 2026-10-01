const express = require('express');
const router = express.Router();

// Import middleware chặn cập nhật
const { blockUnauthorizedUpdates } = require('./middlewares/updateValidation');

// Route test trực tiếp không cần token
router.put('/profile', blockUnauthorizedUpdates, (req, res) => {
    res.json({
        status: "success",
        message: "Cập nhật thông tin thành công qua kiểm tra middleware!"
    });
});

module.exports = router;