const db = require('../src/config/db');

async function setup() {
  console.log('🔄 Đang kiểm tra và cập nhật cấu trúc cơ sở dữ liệu...');

  // 1. Tạo bảng audit_logs (S2-04)
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      user_name VARCHAR(100) NULL,
      action_type VARCHAR(100) NOT NULL,
      entity_name VARCHAR(100) NULL,
      entity_type VARCHAR(100) NULL,
      entity_id INT NULL,
      before_value TEXT NULL,
      after_value TEXT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Cập nhật các cột của bảng users (S1-01, S1-03)
  const [userCols] = await db.query('SHOW COLUMNS FROM users');
  const userColNames = userCols.map(c => c.Field);
  
  if (!userColNames.includes('failed_login_attempts')) {
    await db.query('ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0');
  }
  if (!userColNames.includes('lock_until')) {
    await db.query('ALTER TABLE users ADD COLUMN lock_until DATETIME NULL');
  }
  if (!userColNames.includes('reset_token')) {
    await db.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL');
  }
  if (!userColNames.includes('reset_token_expires')) {
    await db.query('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL');
  }

  // 3. Cập nhật các cột của bảng customers (S3-01, S3-04, S3-05)
  const [custCols] = await db.query('SHOW COLUMNS FROM customers');
  const custColNames = custCols.map(c => c.Field);

  if (!custColNames.includes('company_name')) {
    await db.query('ALTER TABLE customers ADD COLUMN company_name VARCHAR(255) NULL');
    await db.query('UPDATE customers SET company_name = name WHERE company_name IS NULL');
  }
  if (!custColNames.includes('tax_code')) {
    await db.query('ALTER TABLE customers ADD COLUMN tax_code VARCHAR(50) NULL');
  }
  if (!custColNames.includes('website')) {
    await db.query('ALTER TABLE customers ADD COLUMN website VARCHAR(255) NULL');
  }
  if (!custColNames.includes('address')) {
    await db.query('ALTER TABLE customers ADD COLUMN address VARCHAR(255) NULL');
  }
  if (!custColNames.includes('industry')) {
    await db.query('ALTER TABLE customers ADD COLUMN industry VARCHAR(100) NULL DEFAULT "Công nghệ thông tin"');
  }
  if (!custColNames.includes('company_size')) {
    await db.query('ALTER TABLE customers ADD COLUMN company_size VARCHAR(50) NULL DEFAULT "51-200 nhân sự"');
  }
  if (!custColNames.includes('status')) {
    await db.query('ALTER TABLE customers ADD COLUMN status VARCHAR(50) NULL DEFAULT "Tiềm năng"');
  }
  if (!custColNames.includes('total_contract_value')) {
    await db.query('ALTER TABLE customers ADD COLUMN total_contract_value DECIMAL(15,2) DEFAULT 0');
  }
  if (!custColNames.includes('parent_id')) {
    await db.query('ALTER TABLE customers ADD COLUMN parent_id INT NULL');
  }
  if (!custColNames.includes('custom_fields')) {
    await db.query('ALTER TABLE customers ADD COLUMN custom_fields LONGTEXT NULL');
  }
  if (!custColNames.includes('last_contacted_at')) {
    await db.query('ALTER TABLE customers ADD COLUMN last_contacted_at DATETIME NULL');
  }
  if (!custColNames.includes('risk_level')) {
    await db.query('ALTER TABLE customers ADD COLUMN risk_level VARCHAR(50) DEFAULT "Bình thường"');
  }

  // 4. Bảng customer_contacts
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      position VARCHAR(100) NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100) NULL,
      decision_role VARCHAR(100) DEFAULT 'Người dùng cuối',
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 5. Bảng customer_activities
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      user_id INT NULL,
      activity_type VARCHAR(50) DEFAULT 'Ghi chú',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 6. Bảng support_tickets
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      priority VARCHAR(50) DEFAULT 'Cao',
      status VARCHAR(50) DEFAULT 'Mới',
      assigned_to INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 7. Bảng deals
  await db.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) DEFAULT 0,
      stage VARCHAR(100) DEFAULT 'Khởi tạo',
      status VARCHAR(50) DEFAULT 'OPEN',
      probability INT DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
  `);

  // 8. Bảng saved_filters
  await db.query(`
    CREATE TABLE IF NOT EXISTS saved_filters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      filter_name VARCHAR(255) NOT NULL,
      criteria LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Bảng custom_fields
  await db.query(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id INT AUTO_INCREMENT PRIMARY KEY,
      field_name VARCHAR(100) NOT NULL,
      field_key VARCHAR(100) NOT NULL,
      field_type VARCHAR(50) NOT NULL DEFAULT 'text',
      entity_type VARCHAR(50) NOT NULL DEFAULT 'customer',
      is_required BOOLEAN DEFAULT FALSE,
      options TEXT NULL,
      status VARCHAR(20) DEFAULT 'active',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed sample custom field if empty
  const [cfs] = await db.query('SELECT COUNT(*) as cnt FROM custom_fields');
  if (cfs[0].cnt === 0) {
    await db.query(`
      INSERT INTO custom_fields (field_name, field_key, field_type, entity_type, is_required)
      VALUES 
      ('Ngân sách dự kiến', 'budget', 'number', 'customer', FALSE),
      ('Ghi chú CRM nội bộ', 'crm_note', 'text', 'customer', FALSE)
    `);
  }

  console.log('✅ Khởi tạo và cập nhật cơ sở dữ liệu thành công!');
  process.exit(0);
}

setup().catch(err => {
  console.error('❌ Lỗi setup DB:', err);
  process.exit(1);
});
