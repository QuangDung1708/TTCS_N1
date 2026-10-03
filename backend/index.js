const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Khai báo các Routes
const authRoutes = require('./src/routes/authRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const userRoutes = require('./src/routes/userRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const customFieldRoutes = require('./src/routes/customFieldRoutes');
const pipelineStageRoutes = require('./src/routes/pipelineStageRoutes');
const dealReasonRoutes = require('./src/routes/dealReasonRoutes');
const competitorRoutes = require('./src/routes/competitorRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Phục vụ thư mục static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Đăng ký API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/pipeline-stages', pipelineStageRoutes);
app.use('/api/deal-reasons', dealReasonRoutes);
app.use('/api/competitors', competitorRoutes);

// Các route phụ trợ nếu có
try {
    app.use('/api/contacts', require('./src/routes/contactRoutes'));
} catch (e) {}

try {
    app.use('/api/audit-logs', require('./src/routes/auditLogRoutes'));
} catch (e) {}

try {
    app.use('/api/groups', require('./src/routes/groupRoutes'));
} catch (e) {}

// Khởi chạy server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server đang chạy trên cổng ${PORT}`);
    });
}

module.exports = app;