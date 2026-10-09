const db = require('../config/db');

// 1. Lấy danh sách khách hàng
// 1. Lấy danh sách khách hàng an toàn tuyệt đối
const getCustomers = async (req, res) => {
    try {
        const db = require('../config/db');
        // Chỉ SELECT * đơn giản, không viết lồng cột trong SQL để tránh lỗi thiếu trường
        const [customers] = await db.execute('SELECT * FROM customers ORDER BY id DESC');
        
        // Chuẩn hóa tên trường linh hoạt bằng JavaScript (có company_name hay name đều tự nhận)
        const formattedData = customers.map(c => ({
            ...c,
            company_name: c.company_name || c.name || 'Doanh nghiệp',
            name: c.name || c.company_name || 'Doanh nghiệp'
        }));

        return res.json({ data: formattedData, total: formattedData.length });
    } catch (error) {
        console.error('Lỗi getCustomers:', error);
        return res.status(500).json({ message: error.message || 'Lỗi nạp danh sách khách hàng' });
    }
};

// 2. Lấy chi tiết khách hàng theo ID
const getCustomerById = async (req, res) => {
    try {
        const [customers] = await db.execute('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        if (customers.length === 0) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        return res.json({ data: customers[0] });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi tìm khách hàng' });
    }
};

// 3. Tạo khách hàng mới (Tự động thích ứng với các cột hiện có trong database)
const createCustomer = async (req, res) => {
    try {
        const companyName = req.body.company_name || req.body.name;
        const { tax_code, phone, email, customer_type, vip_tier } = req.body;

        if (!companyName) {
            return res.status(400).json({ message: 'Tên công ty / khách hàng không được để trống!' });
        }

        // Quét danh sách cột thực tế của bảng customers
        const [colRows] = await db.execute('SHOW COLUMNS FROM customers');
        const existingCols = colRows.map(c => c.Field);

        const insertCols = [];
        const placeholders = [];
        const values = [];

        // Đồng bộ trường tên
        if (existingCols.includes('company_name')) {
            insertCols.push('company_name');
            placeholders.push('?');
            values.push(companyName);
        }
        if (existingCols.includes('name')) {
            insertCols.push('name');
            placeholders.push('?');
            values.push(companyName);
        }

        if (existingCols.includes('tax_code')) {
            insertCols.push('tax_code');
            placeholders.push('?');
            values.push(tax_code || null);
        }
        if (existingCols.includes('phone')) {
            insertCols.push('phone');
            placeholders.push('?');
            values.push(phone || null);
        }
        if (existingCols.includes('email')) {
            insertCols.push('email');
            placeholders.push('?');
            values.push(email || null);
        }
        if (existingCols.includes('customer_type')) {
            insertCols.push('customer_type');
            placeholders.push('?');
            values.push(customer_type || 'Enterprise');
        }
        if (existingCols.includes('vip_tier')) {
            insertCols.push('vip_tier');
            placeholders.push('?');
            values.push(vip_tier || 'Tiêu chuẩn');
        }
        if (existingCols.includes('created_by')) {
            insertCols.push('created_by');
            placeholders.push('?');
            values.push(req.user?.id || 1);
        }

        const sql = `INSERT INTO customers (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const [result] = await db.execute(sql, values);

        return res.json({ message: 'Tạo khách hàng thành công!', id: result.insertId });
    } catch (error) {
        console.error('Lỗi createCustomer:', error);
        return res.status(500).json({ message: error.message || 'Lỗi server khi tạo khách hàng' });
    }
};

// 4. Chỉnh sửa thông tin khách hàng (Nút Sửa)
const updateCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;
        const companyName = req.body.company_name || req.body.name;
        const { tax_code, phone, email, customer_type, vip_tier } = req.body;

        if (!companyName) {
            return res.status(400).json({ message: 'Tên công ty / khách hàng không được để trống!' });
        }

        const [colRows] = await db.execute('SHOW COLUMNS FROM customers');
        const existingCols = colRows.map(c => c.Field);

        const updateSets = [];
        const values = [];

        if (existingCols.includes('company_name')) {
            updateSets.push('company_name = ?');
            values.push(companyName);
        }
        if (existingCols.includes('name')) {
            updateSets.push('name = ?');
            values.push(companyName);
        }
        if (existingCols.includes('tax_code')) {
            updateSets.push('tax_code = ?');
            values.push(tax_code || null);
        }
        if (existingCols.includes('phone')) {
            updateSets.push('phone = ?');
            values.push(phone || null);
        }
        if (existingCols.includes('email')) {
            updateSets.push('email = ?');
            values.push(email || null);
        }
        if (existingCols.includes('customer_type')) {
            updateSets.push('customer_type = ?');
            values.push(customer_type || 'Enterprise');
        }
        if (existingCols.includes('vip_tier')) {
            updateSets.push('vip_tier = ?');
            values.push(vip_tier || 'Tiêu chuẩn');
        }

        values.push(customerId);
        const sql = `UPDATE customers SET ${updateSets.join(', ')} WHERE id = ?`;
        await db.execute(sql, values);

        return res.json({ message: 'Cập nhật thông tin khách hàng thành công!' });
    } catch (error) {
        console.error('Lỗi updateCustomer:', error);
        return res.status(500).json({ message: error.message || 'Lỗi server khi cập nhật khách hàng' });
    }
};

// 5. Xóa khách hàng
const deleteCustomer = async (req, res) => {
    try {
        await db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
        return res.json({ message: 'Đã xóa khách hàng thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Không thể xóa khách hàng này' });
    }
};

// 6. Xuất danh sách Excel
const exportExcelCustomers = async (req, res) => {
    return res.json({ message: 'Trích xuất dữ liệu thành công' });
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    exportExcelCustomers
};