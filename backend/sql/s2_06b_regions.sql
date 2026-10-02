CREATE TABLE IF NOT EXISTS regions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_regions_code (code),
  UNIQUE KEY uq_regions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `groups`
  ADD COLUMN region_id INT NULL,
  ADD KEY idx_groups_region (region_id),
  ADD CONSTRAINT fk_groups_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT;

INSERT INTO regions (code, name) VALUES ('MB', 'Miền Bắc'), ('MT', 'Miền Trung'), ('MN', 'Miền Nam');