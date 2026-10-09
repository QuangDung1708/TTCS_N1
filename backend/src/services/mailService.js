require('dotenv').config();
const nodemailer = require('nodemailer');

exports.sendResetPasswordEmail = async (toEmail, resetToken) => {
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').replace(/\s+/g, '');

    if (!user || !pass) {
        throw new Error('Chưa cấu hình tài khoản gửi mail trong backend/.env');
    }

    // Kết nối trực tiếp máy chủ SMTP của Google
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // dùng SSL
        auth: {
            user: user,
            pass: pass
        }
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"Hệ thống CRM Doanh Nghiệp" <${user}>`,
        to: toEmail,
        subject: 'Khôi phục mật khẩu tài khoản CRM của bạn',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #1677ff; margin-top: 0;">ENTERPRISE CRM</h2>
                <p>Mã xác thực trực tiếp của bạn:</p>
                <p style="font-size: 20px; font-weight: bold; color: #1677ff; letter-spacing: 1px;">${resetToken}</p>
                <p>Hoặc bấm vào liên kết dưới đây để đổi mật khẩu (hiệu lực trong 15 phút):</p>
                <p><a href="${resetUrl}" style="background-color: #1677ff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Đặt Lại Mật Khẩu</a></p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};