-- 1. Chèn vai trò Admin (nếu chưa có)
INSERT INTO roles (id, role_name) 
VALUES (1, 'Admin')
ON DUPLICATE KEY UPDATE role_name = 'Admin';

-- 2. Chèn tài khoản Admin gốc
-- Mật khẩu gốc là "123456aA@" đã được mã hóa theo chuẩn Bcrypt
INSERT INTO users (email, password_hash, full_name, role_id) 
VALUES (
    'admin@crm.com', 
    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
    'System Admin', 
    1
)
ON DUPLICATE KEY UPDATE email = 'admin@crm.com';