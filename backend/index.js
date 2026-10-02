const express = require('express');
const cors = require('cors');
const userRoutes = require('./src/routes/userRoutes');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const path = require('path');
const app = express();
const categoryRoutes = require('./src/routes/categoryRoutes');
const customFieldRoutes = require('./src/routes/customFieldRoutes');

// Khai báo PORT ở đầu để tránh lỗi TDZ (Temporal Dead Zone)
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Khai báo các Routes API
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', require('./src/routes/contactRoutes'));
app.use('/api/audit-logs', require('./src/routes/auditLogRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/groups', require('./src/routes/groupRoutes'));
app.use('/api/categories', categoryRoutes);
app.use('/api/custom-fields', customFieldRoutes);
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(` Server Backend đang chạy mượt mà tại cổng ${PORT}`);
  });
}

// Xuất app để Supertest sử dụng
module.exports = app;