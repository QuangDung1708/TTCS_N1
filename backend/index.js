const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Khởi tạo app Express
const app = express();

// Middleware toàn cục
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import các routes (chú ý đường dẫn ./src/routes/userRoutes nếu routes nằm trong thư mục src)
const userRoutes = require('./src/routes/userRoutes');
// const avatarRoutes = require('./src/routes/avatar.api'); // các route khác nếu có

// Đăng ký route chính
app.use('/api/users', userRoutes);

// Route kiểm tra trạng thái server
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running healthy' });
});

// Middleware xử lý lỗi 404 cho các route không tồn tại
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Đường dẫn không tồn tại' });
});

// Cổng lắng nghe
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  // Giữ Event Loop luôn hoạt động, ngăn Node.js tự clean exit
setInterval(() => {}, 1 << 30);
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});