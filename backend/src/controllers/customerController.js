const db = require('../config/db');
const { checkRecordAccess } = require('../middleware/rbacMiddleware');
const { getAllSubGroupIds } = require('../utils/rbacHierarchy');

// 1. LẤY DANH SÁCH KHÁCH HÀNG (Tự động lọc theo data_scope)
const getCustomers = async (req, res) => {
    try {
        const { sqlFilter, filterParams } = req.dataScope;

        const query = `
            SELECT c.*, u.full_name AS creator_name, g.name AS group_name
            FROM customers c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN \`groups\` g ON c.group_id = g.id
            WHERE ${sqlFilter}
            ORDER BY c.id DESC
        `;

        const [customers] = await db.execute(query, filterParams);

        return res.status(200).json({
            scope: req.dataScope.scope,
            total: customers.length,
            data: customers
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách khách hàng:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách khách hàng!' });
    }
};

// 2. XEM CHI TIẾT 1 KHÁCH HÀNG (Chặn truy cập ngoài phạm vi)
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const [records] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);

        if (records.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng yêu cầu!' });
        }

        const customer = records[0];

        // Kiểm tra phạm vi dữ liệu
        const accessCheck = checkRecordAccess(req.user, customer);
        if (!accessCheck.allowed) {
            return res.status(403).json({ message: accessCheck.message });
        }

        return res.status(200).json({ data: customer });
    } catch (error) {
        console.error('Lỗi xem chi tiết khách hàng:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy thông tin khách hàng!' });
    }
};

// Tạo mới khách hàng
// Biểu thức Regex kiểm tra định dạng
const PHONE_REGEX = /^(0|\+84)(2[0-9]{9}|[35789][0-9]{8})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tạo mới khách hàng có kiểm tra định dạng dữ liệu đầu vào
const createCustomer = async (req, res) => {
    try {
        const { name, tax_code, phone, email, assigned_to } = req.body;

        // 1. Kiểm tra tên công ty
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên công ty / khách hàng không được để trống!' });
        }

        // 2. Ràng buộc định dạng Số điện thoại (di động 10 số hoặc máy bàn 11 số)
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

        // Lưu khách hàng cùng thông tin nhóm (group_id)
        await db.execute(
            `INSERT INTO customers (name, tax_code, phone, email, created_by, assigned_to, group_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(), 
                tax_code ? tax_code.trim() : null, 
                phone ? phone.trim() : null, 
                email ? email.trim().toLowerCase() : null, 
                creatorId, 
                assignedId,
                userGroupId
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

module.exports = { getCustomers, getCustomerById, createCustomer };