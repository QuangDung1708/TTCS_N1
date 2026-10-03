const db = require('../config/db');

// Lấy danh sách lý do thắng/thua
exports.getDealReasons = async (req, res) => {
    try {
        const { type } = req.query; // 'WIN' hoặc 'LOSS'
        let sql = 'SELECT * FROM deal_reasons';
        const params = [];
        if (type && ['WIN', 'LOSS'].includes(type.toUpperCase())) {
            sql += ' WHERE type = ?';
            params.push(type.toUpperCase());
        }
        sql += ' ORDER BY type ASC, sort_order ASC, id ASC';
        const [reasons] = await db.execute(sql, params);
        return res.status(200).json({ data: reasons });
    } catch (error) {
        console.error('Lỗi lấy deal reasons:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh mục lý do!' });
    }
};

// Thêm mới lý do
exports.createDealReason = async (req, res) => {
    try {
        const { code, name, type, description, sort_order } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên lý do không được để trống!' });
        }
        if (!type || !['WIN', 'LOSS'].includes(type.toUpperCase())) {
            return res.status(400).json({ message: 'Loại lý do phải là WIN (Thắng) hoặc LOSS (Thua)!' });
        }

        const reasonCode = code && code.trim() ? code.trim().toUpperCase() : `${type.toUpperCase()}_${Date.now()}`;
        await db.execute(
            `INSERT INTO deal_reasons (code, name, type, description, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [reasonCode, name.trim(), type.toUpperCase(), description ? description.trim() : null, parseInt(sort_order) || 1]
        );
        return res.status(201).json({ message: 'Thêm mới lý do thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã lý do (code) đã tồn tại!' });
        }
        return res.status(500).json({ message: 'Lỗi server khi tạo lý do!' });
    }
};

// Cập nhật lý do
exports.updateDealReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, sort_order, is_active } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên lý do không được để trống!' });
        }

        await db.execute(
            `UPDATE deal_reasons 
             SET name = ?, type = ?, description = ?, sort_order = ?, is_active = ?
             WHERE id = ?`,
            [name.trim(), type ? type.toUpperCase() : 'WIN', description ? description.trim() : null, parseInt(sort_order) || 1, is_active !== undefined ? (is_active ? 1 : 0) : 1, id]
        );
        return res.status(200).json({ message: 'Cập nhật lý do thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi cập nhật lý do!' });
    }
};

// Xóa lý do
exports.deleteDealReason = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM deal_reasons WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Đã xóa lý do thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi xóa lý do!' });
    }
};