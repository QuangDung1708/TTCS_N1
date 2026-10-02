const express = require('express');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const app = express();

// Khai báo PORT ở đầu để tránh lỗi TDZ (Temporal Dead Zone)
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Khai báo các Routes API
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
// Chỉ chạy app.listen khi KHÔNG ở chế độ kiểm thử (test)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(` Server Backend đang chạy mượt mà tại cổng ${PORT}`);
  });
}

// Xuất app để Supertest sử dụng
module.exports = app;