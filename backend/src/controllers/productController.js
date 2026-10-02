const db = require('../config/db');

// 1. LẤY DANH SÁCH SẢN PHẨM (Có tìm kiếm, lọc theo loại, lọc theo trạng thái & phân trang)
exports.getAllProducts = async (req, res) => {
    try {
        const { search, type, status, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const userRole = req.user?.role || '';

        let whereConditions = [];
        let queryParams = [];

        // Tìm kiếm theo mã hoặc tên sản phẩm
        if (search) {
            whereConditions.push('(code LIKE ? OR name LIKE ?)');
            queryParams.push(`%\({search}%`, `%\){search}%`);
        }

        // Lọc theo loại sản phẩm (ONE_TIME / SUBSCRIPTION)
        if (type) {
            whereConditions.push('type = ?');
            queryParams.push(type);
        }

        // Lọc theo trạng thái (ACTIVE / INACTIVE)
        if (status) {
            whereConditions.push('status = ?');
            queryParams.push(status);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Đếm tổng số bản ghi phục vụ phân trang
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM products ${whereClause}`, queryParams);
        const totalItems = countResult[0].total;

        // Truy vấn danh sách sản phẩm
        const sql = `SELECT * FROM products ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
        const [products] = await db.query(sql, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Ẩn trường cost_price (Giá vốn) nếu người dùng không phải Giám đốc kinh doanh
        const formattedProducts = products.map(product => {
            const p = { ...product };
            if (userRole !== 'GIAM_DOC_KINH_DOANH' && userRole !== 'Sales Director') {
                delete p.cost_price;
            }
            return p;
        });

        res.status(200).json({
            success: true,
            data: formattedProducts,
            pagination: {
                totalItems,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalItems / parseInt(limit)),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. LẤY CHI TIẾT SẢN PHẨM THEO ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role || '';
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const product = { ...products[0] };
        if (userRole !== 'GIAM_DOC_KINH_DOANH' && userRole !== 'Sales Director') {
            delete product.cost_price;
        }

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. THÊM MỚI SẢN PHẨM
exports.createProduct = async (req, res) => {
    try {
        const { code, name, type, unit, list_price, floor_price, cost_price } = req.body;

        if (!code || !name || !unit || list_price === undefined || floor_price === undefined) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
        }

        const query = `
            INSERT INTO products (code, name, type, unit, list_price, floor_price, cost_price, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `;
        const [result] = await db.query(query, [code, name, type || 'ONE_TIME', unit, list_price, floor_price, cost_price || null]);

        res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. CẬP NHẬT THÔNG TIN SẢN PHẨM
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, type, unit, list_price, floor_price, cost_price } = req.body;

        const query = `
            UPDATE products 
            SET code = ?, name = ?, type = ?, unit = ?, list_price = ?, floor_price = ?, cost_price = ?
            WHERE id = ?
        `;
        const [result] = await db.query(query, [code, name, type, unit, list_price, floor_price, cost_price, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật' });
        }

        res.status(200).json({ success: true, message: 'Cập nhật thông tin sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. CẬP NHẬT TRẠNG THÁI SẢN PHẨM (ACTIVE / INACTIVE)
exports.updateProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (Chỉ nhận ACTIVE hoặc INACTIVE)' });
        }

        const [result] = await db.query('UPDATE products SET status = ? WHERE id = ?', [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        res.status(200).json({ success: true, message: `Đã cập nhật trạng thái sản phẩm sang ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. XÓA SẢN PHẨM (Tự động chuyển ngầm thành INACTIVE nếu đã có trong Báo giá)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem sản phẩm đã từng xuất hiện trong báo giá nào chưa
        const [quoteCheck] = await db.query('SELECT COUNT(*) as count FROM quotation_items WHERE product_id = ?', [id]).catch(() => [[{ count: 0 }]]);

        if (quoteCheck[0].count > 0) {
            await db.query('UPDATE products SET status = "INACTIVE" WHERE id = ?', [id]);
            return res.status(200).json({
                success: true,
                message: 'Sản phẩm đã xuất hiện trong báo giá nên không thể xóa hẳn. Đã tự động chuyển sang trạng thái Ngừng kinh doanh.'
            });
        }

        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Đã xóa sản phẩm thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};