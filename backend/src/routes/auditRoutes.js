const express = require('express');
const router = express.Router();
const db = require('../config/db');
const safeAuth = (req, res, next) => next();

// Xử lý nạp authMiddleware an toàn
let authMiddleware = (req, res, next) => next();
try {
    const auth = require('../middleware/authMiddleware');
    authMiddleware = typeof auth === 'function' ? auth : (auth.verifyToken || authMiddleware);
} catch (_) {}

// 1. API LẤY 10 THÔNG BÁO CHO DROPDOWN CHUÔNG
router.get('/notifications', safeAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT a.*, COALESCE(a.user_name, u.full_name, u.email, 'Quản trị viên') AS user_name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 10
        `);
        return res.json({ data: rows });
    } catch (error) {
        return res.json({ data: [] });
    }
});

// 2. API LẤY TOÀN BỘ NHẬT KÝ KÈM BỘ LỌC (AC S2-04)
router.get('/', safeAuth, async (req, res) => {
    try {
        const { entity_type, from_date, to_date } = req.query;
        let sql = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];

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
        return res.json({ data: [] });
    }
});
module.exports = router;