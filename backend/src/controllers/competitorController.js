const db = require('../config/db');

// Lấy danh sách đối thủ
exports.getCompetitors = async (req, res) => {
    try {
        const [competitors] = await db.execute('SELECT * FROM competitors ORDER BY id DESC');
        return res.status(200).json({ data: competitors });
    } catch (error) {
        console.error('Lỗi lấy danh sách đối thủ:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách đối thủ!' });
    }
};

// Thêm mới đối thủ
exports.createCompetitor = async (req, res) => {
    try {
        const { code, name, website, strengths, weaknesses, notes } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên đối thủ cạnh tranh không được để trống!' });
        }

        const compCode = code && code.trim() ? code.trim().toUpperCase() : `COMP_${Date.now()}`;
        await db.execute(
            `INSERT INTO competitors (code, name, website, strengths, weaknesses, notes, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [compCode, name.trim(), website ? website.trim() : null, strengths ? strengths.trim() : null, weaknesses ? weaknesses.trim() : null, notes ? notes.trim() : null]
        );
        return res.status(201).json({ message: 'Thêm hồ sơ đối thủ thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã đối thủ (code) đã tồn tại!' });
        }
        return res.status(500).json({ message: 'Lỗi server khi tạo đối thủ!' });
    }
};

// Cập nhật đối thủ
exports.updateCompetitor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, website, strengths, weaknesses, notes, is_active } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên đối thủ không được để trống!' });
        }

        await db.execute(
            `UPDATE competitors 
             SET name = ?, website = ?, strengths = ?, weaknesses = ?, notes = ?, is_active = ?
             WHERE id = ?`,
            [name.trim(), website ? website.trim() : null, strengths ? strengths.trim() : null, weaknesses ? weaknesses.trim() : null, notes ? notes.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : 1, id]
        );
        return res.status(200).json({ message: 'Cập nhật đối thủ thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi cập nhật đối thủ!' });
    }
};

// Xóa đối thủ
exports.deleteCompetitor = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM competitors WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Đã xóa đối thủ thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi xóa đối thủ!' });
    }
};