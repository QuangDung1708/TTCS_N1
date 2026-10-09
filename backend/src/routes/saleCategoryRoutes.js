const express = require('express');
const router = express.Router();

let db;
try {
    db = require('../config/db');
} catch (e) {
    db = require('../db');
}

// 1. API LÝ DO THẮNG / THUA
router.get('/reasons', async (req, res) => {
    const { type } = req.query; // 'win' hoặc 'lost'
    try {
        let sql = 'SELECT * FROM sale_reasons';
        const params = [];
        if (type) {
            sql += ' WHERE type = ?';
            params.push(type);
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi nạp danh mục lý do' });
    }
});

router.post('/reasons', async (req, res) => {
    const { name, type, description, status } = req.body;
    try {
        await db.query(
            'INSERT INTO sale_reasons (name, type, description, status) VALUES (?, ?, ?, ?)',
            [name.trim(), type, description || '', status || 'active']
        );
        res.json({ success: true, message: 'Thêm lý do thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi thêm lý do' });
    }
});

router.delete('/reasons/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM sale_reasons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa lý do' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa lý do' });
    }
});

// 2. API ĐỐI THỦ CẠNH TRANH
router.get('/competitors', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM competitors ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi nạp đối thủ' });
    }
});

router.post('/competitors', async (req, res) => {
    const { name, website, threat_level, strengths, weaknesses, status } = req.body;
    try {
        await db.query(
            'INSERT INTO competitors (name, website, threat_level, strengths, weaknesses, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), website || '', threat_level || 'medium', strengths || '', weaknesses || '', status || 'active']
        );
        res.json({ success: true, message: 'Thêm đối thủ thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi thêm đối thủ' });
    }
});

router.delete('/competitors/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM competitors WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa đối thủ' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa đối thủ' });
    }
});

module.exports = router;