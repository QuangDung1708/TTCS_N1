const nodemailer = require('nodemailer');

// Cấu hình dịch vụ gửi mail qua Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER || 'crm.enterprise.system@gmail.com', // Email dùng để gửi đi
        pass: process.env.MAIL_PASS || 'your_16_digit_app_password'        // Mật khẩu ứng dụng (App Password)
    }
});

const sendResetEmail = async (toEmail, resetLink) => {
    const mailOptions = {
        from: '"Enterprise CRM" <no-reply@crm.vn>',
        to: toEmail,
        subject: '[Enterprise CRM] Liên kết đặt lại mật khẩu của bạn',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1677ff; margin-top: 0;">Yêu cầu đặt lại mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn nhận được email này vì đã gửi yêu cầu khôi phục mật khẩu tài khoản tại Enterprise CRM.</p>
                <div style="margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #1677ff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Đặt Lại Mật Khẩu
                    </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Hoặc dán liên kết sau vào trình duyệt:</p>
                <p style="font-size: 12px; word-break: break-all; color: #1677ff;">${resetLink}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #ef4444; font-size: 13px; margin: 0;"><b>Lưu ý theo quy định bảo mật:</b></p>
                <ul style="color: #64748b; font-size: 13px; padding-left: 20px; margin: 6px 0;">
                    <li>Liên kết chỉ có hiệu lực trong vòng <b>30 phút</b>.</li>
                    <li>Liên kết <b>chỉ sử dụng được 01 lần duy nhất</b>.</li>
                </ul>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };