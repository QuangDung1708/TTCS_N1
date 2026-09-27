const mysql = require('mysql2/promise');
require('dotenv').config();

const seedData = async () => {
  try {
    console.log('🚀 Đang kết nối Cơ sở dữ liệu...');

    // Lấy thông số cấu hình từ file .env
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ttcs_n1', // Tự động lấy tên DB từ .env
    });

    console.log('✅ Kết nối thành công! Bắt đầu tạo các bảng...');

    // 1. Tạo bảng roles
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
      );
    `);

    // 2. Chèn dữ liệu vai trò mẫu
    await connection.query(`
      INSERT IGNORE INTO roles (id, role_name) VALUES
      (1, 'Admin'),
      (2, 'Director'),
      (3, 'Leader'),
      (4, 'Sales');
    `);

    // 3. Tạo bảng groups
    await connection.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        leader_id INT NULL
      );
    `);

    console.log('🎉 Khởi tạo các bảng Roles và Groups thành công!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo CSDL:', error.message);
    process.exit(1);
  }
};

seedData();