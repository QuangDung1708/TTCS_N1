const nodemailer = require('nodemailer');

// Khởi tạo Transporter
// Nếu chưa cấu hình SMTP thật trong .env, hệ thống sẽ in link reset ra terminal để test nhanh
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

const sendResetEmail = async (toEmail, resetLink) => {
    // Nếu chưa có cấu hình email trong .env, in ra console để dev test ngay
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n================ KHÔI PHỤC MẬT KHẨU ================');
        console.log(`Gửi tới: ${toEmail}`);
        console.log(`Link đặt lại mật khẩu (hiệu lực 30 phút):`);
        console.log(resetLink);
        console.log('====================================================\n');
        return true;
    }

    const mailOptions = {
        from: `"Hệ thống CRM" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Yêu cầu đặt lại mật khẩu tài khoản CRM',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a;">
                <h2>Yêu cầu đặt lại mật khẩu</h2>
                <p>Bạn nhận được email này vì đã gửi yêu cầu đặt lại mật khẩu cho tài khoản CRM.</p>
                <p>Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới (Liên kết có hiệu lực trong vòng 30 phút):</p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #ff6b00; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">ĐẶT LẠI MẬT KHẨU</a>
                <p style="margin-top: 20px; font-size: 13px; color: #64748b;">Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };