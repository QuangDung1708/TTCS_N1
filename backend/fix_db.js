const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  try {
    // Kết nối tới MySQL không cần chọn DB trước
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    // 1. Tự động tạo Database nếu chưa có
    await connection.query('CREATE DATABASE IF NOT EXISTS ttcs_n1;');
    await connection.query('USE ttcs_n1;');
    console.log('✅ Đã kết nối Database ttcs_n1 thành công!');

    // 2. Tạo bảng users cơ bản nếu chưa có
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        role_id INT,
        group_id INT,
        failed_attempts INT DEFAULT 0,
        lock_until DATETIME DEFAULT NULL,
        reset_token VARCHAR(255) DEFAULT NULL,
        reset_token_expiry DATETIME DEFAULT NULL
      );
    `);

    // 3. Đảm bảo 2 cột reset_token tồn tại
    try {
      await connection.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL');
      console.log('✅ Đã thêm cột reset_token');
    } catch (e) {
      console.log('ℹ️ Cột reset_token đã sẵn sàng');
    }

    try {
      await connection.query('ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL');
      console.log('✅ Đã thêm cột reset_token_expiry');
    } catch (e) {
      console.log('ℹ️ Cột reset_token_expiry đã sẵn sàng');
    }

    // 4. Tạo sẵn 1 tài khoản test admin@gmail.com (Mật khẩu: 123456) nếu chưa có
    const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@gmail.com']);
    if (rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('123456', 10);
      await connection.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
        ['admin@gmail.com', hash, 'Admin Test']
      );
      console.log('✅ Đã tạo tài khoản test: admin@gmail.com');
    }

    console.log('🚀 HOÀN TẤT SETUP DATABASE!');
    process.exit();
  } catch (err) {
    console.error('❌ Lỗi setup DB:', err.message);
    process.exit(1);
  }
}

fix();