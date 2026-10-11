require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('--- KIỂM TRA BIẾN MÔI TRƯỜNG ---');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS độ dài:', process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().length : 'Chưa nạp');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '',
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : ''
  }
});

// Tự gửi thư cho chính mình
transporter.sendMail({
  from: process.env.SMTP_USER,
  to: process.env.SMTP_USER,
  subject: '[CRM TEST] Kiểm tra kết nối gửi mail',
  text: 'Kết nối SMTP Nodemailer thành công 100%!'
}, (err, info) => {
  if (err) {
    console.error('\n❌ GỬI THẤT BẠI. LỖI CHÍNH XÁC LÀ:');
    console.error(err.message);
  } else {
    console.log('\n✅ THÀNH CÔNG RỰC RỠ: Thư đã bay vào hòm thư!');
    console.log('Chi tiết phản hồi:', info.response);
  }
});