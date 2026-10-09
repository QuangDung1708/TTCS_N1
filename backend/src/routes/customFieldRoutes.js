const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. LẤY DANH SÁCH TRƯỜNG TÙY BIẾN THEO THỰC THỂ (customer / deal)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { entity_type } = req.query;
        let sql = 'SELECT * FROM custom_fields';
        const params = [];

        if (entity_type) {
            sql += ' WHERE entity_type = ?';
            params.push(entity_type);
        }
        sql += ' ORDER BY sort_order ASC, id ASC';

        const [rows] = await db.execute(sql, params);
        return res.json({ data: rows });
    } catch (error) {
        console.error('Lỗi GET /api/custom-fields:', error);
        return res.status(500).json({ message: 'Lỗi nạp danh sách trường tùy biến' });
    }
});

// 2. THÊM TRƯỜNG TÙY BIẾN MỚI (CHỈ ADMIN MỚI ĐƯỢC PHÉP - RBAC)
router.post('/', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Quản trị hệ thống (Admin) mới có quyền khai báo trường tùy biến!' });
        }

        const { entity_type, field_name, field_key, data_type, options, is_required } = req.body;
        if (!entity_type || !field_name || !field_key || !data_type) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin trường bắt buộc!' });
        }

        const cleanKey = field_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

        // Kiểm tra trùng key trong cùng thực thể
        const [existing] = await db.execute(
            'SELECT id FROM custom_fields WHERE entity_type = ? AND field_key = ?',
            [entity_type, cleanKey]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: `Mã định danh "${cleanKey}" đã tồn tại trong nhóm này!` });
        }

        // Tự tính sort_order
        const [maxRow] = await db.execute(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM custom_fields WHERE entity_type = ?',
            [entity_type]
        );
        const sortOrder = maxRow[0]?.next_order || 1;

        await db.execute(`
            INSERT INTO custom_fields (entity_type, field_name, field_key, data_type, options, is_required, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
        `, [
            entity_type, 
            field_name.trim(), 
            cleanKey, 
            data_type, 
            data_type === 'select' ? (options || '').trim() : null, 
            is_required ? 1 : 0, 
            sortOrder
        ]);

        return res.json({ message: 'Khai báo trường tùy biến mới thành công!' });
    } catch (error) {
        console.error('Lỗi POST /api/custom-fields:', error);
        return res.status(500).json({ message: error.message || 'Lỗi server khi tạo trường' });
    }
});

// 3. CẬP NHẬT TRƯỜNG TÙY BIẾN
router.put('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Quản trị hệ thống (Admin) mới có quyền sửa trường tùy biến!' });
        }

        const { field_name, data_type, options, is_required, status } = req.body;
        await db.execute(`
            UPDATE custom_fields 
            SET field_name = ?, data_type = ?, options = ?, is_required = ?, status = ?
            WHERE id = ?
        `, [
            field_name.trim(), 
            data_type, 
            data_type === 'select' ? (options || '').trim() : null, 
            is_required ? 1 : 0, 
            status || 'active', 
            req.params.id
        ]);

        return res.json({ message: 'Cập nhật cấu hình trường tùy biến thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật trường tùy biến' });
    }
});

// 4. XÓA TRƯỜNG TÙY BIẾN
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Quản trị hệ thống (Admin) mới có quyền xóa trường tùy biến!' });
        }

        await db.execute('DELETE FROM custom_fields WHERE id = ?', [req.params.id]);
        return res.json({ message: 'Đã xóa trường tùy biến khỏi hệ thống!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi xóa trường' });
    }
});

module.exports = router;