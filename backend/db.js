const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo pool kết nối tới MySQL sử dụng biến môi trường từ file .env
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ttcs_n1',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;