const db = require('../config/db');

const PHONE_REGEX = /^(0|\+84)(2[0-9]{9}|[35789][0-9]{8})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. Lấy danh sách khách hàng kèm theo toàn bộ giá trị trường tùy biến động
const getCustomers = async (req, res) => {
    try {
        const scopeFilter = req.dataScope ? req.dataScope.sqlFilter : '1=1';
        const scopeParams = req.dataScope ? req.dataScope.filterParams : [];

        const query = `
            SELECT 
                c.*,
                ind.name AS industry_name,
                cs.name AS company_size_name,
                ls.name AS lead_source_name,
                u.full_name AS creator_name
            FROM customers c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN industries ind ON c.industry_id = ind.id
            LEFT JOIN company_sizes cs ON c.company_size_id = cs.id
            LEFT JOIN lead_sources ls ON c.lead_source_id = ls.id
            WHERE ${scopeFilter}
            ORDER BY c.id DESC
        `;

        const [customers] = await db.execute(query, scopeParams);

        if (customers.length === 0) {
            return res.status(200).json({ data: [] });
        }

        // Truy vấn giá trị các trường tùy biến của danh sách khách hàng này
        const customerIds = customers.map(c => c.id);
        const placeholders = customerIds.map(() => '?').join(',');
        const [cfValues] = await db.execute(
            `SELECT cfv.entity_id, cfv.value, cf.field_key, cf.name as field_name 
             FROM custom_field_values cfv
             JOIN custom_fields cf ON cfv.field_id = cf.id
             WHERE cfv.entity_type = 'customer' AND cfv.entity_id IN (${placeholders})`,
            customerIds
        );

        // Gắn custom fields vào từng khách hàng
        const cfMap = {};
        cfValues.forEach(row => {
            if (!cfMap[row.entity_id]) cfMap[row.entity_id] = {};
            cfMap[row.entity_id][row.field_key] = row.value;
        });

        const formattedCustomers = customers.map(c => ({
            ...c,
            custom_values: cfMap[c.id] || {}
        }));

        return res.status(200).json({ data: formattedCustomers });
    } catch (error) {
        console.error('Lỗi lấy danh sách khách hàng:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy khách hàng!' });
    }
};

// 2. Thêm mới khách hàng (Kiểm tra validate bắt buộc và lưu custom values)
const createCustomer = async (req, res) => {
    try {
        const { 
            name, tax_code, phone, email, assigned_to,
            industry_id, company_size_id, lead_source_id,
            custom_values = {} // { erp_code: '...', vip_tier: '...' }
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên công ty / khách hàng không được để trống!' });
        }

        if (phone && phone.trim()) {
            const cleanPhone = phone.trim().replace(/\s+/g, '');
            if (!PHONE_REGEX.test(cleanPhone)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (di động) hoặc 11 số (máy bàn).' });
            }
        }

        if (email && email.trim()) {
            if (!EMAIL_REGEX.test(email.trim())) {
                return res.status(400).json({ message: 'Định dạng email không hợp lệ!' });
            }
        }

        // [N1-171] KIỂM TRA RÀNG BUỘC CÁC TRƯỜNG TÙY BIẾN BẮT BUỘC (is_required = 1)
        const [requiredFields] = await db.execute(
            'SELECT * FROM custom_fields WHERE entity_type = "customer" AND is_active = 1 AND is_required = 1'
        );

        for (const rf of requiredFields) {
            const val = custom_values[rf.field_key];
            if (!val || !val.toString().trim()) {
                return res.status(400).json({ 
                    message: `Trường tùy chỉnh "${rf.name}" là bắt buộc! Vui lòng nhập thông tin.` 
                });
            }
        }

        const creatorId = req.user.id || req.user.userId || null;
        const assignedId = assigned_to ? parseInt(assigned_to) : creatorId;

        let userGroupId = req.user.group_id || null;
        if (!userGroupId && creatorId) {
            const [u] = await db.execute('SELECT group_id FROM users WHERE id = ?', [creatorId]);
            if (u.length > 0) userGroupId = u[0].group_id;
        }

        // Lưu thông tin khách hàng chính
        const [custResult] = await db.execute(
            `INSERT INTO customers (
                name, tax_code, phone, email, created_by, assigned_to, group_id,
                industry_id, company_size_id, lead_source_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(), 
                tax_code ? tax_code.trim() : null, 
                phone ? phone.trim() : null, 
                email ? email.trim().toLowerCase() : null, 
                creatorId, 
                assignedId,
                userGroupId,
                industry_id ? parseInt(industry_id) : null,
                company_size_id ? parseInt(company_size_id) : null,
                lead_source_id ? parseInt(lead_source_id) : null
            ]
        );

        const newCustomerId = custResult.insertId;

        // Lưu các giá trị trường tùy biến vào custom_field_values
        if (custom_values && Object.keys(custom_values).length > 0) {
            const [allActiveFields] = await db.execute(
                'SELECT id, field_key FROM custom_fields WHERE entity_type = "customer" AND is_active = 1'
            );

            for (const f of allActiveFields) {
                const val = custom_values[f.field_key];
                if (val !== undefined && val !== null && val !== '') {
                    await db.execute(
                        `INSERT INTO custom_field_values (field_id, entity_id, entity_type, value)
                         VALUES (?, ?, 'customer', ?)
                         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
                        [f.id, newCustomerId, val.toString().trim()]
                    );
                }
            }
        }

        return res.status(201).json({ message: 'Thêm mới khách hàng thành công!' });
    } catch (error) {
        console.error('Lỗi thêm khách hàng:', error);
        return res.status(500).json({ message: error.sqlMessage || error.message || 'Lỗi server khi tạo khách hàng!' });
    }
};

// 3. [N1-171 & N1-174] XUẤT EXCEL KHÁCH HÀNG KÈM THEO CỘT TÙY BIẾN ĐỘNG
const exportExcelCustomers = async (req, res) => {
    try {
        const [fields] = await db.execute(
            'SELECT * FROM custom_fields WHERE entity_type = "customer" AND is_active = 1 ORDER BY sort_order ASC'
        );

        const [customers] = await db.execute(`
            SELECT c.*, ind.name AS ind_name, cs.name AS size_name, ls.name AS lead_name
            FROM customers c
            LEFT JOIN industries ind ON c.industry_id = ind.id
            LEFT JOIN company_sizes cs ON c.company_size_id = cs.id
            LEFT JOIN lead_sources ls ON c.lead_source_id = ls.id
            ORDER BY c.id DESC
        `);

        // Lấy toàn bộ custom values
        const [cfValues] = await db.execute(
            'SELECT entity_id, field_id, value FROM custom_field_values WHERE entity_type = "customer"'
        );

        const valMap = {};
        cfValues.forEach(v => {
            if (!valMap[v.entity_id]) valMap[v.entity_id] = {};
            valMap[v.entity_id][v.field_id] = v.value;
        });

        // Tạo nội dung CSV chuẩn UTF-8 BOM để Excel tự động mở đúng tiếng Việt
        let csv = '\uFEFF';
        const headers = ['ID', 'Tên Khách Hàng / Công Ty', 'Mã Số Thuế', 'Số Điện Thoại', 'Email', 'Ngành Nghề', 'Quy Mô', 'Nguồn Lead'];
        fields.forEach(f => headers.push(`[Tùy biến] ${f.name}`));
        csv += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

        customers.forEach(c => {
            const row = [
                c.id,
                c.name || '',
                c.tax_code || '',
                c.phone || '',
                c.email || '',
                c.ind_name || '',
                c.size_name || '',
                c.lead_name || ''
            ];

            fields.forEach(f => {
                const customVal = (valMap[c.id] && valMap[c.id][f.id]) || '';
                row.push(customVal);
            });

            csv += row.map(cell => `"${(cell + '').replace(/"/g, '""')}"`).join(',') + '\r\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=Danh_Sach_Khach_Hang_CRM.csv');
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Lỗi xuất file Excel:', error);
        return res.status(500).json({ message: 'Lỗi khi xuất file Excel!' });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng!' });
        return res.status(200).json({ data: rows[0] });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server!' });
    }
};

module.exports = { getCustomers, getCustomerById, createCustomer, exportExcelCustomers };