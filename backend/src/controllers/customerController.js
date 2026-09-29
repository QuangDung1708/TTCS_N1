const db = require('../config/db');
const { checkRecordAccess } = require('../middleware/rbacMiddleware');

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

module.exports = { getCustomers, getCustomerById };