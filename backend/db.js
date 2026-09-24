const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Nếu MySQL của bạn có mật khẩu, hãy điền vào giữa hai dấu nháy đơn
  database: process.env.DB_NAME || 'crm_db', // Điền đúng tên database của dự án bạn đã tạo
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;