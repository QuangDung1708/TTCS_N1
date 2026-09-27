-- Migration cho ticket S1-10: Lock user + transfer data
-- Chạy: mysql -u root ttcs_n1 -e "source migration_s1_10.sql"
 
-- 1. Bổ sung cột còn thiếu trong users (status, token_version)
--    Đồng thời thêm reset_token/reset_token_expires vì authController.js
--    đã dùng 2 cột này nhưng schema.sql cũ chưa có (repo bị lỗi thời).
ALTER TABLE users
  ADD COLUMN status ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN token_version INT NOT NULL DEFAULT 0,
  ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL,
  ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;
 
-- 2. Bảng customers (tối giản, đủ để test transfer owner_id)
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    owner_id INT,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);
 
-- 3. Bảng audit_logs để ghi nhật ký hành động
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id INT,
    action VARCHAR(100) NOT NULL,
    target_id INT,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);