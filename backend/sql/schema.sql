-- Tạo database (chạy lệnh này trước nếu chưa có DB)
CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_db;

-- 1. Bảng Vai trò (Chuẩn bị sẵn cho việc phân quyền menu ở S1-06)
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- 2. Bảng Phòng ban / Nhóm
CREATE TABLE groups_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- 3. Bảng Người dùng (Đáp ứng S1-01 và tiêu chí khóa 15 phút)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT,
    group_id INT,
    
    -- Cột phục vụ tiêu chí: Khóa 15 phút sau 5 lần sai
    failed_login_attempts INT DEFAULT 0,
    lock_until DATETIME NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE SET NULL
);

-- 4. Chèn dữ liệu mẫu (Seed) để lát nữa test API
INSERT INTO roles (role_name, description) VALUES ('Admin', 'Quản trị viên'), ('Employee', 'Nhân viên');
-- Mật khẩu mẫu dưới đây là chuỗi đã được mã hóa (bcrypt) của chữ: 123456aA@
INSERT INTO users (email, password, full_name, role_id) 
VALUES ('admin@gmail.com', '$2a$10$XQ.E9R0O4J/X8n/2V5D.O.uB7g3j4I5.oZ8Q9c5y9.5l6m7n8o9p0', 'Admin System', 1);