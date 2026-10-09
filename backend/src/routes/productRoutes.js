const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. LẤY DANH SÁCH SẢN PHẨM (BẢO MẬT GIÁ VỐN AC S2-05)
router.get('/', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        // Chỉ Giám đốc kinh doanh và Quản trị viên mới được xem giá vốn
        const canViewCostPrice = userRole === 'Director' || userRole === 'Admin';

        const [products] = await db.execute('SELECT * FROM products ORDER BY id DESC');

        const sanitized = products.map(p => ({
            ...p,
            cost_price: canViewCostPrice ? p.cost_price : undefined
        }));

        return res.json({ data: sanitized, canViewCostPrice });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi truy vấn danh mục sản phẩm' });
    }
});

// 2. TẠO SẢN PHẨM MỚI (CHỈ DIRECTOR VÀ ADMIN)
// 2. TẠO SẢN PHẨM MỚI (KIỂM TRA CHẶT CHẼ THEO AC S2-05)
// 2. TẠO SẢN PHẨM MỚI (CHẶN TRÙNG MÃ & BÁO LỖI CHUẨN UX)
router.post('/', verifyToken, async (req, res) => {
    const { code, name, type, unit, list_price, floor_price, cost_price } = req.body;
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh hoặc Quản trị viên mới có quyền khai báo bảng giá!' });
        }

        const cleanCode = (code || '').trim().toUpperCase();
        const cleanName = (name || '').trim();
        const listPriceNum = Number(list_price || 0);
        const floorPriceNum = Number(floor_price || 0);
        const costPriceNum = Number(cost_price || 0);

        if (!cleanCode || !cleanName) {
            return res.status(400).json({ message: 'Mã và tên sản phẩm không được để trống!' });
        }

        // RÀNG BUỘC AC S2-05: Logic giá
        if (floorPriceNum > listPriceNum) {
            return res.status(400).json({ 
                message: 'Giá sàn tối thiểu không thể lớn hơn Giá niêm yết (Giá sàn là mức đáy cho phép chiết khấu)!' 
            });
        }
        if (costPriceNum > listPriceNum) {
            return res.status(400).json({ 
                message: 'Giá vốn không thể cao hơn Giá niêm yết (nguy cơ bán lỗ)!' 
            });
        }

        // KIỂM TRA TRÙNG MÃ SẢN PHẨM / SKU TRƯỚC KHI INSERT
        const [cols] = await db.execute('SHOW COLUMNS FROM products');
        const colNames = cols.map(c => c.Field);

        let checkSql = 'SELECT id FROM products WHERE 1=0';
        const checkParams = [];
        if (colNames.includes('code')) {
            checkSql += ' OR UPPER(code) = ?';
            checkParams.push(cleanCode);
        }
        if (colNames.includes('sku')) {
            checkSql += ' OR UPPER(sku) = ?';
            checkParams.push(cleanCode);
        }

        const [existing] = await db.execute(checkSql, checkParams);
        if (existing.length > 0) {
            return res.status(400).json({ 
                message: `Mã sản phẩm "${cleanCode}" đã tồn tại trong danh mục! Vui lòng đặt mã định danh khác.` 
            });
        }

        // THỰC HIỆN GHI VÀO MYSQL
        const insertFields = ['name', 'type', 'unit', 'list_price', 'floor_price', 'cost_price', 'status'];
        const placeholders = ['?', '?', '?', '?', '?', '?', "'active'"];
        const values = [cleanName, type || 'Sản phẩm một lần', unit || 'Gói', listPriceNum, floorPriceNum, costPriceNum];

        if (colNames.includes('code')) {
            insertFields.unshift('code');
            placeholders.unshift('?');
            values.unshift(cleanCode);
        }
        if (colNames.includes('sku')) {
            insertFields.unshift('sku');
            placeholders.unshift('?');
            values.unshift(cleanCode);
        }

        const sql = `INSERT INTO products (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await db.execute(sql, values);

        return res.json({ message: `Đã thêm sản phẩm [${cleanCode}] vào danh mục bảng giá chuẩn thành công!` });
    } catch (error) {
        console.error('Lỗi POST /api/products:', error);
        
        // Bắt lỗi trùng khóa Unique (Duplicate entry) nếu chạy đồng thời
        if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('Duplicate entry'))) {
            return res.status(400).json({ 
                message: `Mã sản phẩm "${(code || '').trim().toUpperCase()}" đã tồn tại trong hệ thống! Vui lòng chọn mã khác.` 
            });
        }

        return res.status(500).json({ message: 'Lỗi máy chủ khi lưu sản phẩm vào cơ sở dữ liệu.' });
    }
});

// 3. CẬP NHẬT BẢNG GIÁ SẢN PHẨM (KIỂM TRA CHẶT CHẼ THEO AC S2-05)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền chỉnh sửa bảng giá!' });
        }

        const { name, type, unit, list_price, floor_price, cost_price } = req.body;
        const listPriceNum = Number(list_price || 0);
        const floorPriceNum = Number(floor_price || 0);
        const costPriceNum = Number(cost_price || 0);

        // RÀNG BUỘC AC S2-05
        if (floorPriceNum > listPriceNum) {
            return res.status(400).json({ 
                message: 'Giá sàn tối thiểu không thể lớn hơn Giá niêm yết!' 
            });
        }

        await db.execute(`
            UPDATE products 
            SET name = ?, type = ?, unit = ?, list_price = ?, floor_price = ?, cost_price = ?
            WHERE id = ?
        `, [name, type, unit, listPriceNum, floorPriceNum, costPriceNum, req.params.id]);

        return res.json({ message: 'Cập nhật bảng giá sản phẩm thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật sản phẩm' });
    }
});
// 4. ĐỔI TRẠNG THÁI: NGỪNG KINH DOANH THAY VÌ XÓA (AC S2-05)
router.put('/:id/toggle-status', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền đổi trạng thái kinh doanh!' });
        }

        const [prod] = await db.execute('SELECT status FROM products WHERE id = ?', [req.params.id]);
        if (prod.length === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

        const cur = prod[0].status;
        // Kiểm tra linh hoạt: nếu là 'active' hoặc 1 thì coi là đang hoạt động
        const isActive = cur === 'active' || cur === 1 || cur === '1' || (cur !== 'inactive' && cur !== 0 && cur !== '0');
        const nextStatus = isActive ? 'inactive' : 'active';

        await db.execute('UPDATE products SET status = ? WHERE id = ?', [nextStatus, req.params.id]);

        return res.json({ 
            message: nextStatus === 'active' ? 'Đã kích hoạt kinh doanh lại!' : 'Đã chuyển sang trạng thái Ngừng kinh doanh!' 
        });
    } catch (error) {
        console.error('Lỗi toggle-status:', error);
        return res.status(500).json({ message: 'Lỗi đổi trạng thái sản phẩm' });
    }
});

module.exports = router;