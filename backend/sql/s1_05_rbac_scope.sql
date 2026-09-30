-- 1. Bảng Groups (Nhóm / Đội ngũ kinh doanh)
CREATE TABLE IF NOT EXISTS `groups` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cấu trúc lại hoặc tạo mới bảng Roles (Có thêm data_scope)
-- data_scope nhận 3 giá trị chuẩn: 'ALL', 'GROUP', 'OWN'
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `data_scope` ENUM('ALL', 'GROUP', 'OWN') NOT NULL DEFAULT 'OWN',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bổ sung cột group_id vào bảng users (nếu chưa có)
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `group_id` INT NULL AFTER `role_id`;

-- Thêm khóa ngoại liên kết users với groups
ALTER TABLE `users`
ADD CONSTRAINT `fk_users_groups`
FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`)
ON DELETE SET NULL;

-- 4. Bảng Customers (Khách hàng mẫu để phục vụ kiểm thử phân quyền phạm vi ở N1-98 và N1-99)
CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `company` VARCHAR(150) NULL,
    `created_by` INT NOT NULL,  -- User sở hữu bản ghi
    `group_id` INT NOT NULL,    -- Thuộc nhóm nào
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);

-- =======================================================
-- 5. CHÈN DỮ LIỆU MẪU (SEED DATA ĐỂ TEST ĐA PHÂN QUYỀN)
-- =======================================================

-- Seed Roles với các quyền phạm vi tương ứng
INSERT INTO `roles` (`id`, `name`, `description`, `data_scope`) VALUES
(1, 'Director', 'Giám đốc kinh doanh - Xem tất cả', 'ALL'),
(2, 'Team Leader', 'Trưởng nhóm - Xem dữ liệu toàn nhóm', 'GROUP'),
(3, 'Sales Executive', 'Nhân viên kinh doanh - Chỉ xem của mình', 'OWN')
ON DUPLICATE KEY UPDATE `data_scope` = VALUES(`data_scope`);

-- Seed Groups (2 phòng ban kinh doanh)
INSERT INTO `groups` (`id`, `name`, `description`) VALUES
(1, 'Team Kinh Doanh A', 'Phụ trách thị trường Miền Bắc'),
(2, 'Team Kinh Doanh B', 'Phụ trách thị trường Miền Nam')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Cập nhật tài khoản Admin làm Giám đốc
UPDATE `users` SET `role_id` = 1, `group_id` = NULL WHERE `email` = 'admin@gmail.com';

-- Tạo tài khoản Trưởng nhóm A (Leader A)
-- Mật khẩu mặc định: 123456aA@
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `role_id`, `group_id`) VALUES
(2, 'leader_a@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Trưởng Nhóm A', 2, 1)
ON DUPLICATE KEY UPDATE `group_id` = 1, `role_id` = 2;

-- Tạo tài khoản Nhân viên Sales A1 (thuộc nhóm A)
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `role_id`, `group_id`) VALUES
(3, 'sales_a1@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Nhân Viên A1', 3, 1)
ON DUPLICATE KEY UPDATE `group_id` = 1, `role_id` = 3;

-- Tạo tài khoản Nhân viên Sales B1 (thuộc nhóm B)
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `role_id`, `group_id`) VALUES
(4, 'sales_b1@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Nhân Viên B1', 3, 2)
ON DUPLICATE KEY UPDATE `group_id` = 2, `role_id` = 3;

-- Seed dữ liệu Khách hàng để kiểm chứng phân quyền
INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `company`, `created_by`, `group_id`) VALUES
(1, 'Khách hàng của Sales A1', '0912345678', 'cust_a1@gmail.com', 'Tập đoàn Alpha', 3, 1),
(2, 'Khách hàng của Sales B1', '0987654321', 'cust_b1@gmail.com', 'Công ty Beta', 4, 2)
ON DUPLICATE KEY UPDATE `created_by` = VALUES(`created_by`);