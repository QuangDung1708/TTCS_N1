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
-- Bảng quản lý Danh mục sản phẩm & Dịch vụ (Task N1-118)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã sản phẩm',
    name VARCHAR(255) NOT NULL COMMENT 'Tên sản phẩm / dịch vụ',
    type ENUM('ONE_TIME', 'SUBSCRIPTION') NOT NULL DEFAULT 'ONE_TIME' COMMENT 'Loại: Sản phẩm 1 lần hoặc Dịch vụ thuê bao',
    unit VARCHAR(50) NOT NULL COMMENT 'Đơn vị tính (Chiếc, Tháng, Gói,...)',
    list_price DECIMAL(15, 2) NOT NULL COMMENT 'Giá niêm yết',
    floor_price DECIMAL(15, 2) NOT NULL COMMENT 'Giá sàn (dùng để xác định duyệt chiết khấu)',
    cost_price DECIMAL(15, 2) NULL COMMENT 'Giá vốn (Chỉ Giám đốc kinh doanh xem/sửa)',
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái (ACTIVE: Đang bán, INACTIVE: Ngừng kinh doanh)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Thêm dữ liệu mẫu cho bảng products để test API
INSERT INTO products (code, name, type, unit, list_price, floor_price, cost_price, status) VALUES
('SP001', 'Phần mềm CRM Dùng 1 Lần', 'ONE_TIME', 'Bộ', 10000000.00, 8000000.00, 5000000.00, 'ACTIVE'),
('SP002', 'Gói Thuê Bao Server Hàng Tháng', 'SUBSCRIPTION', 'Tháng', 2000000.00, 1500000.00, 1000000.00, 'ACTIVE');
-- 4. Chèn dữ liệu mẫu (Seed) để lát nữa test API
INSERT INTO roles (role_name, description) VALUES ('Admin', 'Quản trị viên'), ('Employee', 'Nhân viên');
-- Mật khẩu mẫu dưới đây là chuỗi đã được mã hóa (bcrypt) của chữ: 123456aA@
INSERT INTO users (email, password, full_name, role_id) 
VALUES ('admin@gmail.com', '$2a$10$XQ.E9R0O4J/X8n/2V5D.O.uB7g3j4I5.oZ8Q9c5y9.5l6m7n8o9p0', 'Admin System', 1);