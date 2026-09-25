const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware cấu hình
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route kiểm tra hệ thống cơ bản
app.get('/api/v1', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hệ thống Backend CRM đang hoạt động!'
  });
});

// Đăng ký route User
app.use('/api/users', userRoutes);

// Lắng nghe cổng kết nối
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});