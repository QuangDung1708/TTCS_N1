const db = require('../config/db');

// Danh sách các bảng danh mục hợp lệ để chống SQL Injection
const VALID_TABLES = {
    'industries': { table: 'industries', refColumn: 'industry_id', label: 'Ngành nghề' },
    'company-sizes': { table: 'company_sizes', refColumn: 'company_size_id', label: 'Quy mô' },
    'lead-sources': { table: 'lead_sources', refColumn: 'lead_source_id', label: 'Nguồn lead' },
    'activity-types': { table: 'activity_types', refColumn: null, label: 'Loại hoạt động' }
};

// 1. Lấy danh sách danh mục theo loại (hỗ trợ sắp xếp sort_order)
exports.getCategories = async (req, res) => {
    try {
        const { type } = req.params;
        const config = VALID_TABLES[type];
        if (!config) return res.status(400).json({ message: 'Loại danh mục không hợp lệ!' });

        const [records] = await db.execute(
            `SELECT * FROM \`${config.table}\` ORDER BY sort_order ASC, id ASC`
        );

        return res.status(200).json({ data: records });
    } catch (error) {
        console.error('Lỗi lấy danh mục:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh mục!' });
    }
};

// 2. Thêm mới giá trị danh mục
exports.createCategory = async (req, res) => {
    try {
        const { type } = req.params;
        const config = VALID_TABLES[type];
        if (!config) return res.status(400).json({ message: 'Loại danh mục không hợp lệ!' });

        const { name, code, description, sort_order, is_active } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên danh mục không được để trống!' });
        }

        // Tự động gán sort_order nếu không truyền
        let order = sort_order ? parseInt(sort_order) : 0;
        if (!sort_order) {
            const [maxRows] = await db.execute(`SELECT MAX(sort_order) AS max_order FROM \`${config.table}\``);
            order = (maxRows[0].max_order || 0) + 1;
        }

        const autoCode = code ? code.trim().toUpperCase() : `CODE_${Date.now().toString().slice(-4)}`;

        await db.execute(
            `INSERT INTO \`${config.table}\` (name, code, description, sort_order, is_active) 
             VALUES (?, ?, ?, ?, ?)`,
            [name.trim(), autoCode, description ? description.trim() : null, order, is_active !== false ? 1 : 0]
        );

        return res.status(201).json({ message: `Thêm mới ${config.label} thành công!` });
    } catch (error) {
        console.error('Lỗi thêm danh mục:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã danh mục (code) đã tồn tại trong hệ thống!' });
        }
        return res.status(500).json({ message: error.message || 'Lỗi server khi thêm danh mục!' });
    }
};

// 3. Cập nhật giá trị danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { type, id } = req.params;
        const config = VALID_TABLES[type];
        if (!config) return res.status(400).json({ message: 'Loại danh mục không hợp lệ!' });

        const { name, code, description, sort_order, is_active } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên danh mục không được để trống!' });
        }

        await db.execute(
            `UPDATE \`${config.table}\` 
             SET name = ?, code = ?, description = ?, sort_order = ?, is_active = ? 
             WHERE id = ?`,
            [
                name.trim(),
                code ? code.trim().toUpperCase() : null,
                description ? description.trim() : null,
                parseInt(sort_order) || 0,
                is_active ? 1 : 0,
                id
            ]
        );

        return res.status(200).json({ message: `Cập nhật ${config.label} thành công!` });
    } catch (error) {
        console.error('Lỗi cập nhật danh mục:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật danh mục!' });
    }
};

// 4. [N1-164] Thay đổi thứ tự hiển thị (Swap / Đổi chỗ thứ tự giữa 2 danh mục)
exports.swapOrder = async (req, res) => {
    try {
        const { type } = req.params;
        const config = VALID_TABLES[type];
        if (!config) return res.status(400).json({ message: 'Loại danh mục không hợp lệ!' });

        const { id1, order1, id2, order2 } = req.body;

        await db.execute(`UPDATE \`${config.table}\` SET sort_order = ? WHERE id = ?`, [order2, id1]);
        await db.execute(`UPDATE \`${config.table}\` SET sort_order = ? WHERE id = ?`, [order1, id2]);

        return res.status(200).json({ message: 'Cập nhật thứ tự sắp xếp thành công!' });
    } catch (error) {
        console.error('Lỗi đổi thứ tự:', error);
        return res.status(500).json({ message: 'Lỗi server khi đổi thứ tự sắp xếp!' });
    }
};

// 5. [N1-165] Xóa danh mục kèm logic RÀNG BUỘC TOÀN VẸN (Chặn xóa nếu đang được tham chiếu)
exports.deleteCategory = async (req, res) => {
    try {
        const { type, id } = req.params;
        const config = VALID_TABLES[type];
        if (!config) return res.status(400).json({ message: 'Loại danh mục không hợp lệ!' });

        // Kiểm tra ràng buộc dữ liệu thực tế tại bảng customers
        if (config.refColumn) {
            const [checkRef] = await db.execute(
                `SELECT COUNT(*) AS total FROM customers WHERE \`${config.refColumn}\` = ?`,
                [id]
            );

            if (checkRef[0].total > 0) {
                return res.status(400).json({
                    message: `⚠️ Không thể xóa: Giá trị này đang được ${checkRef[0].total} khách hàng thực tế sử dụng! Vui lòng chuyển trạng thái sang "Ngừng kích hoạt" để bảo toàn dữ liệu lịch sử.`
                });
            }
        }

        // Nếu không có dữ liệu nào tham chiếu -> Cho phép xóa
        await db.execute(`DELETE FROM \`${config.table}\` WHERE id = ?`, [id]);
        return res.status(200).json({ message: `Đã xóa ${config.label} thành công!` });
    } catch (error) {
        console.error('Lỗi xóa danh mục:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa danh mục!' });
    }
};