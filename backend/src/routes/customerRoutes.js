const express = require('express');
const router = express.Router();

let db;
try {
  db = require('../../config/db');
} catch (e1) {
  try { db = require('../config/db'); } catch (e2) { db = require('../../db'); }
}

// Tự động kiểm tra và bổ sung bảng tệp đính kèm & cột customer_id cho deals nếu thiếu
const autoInitSprint3 = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NULL,
        file_size VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const [cols] = await db.query(`SHOW COLUMNS FROM deals LIKE 'customer_id'`);
    if (cols.length === 0) {
      await db.query(`ALTER TABLE deals ADD COLUMN customer_id INT NULL`);
    }
  } catch (e) {}
};
autoInitSprint3();

// 1. DANH SÁCH KHÁCH HÀNG (S3-01, S3-07)
router.get('/', async (req, res) => {
  try {
    const { keyword, status, industry, company_size, owner_id } = req.query;
    let sql = `
      SELECT c.*, u.full_name AS owner_name, p.name AS parent_name
      FROM customers c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN customers p ON c.parent_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (keyword) {
      sql += ` AND (c.name LIKE ? OR c.tax_code LIKE ? OR c.website LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status) { sql += ` AND c.status = ?`; params.push(status); }
    if (industry) { sql += ` AND c.industry = ?`; params.push(industry); }
    if (company_size) { sql += ` AND c.company_size = ?`; params.push(company_size); }
    if (owner_id) { sql += ` AND c.owner_id = ?`; params.push(owner_id); }

    sql += ` ORDER BY c.id DESC`;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải khách hàng: ' + err.message });
  }
});

// THÊM KHÁCH HÀNG (S3-01)
router.post('/', async (req, res) => {
  const { name, tax_code, industry, company_size, website, address, owner_id, parent_id, status } = req.body;
  if (!name) return res.status(400).json({ message: 'Tên công ty là bắt buộc!' });

  try {
    if (tax_code && tax_code.trim()) {
      const [exist] = await db.query('SELECT id FROM customers WHERE tax_code = ?', [tax_code.trim()]);
      if (exist.length > 0) return res.status(400).json({ message: `Mã số thuế "${tax_code}" đã tồn tại trên hệ thống!` });
    }

    const [result] = await db.query(
      `INSERT INTO customers (name, tax_code, industry, company_size, website, address, owner_id, parent_id, status, last_interaction_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [name.trim(), tax_code ? tax_code.trim() : null, industry, company_size, website, address, owner_id || null, parent_id || null, status || 'lead']
    );

    await db.query(`INSERT INTO customer_activities (customer_id, type, content) VALUES (?, 'note', 'Khai báo khách hàng mới')`, [result.insertId]).catch(() => {});
    res.json({ success: true, id: result.insertId, message: 'Thêm khách hàng thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi thêm khách hàng: ' + err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, tax_code, industry, company_size, website, address, owner_id, parent_id, status, risk_level } = req.body;
  try {
    if (tax_code && tax_code.trim()) {
      const [exist] = await db.query('SELECT id FROM customers WHERE tax_code = ? AND id != ?', [tax_code.trim(), id]);
      if (exist.length > 0) return res.status(400).json({ message: `Mã số thuế "${tax_code}" bị trùng lặp!` });
    }
    await db.query(
      `UPDATE customers SET name=?, tax_code=?, industry=?, company_size=?, website=?, address=?, owner_id=?, parent_id=?, status=?, risk_level=? WHERE id=?`,
      [name, tax_code || null, industry, company_size, website, address, owner_id || null, parent_id || null, status, risk_level || 'normal', id]
    );
    res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật: ' + err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa khách hàng!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa khách hàng' });
  }
});

// 1. API THÊM CƠ HỘI BÁN HÀNG TỰ ĐỘNG THÍCH ỨNG CỘT TRONG MYSQL
router.post('/:customerId/deals', async (req, res) => {
  const { customerId } = req.params;
  const { title, value, stage } = req.body;

  try {
    // Kiểm tra các cột thực tế đang có trong bảng deals
    const [cols] = await db.query(`SHOW COLUMNS FROM deals`);
    const colNames = cols.map(c => c.Field);

    // Chuẩn hóa giá trị tiền tệ: loại bỏ dấu chấm/phẩy nếu truyền dạng text
    const cleanValue = Number(String(value || 0).replace(/\./g, '').replace(/,/g, '')) || 0;

    // Tự động thêm cột customer_id nếu bảng deals chưa có
    if (!colNames.includes('customer_id')) {
      await db.query(`ALTER TABLE deals ADD COLUMN customer_id INT NULL`);
      colNames.push('customer_id');
    }

    // Tự động thêm cột value nếu chưa có
    if (!colNames.includes('value') && !colNames.includes('deal_value') && !colNames.includes('amount')) {
      await db.query(`ALTER TABLE deals ADD COLUMN value DECIMAL(15,2) DEFAULT 0`);
      colNames.push('value');
    }

    // Ghép dữ liệu insert tương ứng với tên cột thực tế
    const insertData = { customer_id: customerId };

    // Tên cơ hội (title / name / deal_name)
    if (colNames.includes('title')) insertData.title = title;
    else if (colNames.includes('name')) insertData.name = title;
    else if (colNames.includes('deal_name')) insertData.deal_name = title;
    else {
      await db.query(`ALTER TABLE deals ADD COLUMN title VARCHAR(255) NULL`);
      insertData.title = title;
    }

    // Giá trị cơ hội (value / deal_value / amount)
    if (colNames.includes('value')) insertData.value = cleanValue;
    else if (colNames.includes('deal_value')) insertData.deal_value = cleanValue;
    else if (colNames.includes('amount')) insertData.amount = cleanValue;

    // Giai đoạn (stage)
    if (colNames.includes('stage')) insertData.stage = stage || 'Won';

    const fields = Object.keys(insertData);
    const placeholders = fields.map(() => '?').join(', ');
    const valuesArr = fields.map(k => insertData[k]);

    await db.query(`INSERT INTO deals (${fields.join(', ')}) VALUES (${placeholders})`, valuesArr);

    // Ghi nhận nhật ký hoạt động (Dòng thời gian 360°)
    await db.query(
      `INSERT INTO customer_activities (customer_id, type, content) VALUES (?, 'note', ?)`,
      [customerId, `Tạo cơ hội kinh doanh mới: "${title}" - Giá trị: ${cleanValue.toLocaleString('vi-VN')} VNĐ`]
    ).catch(() => {});

    res.json({ success: true, message: 'Đã thêm cơ hội kinh doanh thành công!' });
  } catch (err) {
    console.error('Lỗi thêm deal:', err);
    res.status(500).json({ message: 'Lỗi thêm cơ hội: ' + err.message });
  }
});

// 2. CẬP NHẬT GET 360-VIEW ĐỂ CHUẨN HÓA DỮ LIỆU ĐỘNG TRẢ VỀ
// 2. HỒ SƠ 360° ĐỘNG 100% (S3-03 & S3-05)
router.get('/:id/360-view', async (req, res) => {
  const { id } = req.params;
  try {
    const [customer] = await db.query(`
      SELECT c.*, u.full_name AS owner_name, p.name AS parent_company_name 
      FROM customers c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN customers p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [id]);

    if (customer.length === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });

    const [contacts] = await db.query('SELECT * FROM contacts WHERE customer_id = ? ORDER BY is_primary DESC, id DESC', [id]);

    let rawDeals = [];
    try {
      const [dealRows] = await db.query('SELECT * FROM deals WHERE customer_id = ? ORDER BY id DESC', [id]);
      rawDeals = dealRows;
    } catch (e) { rawDeals = []; }

    // Hàm lấy giá trị tiền: ưu tiên cột có số > 0 (bỏ qua giá trị 0.00 mặc định)
    const extractDealValue = (d) => {
      const candidates = [
        d.actual_revenue,
        d.amount,
        d.value,
        d.expected_revenue,
        d.deal_value,
        d.price,
        d.total_value
      ];
      for (const val of candidates) {
        const num = Number(val);
        if (!isNaN(num) && num > 0) return num;
      }
      return 0;
    };

    // Hàm nhận diện trạng thái chốt hợp đồng (khớp cả "Chốt thành công (Won)", "Won", "Thành công")
    const isWonDeal = (stage) => {
      if (!stage) return false;
      const s = String(stage).toLowerCase();
      return s.includes('won') || s.includes('thành công') || s.includes('thắng');
    };

    const isLostDeal = (stage) => {
      if (!stage) return false;
      const s = String(stage).toLowerCase();
      return s.includes('lost') || s.includes('thất bại') || s.includes('thua');
    };

    // Chuẩn hóa danh sách deals cho Frontend
    const deals = rawDeals.map(d => ({
      ...d,
      title: d.title || d.name || d.deal_name || 'Cơ hội bán hàng',
      value: extractDealValue(d),
      stage: d.stage || d.stage_name || 'Won'
    }));

    let activities = [];
    try {
      const [actRows] = await db.query('SELECT * FROM customer_activities WHERE customer_id = ? ORDER BY created_at DESC LIMIT 500', [id]);
      activities = actRows;
    } catch (e) { activities = []; }

    const [subsidiaries] = await db.query('SELECT id, name, tax_code, status FROM customers WHERE parent_id = ?', [id]).catch(() => [[]]);
    const [tickets] = await db.query('SELECT * FROM support_tickets WHERE customer_id = ? ORDER BY id DESC', [id]).catch(() => [[]]);

    // TÍNH TOÁN CHỈ SỐ DOANH THU ĐỘNG
    const totalWon = deals.filter(d => isWonDeal(d.stage)).reduce((sum, d) => sum + d.value, 0);
    const totalOpen = deals.filter(d => !isWonDeal(d.stage) && !isLostDeal(d.stage)).reduce((sum, d) => sum + d.value, 0);

    // TÍNH DOANH THU TOÀN TẬP ĐOÀN (Bao gồm công ty mẹ + tất cả công ty con)
    let groupWon = totalWon;
    const rootParentId = customer[0].parent_id || id;
    try {
      const [groupCompanies] = await db.query(
        `SELECT id FROM customers WHERE id = ? OR parent_id = ?`,
        [rootParentId, rootParentId]
      );
      const groupIds = groupCompanies.map(c => c.id);
      if (groupIds.length > 0) {
        const [allGroupDeals] = await db.query(`SELECT * FROM deals WHERE customer_id IN (?)`, [groupIds]);
        groupWon = allGroupDeals
          .filter(d => isWonDeal(d.stage || d.stage_name))
          .reduce((sum, d) => sum + extractDealValue(d), 0);
      }
    } catch (e) {}

    res.json({
      customer: customer[0],
      contacts,
      deals,
      activities,
      subsidiaries,
      tickets,
      summary: {
        totalWon,
        totalOpen,
        groupWon,
        dealCount: deals.length,
        contactCount: contacts.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi nạp 360 view: ' + err.message });
  }
});

// Thêm Ghi chú / Hoạt động động từ trang 360
router.post('/:customerId/activities', async (req, res) => {
  const { customerId } = req.params;
  const { type, content } = req.body;
  try {
    await db.query(
      `INSERT INTO customer_activities (customer_id, type, content) VALUES (?, ?, ?)`,
      [customerId, type || 'note', content]
    );
    await db.query(`UPDATE customers SET last_interaction_at = NOW() WHERE id = ?`, [customerId]);
    res.json({ success: true, message: 'Đã lưu hoạt động tương tác!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lưu hoạt động' });
  }
});

// 3. THUẬT TOÁN PHÁT HIỆN TRÙNG TIẾNG VIỆT THÔNG MINH (S3-04)
router.get('/duplicates/detect', async (req, res) => {
  try {
    const [customers] = await db.query(`SELECT id, name, tax_code, website, industry, address FROM customers WHERE status != 'churned'`);

    // Chuẩn hóa tên: loại bỏ toàn bộ tiền tố "Công ty", "Cty", "TNHH", "Cổ phần", "CP", "Tập đoàn"...
    const cleanName = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/công\s+ty|cty|tnhh|cổ\s+phần|cp|tập\s+đoàn|mtv|trách\s+nhiệm\s+hữu\s+hạn|doanh\s+nghiệp|chi\s+nhánh/gi, '')
        .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, '')
        .trim();
    };

    const cleanWeb = (w) => {
      if (!w) return '';
      return w.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
    };

    const duplicatePairs = [];
    for (let i = 0; i < customers.length; i++) {
      for (let j = i + 1; j < customers.length; j++) {
        const c1 = customers[i];
        const c2 = customers[j];

        const sameTax = c1.tax_code && c2.tax_code && c1.tax_code.trim() !== '' && (c1.tax_code.trim() === c2.tax_code.trim());
        const sameWeb = c1.website && c2.website && cleanWeb(c1.website) !== '' && (cleanWeb(c1.website) === cleanWeb(c2.website));
        
        const n1 = cleanName(c1.name);
        const n2 = cleanName(c2.name);
        const sameName = n1 && n2 && (n1 === n2 || (n1.length >= 3 && n2.length >= 3 && (n1.includes(n2) || n2.includes(n1))));

        if (sameTax || sameWeb || sameName) {
          const reasons = [];
          if (sameTax) reasons.push('Trùng mã số thuế');
          if (sameWeb) reasons.push('Trùng tên miền website');
          if (sameName) reasons.push('Tên công ty gần giống nhau');

          duplicatePairs.push({
            id1: c1.id, name1: c1.name, tax1: c1.tax_code, web1: c1.website, ind1: c1.industry,
            id2: c2.id, name2: c2.name, tax2: c2.tax_code, web2: c2.website, ind2: c2.industry,
            reason: reasons.join(' & ')
          });
        }
      }
    }

    res.json(duplicatePairs);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi phát hiện trùng lặp' });
  }
});

// GỘP KHÁCH HÀNG (S3-04)
router.post('/merge', async (req, res) => {
  const { masterId, duplicateId } = req.body;
  try {
    await db.query('UPDATE contacts SET customer_id = ? WHERE customer_id = ?', [masterId, duplicateId]);
    await db.query('UPDATE deals SET customer_id = ? WHERE customer_id = ?', [masterId, duplicateId]).catch(() => {});
    await db.query('UPDATE customer_activities SET customer_id = ? WHERE customer_id = ?', [masterId, duplicateId]).catch(() => {});
    await db.query('UPDATE support_tickets SET customer_id = ? WHERE customer_id = ?', [masterId, duplicateId]).catch(() => {});
    await db.query('DELETE FROM customers WHERE id = ?', [duplicateId]);

    await db.query(`INSERT INTO customer_activities (customer_id, type, content) VALUES (?, 'note', ?)`,
      [masterId, `Đã gộp toàn bộ dữ liệu từ khách hàng trùng lặp #${duplicateId}`]);

    res.json({ success: true, message: 'Đã gộp khách hàng thành công, bảo toàn toàn bộ dữ liệu!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi gộp bản ghi' });
  }
});

// CÁC ROUTE KHÁC (Contacts, Tickets, Care...)
router.get('/:customerId/contacts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contacts WHERE customer_id = ? ORDER BY is_primary DESC, id DESC', [req.params.customerId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Lỗi tải người liên hệ' }); }
});

router.post('/:customerId/contacts', async (req, res) => {
  const { customerId } = req.params;
  const { name, title, email, phone, buying_role, is_primary, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'Tên người liên hệ là bắt buộc!' });
  try {
    if (is_primary) await db.query('UPDATE contacts SET is_primary = FALSE WHERE customer_id = ?', [customerId]);
    await db.query(
      `INSERT INTO contacts (customer_id, name, title, email, phone, buying_role, is_primary, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, name, title, email, phone, buying_role || 'influencer', is_primary ? 1 : 0, notes || '']
    );
    res.json({ success: true, message: 'Thêm người liên hệ thành công!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi thêm người liên hệ' }); }
});

router.put('/contacts/:contactId/set-primary', async (req, res) => {
  const { contactId } = req.params;
  try {
    const [contact] = await db.query('SELECT customer_id FROM contacts WHERE id = ?', [contactId]);
    if (contact.length === 0) return res.status(404).json({ message: 'Không tìm thấy người liên hệ' });
    await db.query('UPDATE contacts SET is_primary = FALSE WHERE customer_id = ?', [contact[0].customer_id]);
    await db.query('UPDATE contacts SET is_primary = TRUE WHERE id = ?', [contactId]);
    res.json({ success: true, message: 'Đã đổi đầu mối chính!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi cập nhật' }); }
});

router.delete('/contacts/:contactId', async (req, res) => {
  try {
    await db.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa người liên hệ!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi xóa' }); }
});

router.get('/contacts/:contactId/history', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ch.*, c_old.name AS old_company_name, c_new.name AS new_company_name
      FROM contact_histories ch
      LEFT JOIN customers c_old ON ch.previous_customer_id = c_old.id
      LEFT JOIN customers c_new ON ch.new_customer_id = c_new.id
      WHERE ch.contact_id = ? ORDER BY ch.changed_at DESC
    `, [req.params.contactId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: 'Lỗi nạp lịch sử' }); }
});

router.put('/contacts/:contactId/transfer', async (req, res) => {
  const { contactId } = req.params;
  const { new_customer_id, note } = req.body;
  try {
    const [current] = await db.query('SELECT customer_id, name FROM contacts WHERE id = ?', [contactId]);
    if (current.length === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    const oldCustomerId = current[0].customer_id;
    await db.query(`INSERT INTO contact_histories (contact_id, previous_customer_id, new_customer_id, note) VALUES (?, ?, ?, ?)`,
      [contactId, oldCustomerId, new_customer_id, note || 'Chuyển công ty']).catch(() => {});
    await db.query('UPDATE contacts SET customer_id = ?, is_primary = FALSE WHERE id = ?', [new_customer_id, contactId]);
    res.json({ success: true, message: 'Chuyển công ty thành công và đã lưu vết lịch sử!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi chuyển công tác' }); }
});

// BULK IMPORT (S3-06)
router.post('/import/bulk', async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ message: 'Dữ liệu không hợp lệ!' });
  let success = 0, dup = 0;
  for (const item of records) {
    try {
      if (!item.name) continue;
      if (item.tax_code) {
        const [exist] = await db.query('SELECT id FROM customers WHERE tax_code = ?', [item.tax_code]);
        if (exist.length > 0) { dup++; continue; }
      }
      await db.query(
        'INSERT INTO customers (name, tax_code, industry, company_size, website, address, status, last_interaction_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [item.name, item.tax_code || null, item.industry || null, item.company_size || '1-50', item.website || null, item.address || null, 'lead']
      );
      success++;
    } catch (e) {}
  }
  res.json({ success: true, message: `Đã nhập thành công ${success} khách hàng. Bỏ qua ${dup} bản ghi trùng MST!` });
});

// TICKET & CSKH (S3-08)
router.post('/:customerId/tickets', async (req, res) => {
  const { customerId } = req.params;
  const { title, priority } = req.body;
  try {
    await db.query('INSERT INTO support_tickets (customer_id, title, priority, status) VALUES (?, ?, ?, ?)',
      [customerId, title, priority || 'medium', 'open']);
    const [openTickets] = await db.query(`SELECT COUNT(*) AS count FROM support_tickets WHERE customer_id = ? AND status = 'open'`, [customerId]);
    let risk = 'normal';
    if (openTickets[0].count >= 3) risk = 'danger';
    else if (openTickets[0].count >= 2) risk = 'warning';
    await db.query('UPDATE customers SET risk_level = ? WHERE id = ?', [risk, customerId]);
    res.json({ success: true, message: 'Đã tạo ticket và cập nhật cờ rủi ro tự động!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi ghi nhận ticket' }); }
});

// CHĂM SÓC ĐỊNH KỲ (S3-09)
router.get('/care/periodic', async (req, res) => {
  const days = Number(req.query.days) || 14;
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.full_name AS owner_name,
             DATEDIFF(NOW(), COALESCE(c.last_interaction_at, c.created_at)) AS days_inactive,
             (SELECT COALESCE(SUM(value), 0) FROM deals WHERE customer_id = c.id AND (stage = 'Won' OR stage = 'Đóng Thắng' OR stage = 'Won (Đã Ký)')) AS total_contract_value
      FROM customers c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE DATEDIFF(NOW(), COALESCE(c.last_interaction_at, c.created_at)) >= ?
      ORDER BY total_contract_value DESC, days_inactive DESC
    `, [days]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tải danh sách: ' + err.message });
  }
});

router.post('/care/mark-contacted/:id', async (req, res) => {
  try {
    await db.query(`UPDATE customers SET last_interaction_at = NOW(), risk_level = 'normal' WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Đã cập nhật trạng thái liên hệ!' });
  } catch (err) { res.status(500).json({ message: 'Lỗi cập nhật' }); }
});

module.exports = router;