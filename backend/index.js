const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Đăng ký route profile
const userProfileRoutes = require('./userProfileRoutes');
app.use('/api', userProfileRoutes);

app.get('/api/v1', (req, res) => {
    res.json({
        status: "success",
        message: "Server đang chạy ổn định!"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});