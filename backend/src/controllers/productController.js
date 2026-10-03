const db = require('../config/db');

// [1] LẤY DANH SÁCH SẢN PHẨM (Phân trang, Search, Lọc, Bảo mật Giá Vốn)
exports.getProducts = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', type = '', status = '' } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const offset = (page - 1) * limit;

        // Chỉ Giám đốc / Admin (role_id === 1) mới được xem giá vốn
        const isDirector = req.user && req.user.role_id === 1;

        let whereClauses = ['1=1'];
        let queryParams = [];

        if (search && search.trim()) {
            whereClauses.push('(code LIKE ? OR name LIKE ?)');
            const keyword = `%${search.trim()}%`;
            queryParams.push(keyword, keyword);
        }

        if (type) {
            whereClauses.push('type = ?');
            queryParams.push(type);
        }

        if (status) {
            whereClauses.push('status = ?');
            queryParams.push(status);
        }

        const whereSql = whereClauses.join(' AND ');

        // Đếm tổng số bản ghi
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM products WHERE ${whereSql}`,
            queryParams
        );
        const total = countResult[0].total;

        // Giấu cột cost_price nếu là Sales / Trưởng nhóm
        const selectFields = isDirector
            ? 'id, code, name, type, unit, list_price, floor_price, cost_price, status, created_at'
            : 'id, code, name, type, unit, list_price, floor_price, status, created_at';

        const [products] = await db.execute(
            `SELECT ${selectFields} FROM products WHERE ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit.toString(), offset.toString()]
        );

        return res.status(200).json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi server khi tải sản phẩm!' });
    }
};

// [2] THÊM MỚI SẢN PHẨM
exports.createProduct = async (req, res) => {
    try {
        const { code, name, type, unit, list_price, floor_price, cost_price } = req.body;
        const isDirector = req.user && req.user.role_id === 1;

        if (!code || !name || !unit || list_price === undefined || floor_price === undefined) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc!' });
        }

        const numListPrice = parseFloat(list_price);
        const numFloorPrice = parseFloat(floor_price);

        // Nghiệp vụ: Giá sàn <= Giá niêm yết
        if (numFloorPrice > numListPrice) {
            return res.status(400).json({ message: 'Nghiệp vụ vi phạm: Giá sàn không được lớn hơn Giá niêm yết!' });
        }

        if (numFloorPrice < 0 || numListPrice < 0) {
            return res.status(400).json({ message: 'Giá sản phẩm không được là số âm!' });
        }

        // Chỉ Giám đốc mới có quyền ghi giá vốn
        const finalCostPrice = (isDirector && cost_price !== undefined) ? parseFloat(cost_price) : 0;

        await db.execute(
            `INSERT INTO products (code, name, type, unit, list_price, floor_price, cost_price, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [code.trim().toUpperCase(), name.trim(), type || 'one_time', unit.trim(), numListPrice, numFloorPrice, finalCostPrice]
        );

        return res.status(201).json({ message: 'Thêm mới sản phẩm thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã sản phẩm này đã tồn tại trên hệ thống!' });
        }
        console.error('Lỗi tạo sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi server khi thêm sản phẩm!' });
    }
};

// [3] CẬP NHẬT THÔNG TIN SẢN PHẨM
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, unit, list_price, floor_price, cost_price, status } = req.body;
        const isDirector = req.user && req.user.role_id === 1;

        if (list_price !== undefined && floor_price !== undefined) {
            if (parseFloat(floor_price) > parseFloat(list_price)) {
                return res.status(400).json({ message: 'Nghiệp vụ vi phạm: Giá sàn không được lớn hơn Giá niêm yết!' });
            }
        }

        let updateQuery = `
            UPDATE products SET 
                name = COALESCE(?, name),
                type = COALESCE(?, type),
                unit = COALESCE(?, unit),
                list_price = COALESCE(?, list_price),
                floor_price = COALESCE(?, floor_price),
                status = COALESCE(?, status)
        `;
        let params = [name, type, unit, list_price, floor_price, status];

        // Nếu là Giám đốc và có truyền giá vốn thì cho cập nhật
        if (isDirector && cost_price !== undefined) {
            updateQuery += `, cost_price = ?`;
            params.push(cost_price);
        }

        updateQuery += ` WHERE id = ?`;
        params.push(id);

        await db.execute(updateQuery, params);
        return res.status(200).json({ message: 'Cập nhật sản phẩm thành công!' });
    } catch (error) {
        console.error('Lỗi sửa sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật sản phẩm!' });
    }
};

// [4] BẬT/TẮT TRẠNG THÁI KINH DOANH (Thay vì xóa cứng)
exports.toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT status FROM products WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });

        const currentStatus = rows[0].status;
        const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

        await db.execute('UPDATE products SET status = ? WHERE id = ?', [nextStatus, id]);

        return res.status(200).json({
            message: nextStatus === 'active' ? 'Đã mở bán lại sản phẩm!' : 'Đã ngừng kinh doanh sản phẩm!',
            status: nextStatus
        });
    } catch (error) {
        console.error('Lỗi đổi trạng thái sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi server khi đổi trạng thái!' });
    }
};