const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');

const app = express();

// Middleware: Cho phép Frontend gọi API (CORS) và đọc dữ liệu JSON
app.use(cors());
app.use(express.json()); 

// Khai báo các đường dẫn API
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// Bật Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server Backend đang chạy mượt mà tại cổng ${PORT}`);
});