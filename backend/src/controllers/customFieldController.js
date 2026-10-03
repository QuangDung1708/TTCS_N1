const db = require('../config/db');

// 1. Lấy danh sách trường tùy biến theo module (customer hoặc deal)
exports.getCustomFields = async (req, res) => {
    try {
        const { entity_type = 'customer' } = req.query;
        const [fields] = await db.execute(
            'SELECT * FROM custom_fields WHERE entity_type = ? ORDER BY sort_order ASC, id ASC',
            [entity_type]
        );
        return res.status(200).json({ data: fields });
    } catch (error) {
        console.error('Lỗi lấy custom fields:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách trường tùy biến!' });
    }
};

// 2. Thêm mới cấu hình trường tùy biến
exports.createCustomField = async (req, res) => {
    try {
        const { name, field_key, entity_type = 'customer', data_type = 'text', options, is_required, sort_order } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên trường không được để trống!' });
        }

        // Tự động tạo field_key nếu chưa nhập
        let key = field_key ? field_key.trim().toLowerCase().replace(/\s+/g, '_') : null;
        if (!key) {
            key = 'cf_' + Date.now().toString().slice(-6);
        }

        await db.execute(
            `INSERT INTO custom_fields (name, field_key, entity_type, data_type, options, is_required, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                key,
                entity_type,
                data_type,
                options ? options.trim() : null,
                is_required ? 1 : 0,
                sort_order ? parseInt(sort_order) : 0
            ]
        );

        return res.status(201).json({ message: 'Tạo trường tùy biến thành công!' });
    } catch (error) {
        console.error('Lỗi tạo custom field:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã định danh trường (field_key) đã tồn tại trong module này!' });
        }
        return res.status(500).json({ message: 'Lỗi server khi tạo trường tùy biến!' });
    }
};

// 3. Cập nhật cấu hình trường tùy biến
exports.updateCustomField = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, data_type, options, is_required, is_active } = req.body;

        await db.execute(
            `UPDATE custom_fields 
             SET name = ?, data_type = ?, options = ?, is_required = ?, is_active = ?
             WHERE id = ?`,
            [
                name.trim(),
                data_type,
                options ? options.trim() : null,
                is_required ? 1 : 0,
                is_active ? 1 : 0,
                id
            ]
        );

        return res.status(200).json({ message: 'Cập nhật trường tùy biến thành công!' });
    } catch (error) {
        console.error('Lỗi sửa custom field:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật trường tùy biến!' });
    }
};

// 4. Xóa cấu hình trường tùy biến
exports.deleteCustomField = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM custom_fields WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Xóa trường tùy biến thành công!' });
    } catch (error) {
        console.error('Lỗi xóa custom field:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa trường tùy biến!' });
    }
};