const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. LẤY 10 THÔNG BÁO MỚI NHẤT CHO POPUP CHUÔNG (ĐẶT ĐẦU ROUTER ĐỂ TRÁNH 404)
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10');
        return res.json({ data: rows });
    } catch (error) {
        console.error('Lỗi GET notifications:', error);
        return res.status(500).json({ message: 'Lỗi nạp thông báo' });
    }
});

// 2. LẤY TOÀN BỘ NHẬT KÝ THEO BỘ LỌC (AC S2-04)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { entity_type, from_date, to_date } = req.query;
        let sql = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

        // Nếu khác 'ALL' và có giá trị thì mới lọc theo đối tượng
        if (entity_type && entity_type !== 'ALL') {
            sql += ' AND entity_type = ?';
            params.push(entity_type);
        }
        if (from_date) {
            sql += ' AND DATE(created_at) >= ?';
            params.push(from_date);
        }
        if (to_date) {
            sql += ' AND DATE(created_at) <= ?';
            params.push(to_date);
        }

        sql += ' ORDER BY created_at DESC LIMIT 100';

        const [rows] = await db.execute(sql, params);
        return res.json({ data: rows });
    } catch (error) {
        console.error('Lỗi GET audit_logs:', error);
        return res.status(500).json({ message: 'Lỗi nạp nhật ký hệ thống' });
    }
});

module.exports = router;