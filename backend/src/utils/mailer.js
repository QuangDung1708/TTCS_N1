const nodemailer = require('nodemailer');

// Tạo transporter gửi mail (sử dụng tài khoản Ethereal / Gmail đã cấu hình từ S1-02)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Hàm 1: Gửi email đặt lại mật khẩu (đã có từ S1-02)
const sendResetEmail = async (toEmail, resetLink) => {
    const mailOptions = {
        from: '"Hệ thống CRM Doanh Nghiệp" <no-reply@crm-system.com>',
        to: toEmail,
        subject: '[CRM] Yêu cầu đặt lại mật khẩu của bạn',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                <h2 style="color: #ff6b00; text-align: center;">Khôi phục mật khẩu tài khoản CRM</h2>
                <p>Xin chào,</p>
                <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #ff6b00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        ĐẶT LẠI MẬT KHẨU
                    </a>
                </div>
                <p>Liên kết này chỉ có hiệu lực trong vòng <strong>30 phút</strong>.</p>
                <p style="color: #64748b; font-size: 13px;">Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(` Đã gửi email reset password thành công tới: ${toEmail}`);
        if (process.env.EMAIL_HOST?.includes('ethereal')) {
            console.log(` Xem email thử nghiệm tại: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    } catch (error) {
        console.error('Lỗi khi gửi email qua nodemailer:', error);
        console.log(` [GIẢ LẬP GỬI MAIL] Link reset password: ${resetLink}`);
        return null;
    }
};

// Hàm 2: Gửi email kích hoạt tài khoản kèm mật khẩu tạm cho nhân viên mới (S1-06)
const sendWelcomeEmail = async (toEmail, fullName, tempPassword) => {
    const loginUrl = 'http://localhost:5173/login';
    const mailOptions = {
        from: '"Hệ thống CRM Doanh Nghiệp" <admin@crm-system.com>',
        to: toEmail,
        subject: '[CRM] Chào mừng nhân sự mới - Thông tin tài khoản của bạn',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px;">
                <h2 style="color: #ff6b00; text-align: center;">Chào mừng bạn gia nhập đội ngũ!</h2>
                <p>Xin chào <strong>${fullName}</strong>,</p>
                <p>Tài khoản nhân sự của bạn trên hệ thống CRM đã được quản trị viên kích hoạt thành công. Dưới đây là thông tin đăng nhập tạm thời:</p>
                
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ff6b00;">
                    <p style="margin: 4px 0;">- <strong>Đường dẫn đăng nhập:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                    <p style="margin: 4px 0;">- <strong>Tên đăng nhập (Email):</strong> <code style="color: #0f172a; font-weight: bold;">${toEmail}</code></p>
                    <p style="margin: 4px 0;">- <strong>Mật khẩu tạm:</strong> <code style="background: #e2e8f0; padding: 2px 6px; font-weight: bold; color: #dc2626;">${tempPassword}</code></p>
                </div>

                <p style="color: #b45309; font-size: 13px;">* <strong>Lưu ý bảo mật:</strong> Để đảm bảo an toàn, vui lòng đăng nhập và đổi sang mật khẩu cá nhân của bạn ngay trong lần đầu truy cập.</p>
                <p>Trân trọng,<br/><strong>Ban Quản Trị Hệ Thống CRM</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(` Đã gửi email thông tin tài khoản mới tới: ${toEmail}`);
        if (process.env.EMAIL_HOST?.includes('ethereal')) {
            console.log(` Xem email tài khoản mới tại: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    } catch (error) {
        console.log(` [GIẢ LẬP GỬI MAIL] Đã tạo tài khoản cho ${toEmail} | Mật khẩu tạm: ${tempPassword}`);
        return null;
    }
};

module.exports = { sendResetEmail, sendWelcomeEmail };