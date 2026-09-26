-- 1. Tạo bảng Vai trò (Roles)
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Tạo bảng Nhóm người dùng (Groups)
CREATE TABLE IF NOT EXISTS groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Tạo bảng Người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role_id INT,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);