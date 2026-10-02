const db = require('../config/db');

const getRegions = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.id, r.code, r.name,
                   (SELECT COUNT(*) FROM \`groups\` g WHERE g.region_id = r.id) AS group_count
            FROM regions r ORDER BY r.name
        `);
        return res.status(200).json({ data: rows });
    } catch (error) {
        console.error('Lỗi lấy khu vực:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách khu vực!' });
    }
};

const createRegion = async (req, res) => {
    try {
        const { code, name } = req.body;
        if (!code?.trim() || !name?.trim()) {
            return res.status(400).json({ message: 'Mã và tên khu vực là bắt buộc!' });
        }
        const [result] = await db.execute('INSERT INTO regions (code, name) VALUES (?, ?)', [code.trim(), name.trim()]);
        return res.status(201).json({ message: 'Tạo khu vực thành công!', regionId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Mã hoặc tên khu vực đã tồn tại!' });
        }
        console.error('Lỗi tạo khu vực:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo khu vực!' });
    }
};

const updateRegion = async (req, res) => {
    try {
        const { code, name } = req.body;
        if (!code?.trim() || !name?.trim()) {
            return res.status(400).json({ message: 'Mã và tên khu vực là bắt buộc!' });
        }
        const [result] = await db.execute(
            'UPDATE regions SET code = ?, name = ? WHERE id = ?',
            [code.trim(), name.trim(), req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy khu vực!' });
        return res.status(200).json({ message: 'Cập nhật khu vực thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Mã hoặc tên khu vực đã tồn tại!' });
        }
        console.error('Lỗi cập nhật khu vực:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật khu vực!' });
    }
};

const deleteRegion = async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM regions WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy khu vực!' });
        return res.status(200).json({ message: 'Xóa khu vực thành công!' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Khu vực đang được gán cho nhóm, không thể xóa!' });
        }
        console.error('Lỗi xóa khu vực:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa khu vực!' });
    }
};

module.exports = { getRegions, createRegion, updateRegion, deleteRegion };