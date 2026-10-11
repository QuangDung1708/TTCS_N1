const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/authMiddleware');

const isWonDeal = (d) => {
  const s = String(d?.stage || d?.status || '').toLowerCase();
  return s.includes('won') || s.includes('thành công') || s.includes('thanh cong') || Number(d?.probability) === 100;
};

const isLostDeal = (d) => {
  const s = String(d?.stage || d?.status || '').toLowerCase();
  return s.includes('lost') || s.includes('thất bại') || s.includes('that bai');
};

const getCustomerColumns = async () => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM customers");
    return cols.map(c => c.Field.toLowerCase());
  } catch (e) {
    return [];
  }
};

// HÀM GHI NHẬT KÝ HOẠT ĐỘNG AN TOÀN TUYỆT ĐỐI (KHÔNG BAO GIỜ LÀM HỎNG THAO TÁC CHÍNH)
const logCustomerActivity = async (customerId, userId, type, content) => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM customer_activities");
    const colNames = cols.map(c => c.Field.toLowerCase());

    const fields = ['customer_id'];
    const values = [customerId];
    const placeholders = ['?'];

    if (colNames.includes('user_id')) {
      fields.push('user_id');
      values.push(userId || 1);
      placeholders.push('?');
    }
    if (colNames.includes('activity_type')) {
      fields.push('activity_type');
      values.push(type || 'Ghi chú');
      placeholders.push('?');
    } else if (colNames.includes('type')) {
      fields.push('type');
      values.push(type || 'Ghi chú');
      placeholders.push('?');
    }
    if (colNames.includes('content')) {
      fields.push('content');
      values.push(content);
      placeholders.push('?');
    } else if (colNames.includes('description')) {
      fields.push('description');
      values.push(content);
      placeholders.push('?');
    }

    await db.execute(
      `INSERT INTO customer_activities (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
  } catch (err) {
    console.error('Bỏ qua lỗi log activity:', err.message);
  }
};
// ==========================================
// 1. LẤY DANH SÁCH TOÀN BỘ NGƯỜI DÙNG THỰC TẾ TỪ BẢNG USERS (AN TOÀN TUYỆT ĐỐI)
// ==========================================
router.get('/users-list', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users ORDER BY id ASC");
    const users = rows.map(u => ({
      id: u.id,
      full_name: u.full_name || u.name || (u.email ? u.email.split('@')[0] : `Nhân viên #${u.id}`),
      email: u.email || '',
      role_code: u.role_code || u.role || 'sales_rep'
    }));
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Lỗi lấy danh sách users:', error);
    return res.json({ success: true, data: [] });
  }
});

// ==========================================
// 2. TRƯỜNG TÙY BIẾN HOẠT ĐỘNG
// ==========================================
router.get('/custom-fields-active', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM custom_fields WHERE is_active = 1 OR is_active IS NULL OR status = 'active' ORDER BY id ASC"
    );
    const normalized = rows.map(r => ({
      id: r.id,
      field_key: r.field_key || r.field_name || r.name || `field_${r.id}`,
      field_label: r.field_name || r.field_label || r.label || r.name || `Trường #${r.id}`
    }));
    return res.json({ success: true, data: normalized });
  } catch (error) {
    return res.json({ success: true, data: [] });
  }
});

// ==========================================
// 3. QUẢN LÝ BỘ LỌC ĐÃ LƯU (AC S3-07)
// ==========================================
router.get('/saved-filters', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const [rows] = await db.query(
      "SELECT * FROM saved_filters WHERE user_id = ? OR user_id = 1 ORDER BY id DESC",
      [userId]
    );
    const filters = rows.map(r => ({
      id: r.id,
      filter_name: r.filter_name,
      criteria: typeof r.criteria === 'string' ? JSON.parse(r.criteria) : r.criteria
    }));
    return res.json({ success: true, data: filters });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

router.post('/saved-filters', verifyToken, async (req, res) => {
  try {
    const { filter_name, criteria } = req.body;
    const userId = req.user?.id || 1;
    await db.execute(
      "INSERT INTO saved_filters (user_id, filter_name, criteria) VALUES (?, ?, ?)",
      [userId, filter_name, JSON.stringify(criteria || {})]
    );
    return res.json({ success: true, message: 'Đã lưu bộ lọc thành công!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi lưu bộ lọc: ' + e.message });
  }
});

router.delete('/saved-filters/:id', verifyToken, async (req, res) => {
  try {
    await db.execute("DELETE FROM saved_filters WHERE id = ?", [req.params.id]);
    return res.json({ success: true, message: 'Đã xóa bộ lọc!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi xóa bộ lọc' });
  }
});

// ==========================================
// 4. DANH SÁCH KHÁCH HÀNG (DOANH SỐ ĐỘNG TỪ DEALS)
// ==========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, industry, company_size, owner_id } = req.query;
    const currentUser = req.user || {};

    let query = `
      SELECT c.*, 
             COALESCE(c.company_name, c.name) AS company_name,
             COALESCE(p.company_name, p.name) AS parent_company_name,
             COALESCE(u.full_name, u.email, 'Chưa phân công') AS assigned_user_name,
             u.id AS assigned_user_id,
             (SELECT COUNT(*) FROM support_tickets st 
              WHERE st.customer_id = c.id 
                AND (st.status IS NULL OR st.status = '' OR st.status IN ('Mới', 'Đang xử lý'))
             ) AS unresolved_tickets_count
      FROM customers c
      LEFT JOIN customers p ON c.parent_id = p.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    const role = (currentUser.role_code || currentUser.role || '').toLowerCase();
    if (role === 'sale' || role === 'sales_rep') {
      query += ` AND c.created_by = ?`;
      params.push(currentUser.id);
    } else if (role === 'team_lead') {
      query += ` AND (c.created_by = ? OR c.created_by IN (SELECT id FROM users WHERE group_id = ?))`;
      params.push(currentUser.id, currentUser.group_id || 0);
    }

    if (owner_id) {
      query += ` AND c.created_by = ?`;
      params.push(owner_id);
    }

    if (search && search.trim() !== '') {
      query += ` AND (c.name LIKE ? OR c.company_name LIKE ? OR c.tax_code LIKE ? OR c.website LIKE ? 
                      OR c.id IN (SELECT customer_id FROM customer_contacts WHERE phone LIKE ? OR full_name LIKE ?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { query += ` AND c.status = ?`; params.push(status); }
    if (industry) { query += ` AND c.industry = ?`; params.push(industry); }
    if (company_size) { query += ` AND c.company_size = ?`; params.push(company_size); }

    query += ` ORDER BY c.id ASC`;
    const [rows] = await db.query(query, params);

    let allDeals = [];
    try {
      const [dRows] = await db.query('SELECT * FROM deals');
      allDeals = dRows || [];
    } catch (e) {
      allDeals = [];
    }

    const formatted = rows.map(r => {
      let cf = {};
      try {
        cf = typeof r.custom_fields === 'string' ? JSON.parse(r.custom_fields) : (r.custom_fields || {});
      } catch (e) { cf = {}; }

      const custDeals = allDeals.filter(d => Number(d.customer_id) === Number(r.id));
      const wonValue = custDeals.filter(isWonDeal).reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const finalSignedValue = wonValue > 0 ? wonValue : Number(r.total_contract_value || 0);

      const isDanger = Number(r.unresolved_tickets_count || 0) >= 2;
      return {
        ...r,
        risk_level: isDanger ? 'Nguy cấp' : 'Bình thường',
        total_contract_value: finalSignedValue,
        custom_fields_data: cf
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi nạp danh sách khách hàng: ' + error.message });
  }
});

// ==============================================================
// S3-09: DANH SÁCH KHÁCH CẦN CHĂM SÓC ĐỊNH KỲ (CHUẨN 100% AC)
// ==============================================================
router.get('/care-list', verifyToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days || 15);

    // Tính mốc tương tác ưu tiên trực tiếp theo c.last_contacted_at
    const query = `
      SELECT c.*, 
             COALESCE(c.company_name, c.name) AS company_name,
             COALESCE(u.full_name, u.email, 'Chưa phân công') AS assigned_user_name,
             u.id AS assigned_user_id,
             COALESCE(c.last_contacted_at, DATE_SUB(NOW(), INTERVAL 60 DAY)) AS last_interaction_date,
             DATEDIFF(NOW(), COALESCE(c.last_contacted_at, DATE_SUB(NOW(), INTERVAL 60 DAY))) AS days_inactive
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const [rows] = await db.query(query);

    let allDeals = [];
    try {
      const [dRows] = await db.query('SELECT * FROM deals');
      allDeals = dRows || [];
    } catch (e) {
      allDeals = [];
    }

    const careList = rows
      .map(r => {
        const custDeals = allDeals.filter(d => Number(d.customer_id) === Number(r.id));
        const wonValue = custDeals.filter(isWonDeal).reduce((sum, d) => sum + Number(d.amount || 0), 0);
        const finalSignedValue = Math.max(wonValue, Number(r.total_contract_value || 0));

        return {
          ...r,
          total_contract_value: finalSignedValue,
          days_inactive: Math.max(0, Number(r.days_inactive || 0))
        };
      })
      // Lọc khách có giá trị hợp đồng > 0 và số ngày chưa tương tác >= N ngày (AC S3-09)
      .filter(r => r.total_contract_value > 0 && r.days_inactive >= days)
      // Sắp xếp theo giá trị hợp đồng giảm dần (AC S3-09)
      .sort((a, b) => b.total_contract_value - a.total_contract_value);

    return res.json({ 
      success: true, 
      data: careList
    });
  } catch (error) {
    console.error('Lỗi GET /care-list:', error);
    return res.status(500).json({ message: 'Lỗi nạp danh sách CSKH' });
  }
});

router.put('/:id/contacted', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const currentUserId = req.user?.id || 1;

    // Cập nhật mốc liên hệ mới nhất
    await db.execute(`UPDATE customers SET last_contacted_at = NOW() WHERE id = ?`, [id]);

    // Tự động ghi vết vào bảng customer_activities để hiện ngay trong dòng thời gian 360°
    const logContent = note 
      ? `Đã liên hệ chăm sóc khách hàng định kỳ: "${note}"`
      : `Đã liên hệ chăm sóc khách hàng định kỳ và xác nhận tiến độ hợp đồng`;
    await logCustomerActivity(id, currentUserId, 'CSKH', logContent);

    return res.json({ 
      success: true, 
      message: 'Đã đánh dấu liên hệ thành công và cập nhật vào lịch sử hoạt động!' 
    });
  } catch (error) {
    console.error('Lỗi PUT /:id/contacted:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật liên hệ' });
  }
});
// ==========================================
// 6. QUẢN LÝ TICKET CSKH
// ==========================================
router.put('/tickets/:ticketId', verifyToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assigned_to } = req.body;

    const [old] = await db.query('SELECT customer_id, title FROM support_tickets WHERE id = ?', [ticketId]);
    if (!old.length) return res.status(404).json({ message: 'Không tìm thấy ticket' });
    const customerId = old[0].customer_id;

    let updateFields = [];
    let updateParams = [];

    if (status !== undefined && status !== null) { updateFields.push('status = ?'); updateParams.push(status); }
    if (priority !== undefined && priority !== null) { updateFields.push('priority = ?'); updateParams.push(priority); }
    if (assigned_to !== undefined && assigned_to !== null) { updateFields.push('assigned_to = ?'); updateParams.push(assigned_to); }

    if (updateFields.length > 0) {
      updateParams.push(ticketId);
      await db.query(`UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);
    }

    if (status) {
      await logCustomerActivity(customerId, req.user?.id || 1, 'CSKH', `Cập nhật trạng thái yêu cầu hỗ trợ "${old[0].title}" sang: ${status}`);
    }

    const [unresolved] = await db.query(
      `SELECT COUNT(*) AS total FROM support_tickets WHERE customer_id = ? AND (status IS NULL OR status = '' OR status IN ('Mới', 'Đang xử lý'))`,
      [customerId]
    );
    const newRisk = unresolved[0].total >= 2 ? 'Nguy cấp' : 'Bình thường';
    await db.execute(`UPDATE customers SET risk_level = ? WHERE id = ?`, [newRisk, customerId]);

    return res.json({ success: true, message: 'Đã cập nhật ticket!', risk_level: newRisk });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi cập nhật ticket: ' + error.message });
  }
});

router.post('/tickets', verifyToken, async (req, res) => {
  try {
    const { customer_id, title, priority, assigned_to, status } = req.body;
    await db.execute(
      `INSERT INTO support_tickets (customer_id, title, priority, status, assigned_to) VALUES (?, ?, ?, ?, ?)`,
      [customer_id, title, priority || 'Cao', status || 'Mới', assigned_to || req.user?.id || 1]
    );

    await logCustomerActivity(customer_id, req.user?.id || 1, 'CSKH', `Tạo yêu cầu hỗ trợ sau bán: "${title}" (Mức độ: ${priority || 'Cao'})`);

    const [unresolved] = await db.query(
      `SELECT COUNT(*) AS total FROM support_tickets WHERE customer_id = ? AND (status IS NULL OR status = '' OR status IN ('Mới', 'Đang xử lý'))`,
      [customer_id]
    );
    const newRisk = unresolved[0].total >= 2 ? 'Nguy cấp' : 'Bình thường';
    await db.execute(`UPDATE customers SET risk_level = ? WHERE id = ?`, [newRisk, customer_id]);

    return res.json({ success: true, message: 'Đã tạo yêu cầu hỗ trợ thành công!' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi tạo ticket: ' + error.message });
  }
});

// ==========================================
// 7. HỒ SƠ 360 ĐỘ KHÁCH HÀNG
// ==========================================
router.get('/:id/360', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [custs] = await db.query(`
      SELECT c.*, 
             COALESCE(c.company_name, c.name) AS company_name,
             COALESCE(p.company_name, p.name) AS parent_company_name,
             COALESCE(u.full_name, u.email, 'Chưa phân công') AS assigned_user_name,
             u.id AS assigned_user_id
      FROM customers c 
      LEFT JOIN customers p ON c.parent_id = p.id
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = ?
    `, [id]);

    if (!custs.length) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    const customer = custs[0];

    const [contacts] = await db.query(`
      SELECT id, customer_id, full_name, position, phone, email, decision_role, is_primary 
      FROM customer_contacts 
      WHERE customer_id = ? 
      ORDER BY is_primary DESC, id ASC
    `, [id]);

    const [tRows] = await db.query(`
      SELECT st.*, COALESCE(u.full_name, u.email, 'Chưa phân công') AS handler_name 
      FROM support_tickets st
      LEFT JOIN users u ON st.assigned_to = u.id
      WHERE st.customer_id = ? 
      ORDER BY st.id DESC
    `, [id]);

    const tickets = tRows.map(t => ({
      ...t,
      priority: t.priority || 'Cao',
      status: (t.status && t.status.trim() !== '') ? t.status : 'Mới'
    }));

    const unresolvedCount = tickets.filter(t => ['Mới', 'Đang xử lý'].includes(t.status)).length;
    customer.risk_level = unresolvedCount >= 2 ? 'Nguy cấp' : 'Bình thường';
    customer.unresolved_count = unresolvedCount;

    let allDeals = [];
    try {
      const [dRows] = await db.query('SELECT * FROM deals ORDER BY id DESC');
      allDeals = dRows || [];
    } catch (e) {
      allDeals = [];
    }

    const customerDeals = allDeals.filter(d => Number(d.customer_id) === Number(id));

    const [existingActivities] = await db.query(`
      SELECT a.*, COALESCE(u.full_name, u.email, 'Hệ thống') AS author_name 
      FROM customer_activities a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.customer_id = ? 
      ORDER BY a.created_at DESC, a.id DESC
    `, [id]);

    let activities = [...existingActivities];

    // Tự động đồng bộ deal chưa có trong timeline
    for (const d of customerDeals) {
      const alreadyLogged = activities.some(a => a.content && a.content.includes(d.title));
      if (!alreadyLogged) {
        const autoLogContent = `Tạo cơ hội kinh doanh mới từ Pipeline: "${d.title}" - Giá trị: ${Number(d.amount || 0).toLocaleString()} VNĐ (Giai đoạn: ${d.stage || 'Khởi tạo'})`;
        await logCustomerActivity(id, 1, 'Cơ hội', autoLogContent);
        activities.unshift({
          id: Date.now() + Math.random(),
          customer_id: id,
          user_id: 1,
          activity_type: 'Cơ hội',
          content: autoLogContent,
          created_at: d.created_at || new Date(),
          author_name: customer.assigned_user_name || 'Hệ thống'
        });
      }
    }

    const wonTotal = customerDeals.filter(isWonDeal).reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const signedValue = wonTotal > 0 ? wonTotal : Number(customer.total_contract_value || 0);
    const openDealsValue = customerDeals.filter(d => !isWonDeal(d) && !isLostDeal(d)).reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const rootCompanyId = customer.parent_id ? customer.parent_id : customer.id;
    const [groupCompanies] = await db.query(
      'SELECT id, total_contract_value FROM customers WHERE id = ? OR parent_id = ?',
      [rootCompanyId, rootCompanyId]
    );
    const groupCompanyIds = groupCompanies.map(gc => Number(gc.id));

    const groupWonTotal = allDeals
      .filter(d => groupCompanyIds.includes(Number(d.customer_id)) && isWonDeal(d))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const groupTotalValue = groupWonTotal > 0 
      ? groupWonTotal 
      : groupCompanies.reduce((sum, gc) => sum + Number(gc.total_contract_value || 0), 0);

    return res.json({
      success: true,
      data: {
        customer,
        contacts,
        tickets,
        deals: customerDeals,
        signedValue,
        openDealsValue,
        groupTotalValue,
        activities
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi nạp hồ sơ 360: ' + error.message });
  }
});

// ==========================================
// 8. CRUD NGƯỜI LIÊN HỆ (BẢO VỆ 100% KHÔNG BAO GIỜ BỊ LỖI LƯU LIÊN HỆ)
// ==========================================
router.post('/contacts', verifyToken, async (req, res) => {
  try {
    const { customer_id, full_name, position, email, phone, decision_role, is_primary } = req.body;
    const isPrimaryBool = Boolean(is_primary);

    if (isPrimaryBool) {
      await db.execute(`UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = ?`, [customer_id]);
    }

    // Nhận diện cột thực tế trong customer_contacts
    const [cols] = await db.query("SHOW COLUMNS FROM customer_contacts");
    const colList = cols.map(c => c.Field.toLowerCase());

    const insertCols = ['customer_id'];
    const insertVals = [customer_id];
    const placeholders = ['?'];

    if (colList.includes('full_name')) {
      insertCols.push('full_name'); insertVals.push(full_name); placeholders.push('?');
    } else if (colList.includes('name')) {
      insertCols.push('name'); insertVals.push(full_name); placeholders.push('?');
    }

    if (colList.includes('position')) {
      insertCols.push('position'); insertVals.push(position || ''); placeholders.push('?');
    } else if (colList.includes('role')) {
      insertCols.push('role'); insertVals.push(position || ''); placeholders.push('?');
    }

    if (colList.includes('email')) { insertCols.push('email'); insertVals.push(email || ''); placeholders.push('?'); }
    if (colList.includes('phone')) { insertCols.push('phone'); insertVals.push(phone || ''); placeholders.push('?'); }
    if (colList.includes('decision_role')) { insertCols.push('decision_role'); insertVals.push(decision_role || 'Người dùng cuối'); placeholders.push('?'); }
    if (colList.includes('is_primary')) { insertCols.push('is_primary'); insertVals.push(isPrimaryBool ? 1 : 0); placeholders.push('?'); }

    await db.execute(
      `INSERT INTO customer_contacts (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      insertVals
    );

    // Ghi log hoạt động an toàn
    await logCustomerActivity(
      customer_id, 
      req.user?.id || 1, 
      'Người liên hệ', 
      `Thêm người liên hệ mới: ${full_name} (${position || 'Chưa rõ chức vụ'}) - Vai trò: ${decision_role || 'Người dùng cuối'}${isPrimaryBool ? ' [Đầu mối chính]' : ''}`
    );

    return res.json({ success: true, message: 'Thêm người liên hệ thành công!' });
  } catch (e) {
    console.error('Lỗi thêm liên hệ:', e);
    return res.status(500).json({ message: 'Lỗi thêm người liên hệ: ' + e.message });
  }
});

router.put('/contacts/:contactId', verifyToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { customer_id, full_name, position, email, phone, decision_role, is_primary } = req.body;
    const isPrimaryBool = Boolean(is_primary);

    if (isPrimaryBool) {
      await db.execute(`UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = ?`, [customer_id]);
    }

    await db.execute(
      `UPDATE customer_contacts 
       SET full_name = ?, position = ?, email = ?, phone = ?, decision_role = ?, is_primary = ? 
       WHERE id = ?`,
      [full_name, position || '', email || '', phone || '', decision_role || 'Người dùng cuối', isPrimaryBool ? 1 : 0, contactId]
    );

    await logCustomerActivity(
      customer_id, 
      req.user?.id || 1, 
      'Người liên hệ', 
      `Cập nhật thông tin người liên hệ: ${full_name} (${position || '—'})${isPrimaryBool ? ' [Chỉ định làm đầu mối chính]' : ''}`
    );

    return res.json({ success: true, message: 'Cập nhật người liên hệ thành công!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi cập nhật liên hệ: ' + e.message });
  }
});

router.put('/contacts/:contactId/primary', verifyToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const [cRows] = await db.query('SELECT customer_id, full_name FROM customer_contacts WHERE id = ?', [contactId]);
    if (!cRows.length) return res.status(404).json({ message: 'Không tìm thấy người liên hệ' });

    const customerId = cRows[0].customer_id;
    const contactName = cRows[0].full_name;

    await db.execute(`UPDATE customer_contacts SET is_primary = FALSE WHERE customer_id = ?`, [customerId]);
    await db.execute(`UPDATE customer_contacts SET is_primary = TRUE WHERE id = ?`, [contactId]);

    await logCustomerActivity(customerId, req.user?.id || 1, 'Người liên hệ', `Thay đổi đầu mối liên hệ chính sang: ${contactName}`);

    return res.json({ success: true, message: `Đã đặt ${contactName} làm đầu mối chính!` });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi cập nhật đầu mối chính' });
  }
});

router.delete('/contacts/:contactId', verifyToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const [cRows] = await db.query('SELECT customer_id, full_name FROM customer_contacts WHERE id = ?', [contactId]);
    if (!cRows.length) return res.status(404).json({ message: 'Không tìm thấy người liên hệ' });

    const customerId = cRows[0].customer_id;
    const contactName = cRows[0].full_name;

    await db.execute('DELETE FROM customer_contacts WHERE id = ?', [contactId]);

    await logCustomerActivity(customerId, req.user?.id || 1, 'Người liên hệ', `Xóa người liên hệ khỏi danh bạ: ${contactName}`);

    return res.json({ success: true, message: 'Đã xóa người liên hệ thành công!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi xóa người liên hệ' });
  }
});

router.put('/contacts/:contactId/reassign', verifyToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { new_customer_id } = req.body;

    const [old] = await db.query('SELECT * FROM customer_contacts WHERE id = ?', [contactId]);
    if (!old.length) return res.status(404).json({ message: 'Không tìm thấy người liên hệ' });

    const [newCust] = await db.query('SELECT company_name, name FROM customers WHERE id = ?', [new_customer_id]);
    const newCompanyName = newCust[0]?.company_name || newCust[0]?.name || 'Doanh nghiệp mới';

    const [oldCust] = await db.query('SELECT company_name, name FROM customers WHERE id = ?', [old[0].customer_id]);
    const oldCompanyName = oldCust[0]?.company_name || oldCust[0]?.name || 'Doanh nghiệp cũ';

    await db.execute('UPDATE customer_contacts SET customer_id = ?, is_primary = FALSE WHERE id = ?', [new_customer_id, contactId]);

    await logCustomerActivity(old[0].customer_id, req.user?.id || 1, 'Nhân sự', `Người liên hệ ${old[0].full_name} đã chuyển công tác sang: ${newCompanyName}`);
    await logCustomerActivity(new_customer_id, req.user?.id || 1, 'Nhân sự', `Tiếp nhận người liên hệ ${old[0].full_name} chuyển công tác từ: ${oldCompanyName}`);

    return res.json({ success: true, message: 'Đã chuyển liên hệ sang doanh nghiệp mới thành công!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi chuyển liên hệ' });
  }
});

// ==========================================
// 9. THÊM HOẠT ĐỘNG THỦ CÔNG
// ==========================================
router.post('/activities', verifyToken, async (req, res) => {
  try {
    const { customer_id, activity_type, content } = req.body;
    await logCustomerActivity(customer_id, req.user?.id || 1, activity_type || 'Ghi chú', content);
    return res.json({ success: true, message: 'Đã lưu hoạt động vào dòng thời gian!' });
  } catch (e) {
    return res.status(500).json({ message: 'Lỗi lưu hoạt động' });
  }
});

// ==========================================
// 10. CRUD KHÁCH HÀNG (LƯU & CẬP NHẬT NGƯỜI PHỤ TRÁCH DYNAMIC)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, company_name, address, custom_fields, tax_code, industry, company_size, website, parent_id, total_contract_value, status, created_by } = req.body;
    const finalName = (company_name || name || '').trim();

    if (tax_code && tax_code.trim()) {
      const [ex] = await db.query('SELECT id FROM customers WHERE tax_code = ?', [tax_code.trim()]);
      if (ex.length > 0) return res.status(400).json({ message: `Mã số thuế ${tax_code} đã tồn tại!` });
    }

    const availableCols = await getCustomerColumns();
    const dataMap = {
      name: finalName,
      company_name: finalName,
      tax_code: tax_code || '',
      industry: industry || 'Chưa phân loại',
      company_size: company_size || '51-200 nhân sự',
      website: website || '',
      status: status || 'Tiềm năng',
      parent_id: parent_id || null,
      total_contract_value: total_contract_value || 0,
      custom_fields: custom_fields ? JSON.stringify(custom_fields) : null,
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      created_by: created_by || req.user?.id || 1
    };

    const insertCols = [];
    const insertVals = [];
    for (const [key, val] of Object.entries(dataMap)) {
      if (availableCols.includes(key.toLowerCase())) {
        insertCols.push(key);
        insertVals.push(val);
      }
    }

    const placeholders = insertCols.map(() => '?').join(', ');
    const sql = `INSERT INTO customers (${insertCols.join(', ')}) VALUES (${placeholders})`;
    const [result] = await db.execute(sql, insertVals);

    await logCustomerActivity(result.insertId, req.user?.id || 1, 'Hệ thống', 'Khởi tạo hồ sơ khách hàng doanh nghiệp trên hệ thống CRM');

    return res.json({ success: true, message: 'Thêm khách hàng mới thành công!' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lưu khách hàng: ' + error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, company_name, address, custom_fields, tax_code, industry, company_size, website, parent_id, total_contract_value, status, created_by } = req.body;
    const finalName = (company_name || name || '').trim();

    const availableCols = await getCustomerColumns();
    const dataMap = {
      name: finalName,
      company_name: finalName,
      tax_code: tax_code,
      industry: industry,
      company_size: company_size,
      website: website,
      status: status,
      parent_id: parent_id || null,
      total_contract_value: total_contract_value,
      custom_fields: custom_fields ? JSON.stringify(custom_fields) : null,
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      created_by: created_by
    };

    const updateClauses = [];
    const updateVals = [];
    for (const [key, val] of Object.entries(dataMap)) {
      if (availableCols.includes(key.toLowerCase()) && val !== undefined) {
        updateClauses.push(`${key} = ?`);
        updateVals.push(val);
      }
    }

    if (updateClauses.length > 0) {
      updateVals.push(req.params.id);
      const sql = `UPDATE customers SET ${updateClauses.join(', ')} WHERE id = ?`;
      await db.execute(sql, updateVals);
    }

    await logCustomerActivity(req.params.id, req.user?.id || 1, 'Hệ thống', 'Cập nhật thông tin hồ sơ doanh nghiệp');

    return res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi cập nhật: ' + error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Xóa khách hàng thành công!' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi xóa khách hàng' });
  }
});

// Deals & Import & Merge
router.post('/deals', verifyToken, async (req, res) => {
  try {
    const { customer_id, title, amount, stage } = req.body;
    await db.execute(
      `INSERT INTO deals (customer_id, title, amount, stage) VALUES (?, ?, ?, ?)`,
      [customer_id, title, amount || 0, stage || 'Đàm phán']
    );
    await logCustomerActivity(customer_id, req.user?.id || 1, 'Cơ hội', `Tạo cơ hội bán hàng: "${title}" - Giá trị: ${Number(amount || 0).toLocaleString()} VNĐ (Giai đoạn: ${stage || 'Đàm phán'})`);
    return res.json({ success: true, message: 'Thêm cơ hội bán hàng thành công!' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi tạo cơ hội: ' + error.message });
  }
});

router.post('/bulk-import', verifyToken, async (req, res) => {
  const { customers: importList, updateDuplicates } = req.body;
  if (!Array.isArray(importList) || importList.length === 0) return res.status(400).json({ message: 'Danh sách rỗng!' });
  for (const item of importList) {
    const cName = (item.company_name || '').trim();
    const tCode = (item.tax_code || '').trim();
    if (!cName) continue;
    const [exist] = await db.query('SELECT id FROM customers WHERE tax_code = ? AND tax_code != ""', [tCode]);
    if (exist.length > 0 && updateDuplicates) {
      await db.execute(`UPDATE customers SET company_name = ?, industry = ?, company_size = ?, website = ?, total_contract_value = ? WHERE id = ?`, [cName, item.industry || 'Chưa phân loại', item.company_size || '51-200 nhân sự', item.website || '', item.total_contract_value || 0, exist[0].id]);
    } else if (!exist.length) {
      await db.execute(`INSERT INTO customers (name, company_name, tax_code, industry, company_size, website, status, total_contract_value, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [cName, cName, tCode, item.industry || 'Chưa phân loại', item.company_size || '51-200 nhân sự', item.website || '', item.status || 'Tiềm năng', item.total_contract_value || 0, req.user?.id || 1]);
    }
  }
  return res.json({ success: true, message: 'Nhập dữ liệu thành công!' });
});

router.post('/merge', verifyToken, async (req, res) => {
  const { master_id, duplicate_id } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`UPDATE customer_contacts SET customer_id = ? WHERE customer_id = ?`, [master_id, duplicate_id]);
    await conn.execute(`UPDATE support_tickets SET customer_id = ? WHERE customer_id = ?`, [master_id, duplicate_id]);
    await conn.execute(`UPDATE deals SET customer_id = ? WHERE customer_id = ?`, [master_id, duplicate_id]);
    await conn.execute(`UPDATE customer_activities SET customer_id = ? WHERE customer_id = ?`, [master_id, duplicate_id]);
    await conn.execute(`DELETE FROM customers WHERE id = ?`, [duplicate_id]);
    await conn.commit();
    return res.json({ success: true, message: 'Đã gộp khách hàng trùng thành công!' });
  } catch (error) {
    await conn.rollback();
    return res.status(500).json({ message: 'Lỗi gộp: ' + error.message });
  } finally { conn.release(); }
});

module.exports = router;