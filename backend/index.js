const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Đọc các biến từ file .env (như Bính vừa setup)
const usersRouter = require('./routes/users');
const app = express();
const PORT = process.env.PORT || 3000;

// Khai báo Middleware
app.use(cors());
app.use(express.json()); // Giúp Backend đọc được dữ liệu JSON từ Frontend gửi lên
app.use(express.urlencoded({ extended: true }));
app.use('/api/users', usersRouter);
// Khởi tạo một Route cơ bản để test
app.get('/api/v1', (req, res) => {
    res.json({
        status: "success",
        message: "Hệ thống Backend CRM đang hoạt động!"
    });
});

// Lắng nghe các kết nối
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});