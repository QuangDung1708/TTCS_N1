const db = require('../config/db');

// Biểu thức Regex kiểm tra định dạng
const PHONE_REGEX = /^(0|\+84)(2[0-9]{9}|[35789][0-9]{8})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. Lấy danh sách khách hàng (kèm thông tin danh mục phân loại)
const getCustomers = async (req, res) => {
    try {
        const scopeFilter = req.dataScope ? req.dataScope.sqlFilter : '1=1';
        const scopeParams = req.dataScope ? req.dataScope.filterParams : [];

        // JOIN với các bảng danh mục master data của S2-07
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

        const [rows] = await db.execute(query, scopeParams);
        return res.status(200).json({ data: rows });
    } catch (error) {
        console.error('Lỗi lấy danh sách khách hàng:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách khách hàng!' });
    }
};

// 2. Thêm mới khách hàng (lưu kèm 3 trường phân loại)
const createCustomer = async (req, res) => {
    try {
        const { 
            name, tax_code, phone, email, assigned_to,
            industry_id, company_size_id, lead_source_id 
        } = req.body;

        // 1. Kiểm tra tên công ty
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên công ty / khách hàng không được để trống!' });
        }

        // 2. Ràng buộc định dạng Số điện thoại (10 số di động hoặc 11 số cố định)
        if (phone && phone.trim()) {
            const cleanPhone = phone.trim().replace(/\s+/g, '');
            if (!PHONE_REGEX.test(cleanPhone)) {
                return res.status(400).json({ 
                    message: 'Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (di động) hoặc 11 số (máy bàn).' 
                });
            }
        }

        // 3. Ràng buộc định dạng Email
        if (email && email.trim()) {
            if (!EMAIL_REGEX.test(email.trim())) {
                return res.status(400).json({ 
                    message: 'Định dạng email không hợp lệ! (Ví dụ: contact@congty.vn)' 
                });
            }
        }

        const creatorId = req.user.id || req.user.userId || null;
        const assignedId = assigned_to ? parseInt(assigned_to) : creatorId;

        // Lấy group_id của nhân viên đang tạo khách hàng
        let userGroupId = req.user.group_id || null;
        if (!userGroupId && creatorId) {
            const [u] = await db.execute('SELECT group_id FROM users WHERE id = ?', [creatorId]);
            if (u.length > 0) userGroupId = u[0].group_id;
        }

        await db.execute(
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

        return res.status(201).json({ message: 'Thêm mới khách hàng thành công!' });
    } catch (error) {
        console.error('Lỗi thêm khách hàng:', error);
        return res.status(500).json({ 
            message: error.sqlMessage || error.message || 'Lỗi server khi tạo khách hàng!' 
        });
    }
};

// 3. Lấy chi tiết một khách hàng theo ID
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

module.exports = { 
    getCustomers, 
    getCustomerById, 
    createCustomer 
};