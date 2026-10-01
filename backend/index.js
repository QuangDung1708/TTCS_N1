const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Require file userRoutes
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route gốc
app.get('/api/v1', (req, res) => {
  res.json({ status: "success", message: "CRM Backend Online" });
});

// Tích hợp Route Users
app.use('/api/users', userRoutes);

// Catch-all route xử lý khi sai URL (đặt ở RẤT CỦA CÙNG)
app.use((req, res) => {
  res.status(404).json({ success: false, message: `API endpoint không tồn tại: ${req.originalUrl}` });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});