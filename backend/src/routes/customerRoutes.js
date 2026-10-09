const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. GET ALL CUSTOMERS
router.get('/', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM customers ORDER BY id DESC');
        return res.json({ data: rows });
    } catch (error) {
        console.error('Lỗi GET /api/customers:', error);
        return res.status(500).json({ message: 'Lỗi tải danh sách khách hàng' });
    }
});

// 2. CREATE CUSTOMER (LƯU CẢ CUSTOM_FIELDS)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, phone, email, company_name, address, custom_fields } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ message: 'Tên và số điện thoại không được để trống!' });
        }

        const cfString = custom_fields ? JSON.stringify(custom_fields) : null;

        await db.execute(`
            INSERT INTO customers (name, phone, email, company_name, address, custom_fields)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name.trim(), phone.trim(), email || '', company_name || '', address || '', cfString]);

        return res.json({ message: 'Thêm khách hàng mới thành công!' });
    } catch (error) {
        console.error('Lỗi POST /api/customers:', error);
        return res.status(500).json({ message: 'Lỗi khi lưu khách hàng vào cơ sở dữ liệu' });
    }
});

// 3. UPDATE CUSTOMER
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name, phone, email, company_name, address, custom_fields } = req.body;
        const cfString = custom_fields ? JSON.stringify(custom_fields) : null;

        await db.execute(`
            UPDATE customers 
            SET name = ?, phone = ?, email = ?, company_name = ?, address = ?, custom_fields = ?
            WHERE id = ?
        `, [name.trim(), phone.trim(), email || '', company_name || '', address || '', cfString, req.params.id]);

        return res.json({ message: 'Cập nhật thông tin khách hàng thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật khách hàng' });
    }
});

// 4. DELETE CUSTOMER
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
        return res.json({ message: 'Xóa khách hàng thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi xóa khách hàng' });
    }
});

module.exports = router;