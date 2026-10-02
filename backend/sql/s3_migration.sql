USE crm_db;

-- 1. Bang categories
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) CHARACTER SET utf8mb4;

-- 2. Bang products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NULL,
    unit VARCHAR(50) NULL,
    list_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    floor_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4;

-- 3. Hai cot tham chieu danh muc trong customers
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS industry_id INT NULL,
    ADD COLUMN IF NOT EXISTS lead_source_id INT NULL;

-- 4. Cot status trong users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
UPDATE users SET status = IF(is_active = 1, 'ACTIVE', 'INACTIVE');

-- 5. Bo khoa ngoai trung tren users.group_id
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_groups;