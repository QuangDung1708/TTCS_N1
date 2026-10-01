const db = require('../config/db');

// Lấy danh sách danh mục theo loại (type: industry, company_size, lead_source, activity_type)
exports.getCategoriesByType = async (req, res) => {
    try {
        const { type } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, id ASC',
            [type]
        );
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Thêm mới danh mục
exports.createCategory = async (req, res) => {
    try {
        const { name, type, sort_order } = req.body;
        if (!name || !type) {
            return res.status(400).json({ success: false, message: 'Tên và loại danh mục là bắt buộc' });
        }

        const [result] = await db.query(
            'INSERT INTO categories (name, type, sort_order) VALUES (?, ?, ?)',
            [name, type, sort_order || 0]
        );

        res.status(201).json({ success: true, message: 'Thêm danh mục thành công', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sort_order } = req.body;

        const [result] = await db.query(
            'UPDATE categories SET name = ?, sort_order = ? WHERE id = ?',
            [name, sort_order, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API Cập nhật thứ tự sắp xếp hàng loạt
exports.updateSortOrder = async (req, res) => {
    try {
        const { items } = req.body; // Mảng dạng: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }]

        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }

        for (const item of items) {
            await db.query('UPDATE categories SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
        }

        res.status(200).json({ success: true, message: 'Cập nhật thứ tự hiển thị thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Xóa danh mục (Ràng buộc: Không xóa nếu đang được tham chiếu)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem danh mục có đang được sử dụng ở bảng customers hay không
        const [usageCheck] = await db.query(
            'SELECT COUNT(*) as count FROM customers WHERE industry_id = ? OR lead_source_id = ?',
            [id, id]
        ).catch(() => [[{ count: 0 }]]);

        if (usageCheck[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Giá trị đang được tham chiếu sử dụng, không thể xóa'
            });
        }

        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
        }

        res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};