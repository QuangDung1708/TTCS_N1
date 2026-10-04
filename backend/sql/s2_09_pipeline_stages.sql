-- =======================================================
-- [S2-09] BẢNG pipeline_stages
-- Chuỗi giai đoạn phễu bán hàng với xác suất thắng mặc định
-- =======================================================

USE crm_db;

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Tên giai đoạn (VD: Tiếp cận, Xác định nhu cầu...)',
    sort_order INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự bước trong pipeline (0, 1, 2...)',
    win_probability INT NOT NULL DEFAULT 0 COMMENT 'Xác suất thắng mặc định (0 - 100%)',
    exit_criteria TEXT NULL COMMENT 'Điều kiện bắt buộc để rời giai đoạn (JSON text hoặc mô tả)',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Trạng thái: TRUE = đang dùng, FALSE = ẩn (không xóa để bảo toàn cơ hội cũ)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_stage_name (name),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Giai đoạn pipeline phễu bán hàng';

-- =======================================================
-- DỮ LIỆU MẪU: 6 giai đoạn chuẩn nghiệp vụ CRM
-- =======================================================
INSERT INTO pipeline_stages (name, sort_order, win_probability, exit_criteria) VALUES
('Tiếp cận', 1, 10, 'Đã liên hệ lần đầu với khách hàng tiềm năng'),
('Xác định nhu cầu', 2, 25, 'Đã ghi nhận nhu cầu cụ thể của khách hàng'),
('Đề xuất giải pháp', 3, 50, 'Đã gửi đề xuất hoặc bản trình bày giải pháp'),
('Báo giá', 4, 65, 'Đã gửi báo giá chính thức cho khách hàng'),
('Đàm phán', 5, 80, 'Đang thương lượng điều khoản hợp đồng'),
('Chốt', 6, 100, 'Khách hàng đã ký hợp đồng hoặc xác nhận đặt hàng')
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), win_probability = VALUES(win_probability);
