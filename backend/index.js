const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Đưa dotenv lên trên cùng

const app = express();
const PORT = process.env.PORT || 3000;

// Khai báo các Route
const auditRoutes = require('./routes/auditRoutes');

// Khai báo Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sử dụng route audit-logs
app.use('/api/audit-logs', auditRoutes);

// Route test cơ bản
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