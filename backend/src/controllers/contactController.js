const contactService = require('../services/contactService');

const transferCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_customer_id, note } = req.body;

    if (!new_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'customer_id mới không được để trống',
      });
    }

    // Lấy ID user từ token xác thực nếu có middleware auth
    const userId = req.user ? (req.user.id || req.user.userId) : null;

    const data = await contactService.transferCompany(id, {
      new_customer_id,
      note,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Chuyển công ty cho người liên hệ thành công',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi chuyển công ty',
    });
  }
};

// Nhớ xuất transferCompany ra module.exports
module.exports = {
  // ... các hàm cũ của bạn
  transferCompany,
};