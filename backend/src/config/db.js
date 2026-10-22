const mysql = require("mysql2/promise");
require("dotenv").config(); // Load biến môi trường từ file .env

// Tạo pool kết nối để tối ưu hiệu suất (chuẩn doanh nghiệp)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "crm_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
