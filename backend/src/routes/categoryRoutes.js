const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. LẤY DANH SÁCH DANH MỤC (Hỗ trợ lọc theo type)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type } = req.query;
        let sql = 'SELECT * FROM sales_categories';
        const params = [];

        if (type) {
            sql += ' WHERE type = ?';
            params.push(type);
        }
        sql += ' ORDER BY sort_order ASC, id ASC';

        const [rows] = await db.execute(sql, params);
        return res.json({ data: rows });
    } catch (error) {
        console.error('Lỗi GET /api/categories:', error);
        return res.status(500).json({ message: 'Lỗi nạp danh mục bán hàng' });
    }
});

// 2. THÊM DANH MỤC MỚI (CHỈ DIRECTOR VÀ ADMIN)
router.post('/', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh hoặc Admin mới có quyền khai báo danh mục!' });
        }

        const { type, name, code, description } = req.body;
        if (!type || !name || !code) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ loại danh mục, tên và mã định danh!' });
        }

        const cleanCode = code.trim().toUpperCase();

        // Kiểm tra trùng mã trong cùng loại
        const [existing] = await db.execute(
            'SELECT id FROM sales_categories WHERE type = ? AND code = ?',
            [type, cleanCode]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: `Mã [${cleanCode}] đã tồn tại trong nhóm này! Vui lòng chọn mã khác.` });
        }

        // Tự động tính thứ tự sort_order kế tiếp
        const [maxRows] = await db.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM sales_categories WHERE type = ?', [type]);
        const nextOrder = maxRows[0]?.next_order || 1;

        await db.execute(`
            INSERT INTO sales_categories (type, name, code, description, sort_order, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `, [type, name.trim(), cleanCode, description || '', nextOrder]);

        return res.json({ message: 'Thêm mục mới vào danh mục thành công!' });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Lỗi khi lưu danh mục' });
    }
});

// 3. SỬA DANH MỤC
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền chỉnh sửa!' });
        }

        const { name, description, status } = req.body;
        await db.execute(`
            UPDATE sales_categories 
            SET name = ?, description = ?, status = ?
            WHERE id = ?
        `, [name, description || '', status || 'active', req.params.id]);

        return res.json({ message: 'Cập nhật danh mục thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật danh mục' });
    }
});

// 4. SẮP XẾP THỨ TỰ HIỂN THỊ (AC 3: LÊN / XUỐNG)
router.put('/:id/swap-order', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc mới có quyền đổi thứ tự hiển thị!' });
        }

        const { direction } = req.body; // 'UP' hoặc 'DOWN'
        const currentId = req.params.id;

        const [curRows] = await db.execute('SELECT id, type, sort_order FROM sales_categories WHERE id = ?', [currentId]);
        if (curRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy bản ghi' });

        const curItem = curRows[0];
        const compareOperator = direction === 'UP' ? '<' : '>';
        const orderDirection = direction === 'UP' ? 'DESC' : 'ASC';

        // Tìm phần tử liền kề trong cùng nhóm type
        const [adjacentRows] = await db.execute(`
            SELECT id, sort_order 
            FROM sales_categories 
            WHERE type = ? AND sort_order ${compareOperator} ? 
            ORDER BY sort_order ${orderDirection} 
            LIMIT 1
        `, [curItem.type, curItem.sort_order]);

        if (adjacentRows.length === 0) {
            return res.json({ message: 'Đã ở vị trí đầu/cuối cùng!' });
        }

        const targetItem = adjacentRows[0];

        // Hoán đổi vị trí (swap)
        await db.execute('UPDATE sales_categories SET sort_order = ? WHERE id = ?', [targetItem.sort_order, curItem.id]);
        await db.execute('UPDATE sales_categories SET sort_order = ? WHERE id = ?', [curItem.sort_order, targetItem.id]);

        return res.json({ message: 'Đã cập nhật vị trí ưu tiên!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi đổi thứ tự hiển thị' });
    }
});

// 5. XÓA DANH MỤC (AC 2: CHẶN NẾU ĐANG ĐƯỢC THAM CHIẾU)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userRole = req.user?.role_code;
        if (userRole !== 'Director' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc mới có quyền xóa danh mục!' });
        }

        const categoryId = req.params.id;
        const [catRows] = await db.execute('SELECT * FROM sales_categories WHERE id = ?', [categoryId]);
        if (catRows.length === 0) return res.status(404).json({ message: 'Danh mục không tồn tại' });

        const item = catRows[0];

        // KIỂM TRA THAM CHIẾU RÀNG BUỘC (AC 2)
        let isReferenced = false;
        let refReason = '';

        // Kiểm tra trong bảng customers (ngành nghề / quy mô)
        try {
            const [custCheck] = await db.execute(
                'SELECT id FROM customers WHERE industry_code = ? OR industry = ? OR customer_type = ? LIMIT 1',
                [item.code, item.name, item.name]
            );
            if (custCheck.length > 0) {
                isReferenced = true;
                refReason = 'khách hàng trong hệ thống';
            }
        } catch (_) {}

        // Kiểm tra trong bảng deals / leads (nguồn lead)
        if (!isReferenced) {
            try {
                const [leadCheck] = await db.execute(
                    'SELECT id FROM deals WHERE lead_source = ? OR lead_source_id = ? LIMIT 1',
                    [item.code, item.id]
                );
                if (leadCheck.length > 0) {
                    isReferenced = true;
                    refReason = 'cơ hội bán hàng (Deals)';
                }
            } catch (_) {}
        }

        // Báo lỗi không cho xóa nếu đang được tham chiếu (AC 2)
        if (isReferenced) {
            return res.status(400).json({ 
                message: `Mục "${item.name}" đang được liên kết với dữ liệu ${refReason}, không thể xóa! Vui lòng chỉ tắt trạng thái hoạt động.` 
            });
        }

        // Thực hiện xóa nếu an toàn
        await db.execute('DELETE FROM sales_categories WHERE id = ?', [categoryId]);
        return res.json({ message: `Đã xóa danh mục [${item.name}] thành công!` });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi xóa danh mục' });
    }
});

module.exports = router;