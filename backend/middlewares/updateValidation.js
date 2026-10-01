const blockUnauthorizedUpdates = (req, res, next) => {
    const restrictedFields = ['email', 'role', 'vai_tro', 'business_group', 'nhom_kinh_doanh'];

    for (const field of restrictedFields) {
        // Nếu trong body request có gửi lên trường bị cấm và giá trị của nó không bị undefined/null
        if (req.body[field] !== undefined) {
            return res.status(400).json({
                success: false,
                message: `Trường '${field}' bị khóa cứng và không được phép cập nhật!`
            });
        }
    }
    
    // Nếu không có trường nào vi phạm, cho phép đi tiếp vào route/controller
    next();
};

module.exports = { blockUnauthorizedUpdates };