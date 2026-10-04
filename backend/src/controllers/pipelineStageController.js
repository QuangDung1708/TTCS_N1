const db = require('../config/db');

// ==========================================
// 1. LẤY DANH SÁCH CÁC GIAI ĐOẠN PIPELINE (sắp theo sort_order)
// ==========================================
const getStages = async (req, res) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';

        const [stages] = await db.execute(`
            SELECT id, name, sort_order, win_probability, exit_criteria, is_active, created_at, updated_at
            FROM pipeline_stages
            ${whereClause}
            ORDER BY sort_order ASC, id ASC
        `);

        // Đếm số cơ hội đang sử dụng từng giai đoạn (nếu bảng deals tồn tại)
        let stagesWithCount = stages;
        try {
            const [counts] = await db.execute(`
                SELECT stage_id, COUNT(*) AS deal_count
                FROM deals
                GROUP BY stage_id
            `);
            const countMap = new Map(counts.map(c => [c.stage_id, c.deal_count]));
            stagesWithCount = stages.map(s => ({
                ...s,
                deal_count: countMap.get(s.id) || 0
            }));
        } catch {
            // Bảng deals chưa tồn tại -> bỏ qua, trả về deal_count = 0
            stagesWithCount = stages.map(s => ({ ...s, deal_count: 0 }));
        }

        return res.status(200).json({ data: stagesWithCount });
    } catch (error) {
        console.error('Lỗi lấy danh sách giai đoạn pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách giai đoạn pipeline!' });
    }
};

// ==========================================
// 2. LẤY CHI TIẾT MỘT GIAI ĐOẠN
// ==========================================
const getStageById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pipeline_stages WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giai đoạn pipeline!' });
        }
        return res.status(200).json({ data: rows[0] });
    } catch (error) {
        console.error('Lỗi lấy chi tiết giai đoạn:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết giai đoạn pipeline!' });
    }
};

// ==========================================
// 3. TẠO GIAI ĐOẠN MỚI
// ==========================================
const createStage = async (req, res) => {
    try {
        const { name, sort_order, win_probability, exit_criteria } = req.body;

        // Validate tên giai đoạn bắt buộc
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên giai đoạn là bắt buộc!' });
        }

        // Validate xác suất thắng 0 - 100
        const prob = parseInt(win_probability);
        if (win_probability !== undefined && win_probability !== null && win_probability !== '') {
            if (isNaN(prob) || prob < 0 || prob > 100) {
                return res.status(400).json({ message: 'Xác suất thắng phải nằm trong khoảng 0 - 100%!' });
            }
        }

        // Validate sort_order phải là số nguyên không âm
        const order = parseInt(sort_order);
        if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
            if (isNaN(order) || order < 0) {
                return res.status(400).json({ message: 'Thứ tự bước phải là số nguyên không âm!' });
            }
        }

        // Nếu không cung cấp sort_order, tự động gán = max + 1
        let finalOrder = order;
        if (sort_order === undefined || sort_order === null || sort_order === '' || isNaN(order)) {
            const [maxRow] = await db.execute('SELECT MAX(sort_order) AS max_order FROM pipeline_stages');
            finalOrder = (maxRow[0].max_order || 0) + 1;
        }

        const [result] = await db.execute(
            'INSERT INTO pipeline_stages (name, sort_order, win_probability, exit_criteria) VALUES (?, ?, ?, ?)',
            [name.trim(), finalOrder, prob || 0, exit_criteria || null]
        );

        return res.status(201).json({
            message: 'Tạo giai đoạn pipeline thành công!',
            stageId: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Tên giai đoạn đã tồn tại trong pipeline!' });
        }
        console.error('Lỗi tạo giai đoạn pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo giai đoạn pipeline!' });
    }
};

// ==========================================
// 4. CẬP NHẬT GIAI ĐOẠN (tên, xác suất, điều kiện rời)
// ==========================================
const updateStage = async (req, res) => {
    try {
        const stageId = parseInt(req.params.id);
        if (!stageId) return res.status(400).json({ message: 'ID giai đoạn không hợp lệ!' });

        const { name, sort_order, win_probability, exit_criteria, is_active } = req.body;

        // Kiểm tra giai đoạn tồn tại
        const [existing] = await db.execute('SELECT * FROM pipeline_stages WHERE id = ?', [stageId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giai đoạn pipeline!' });
        }
        const stage = existing[0];

        // Validate xác suất thắng nếu có
        let finalProb = stage.win_probability;
        if (win_probability !== undefined && win_probability !== null && win_probability !== '') {
            const prob = parseInt(win_probability);
            if (isNaN(prob) || prob < 0 || prob > 100) {
                return res.status(400).json({ message: 'Xác suất thắng phải nằm trong khoảng 0 - 100%!' });
            }
            finalProb = prob;
        }

        // Validate sort_order nếu có
        let finalOrder = stage.sort_order;
        if (sort_order !== undefined && sort_order !== null && sort_order !== '') {
            const order = parseInt(sort_order);
            if (isNaN(order) || order < 0) {
                return res.status(400).json({ message: 'Thứ tự bước phải là số nguyên không âm!' });
            }
            finalOrder = order;
        }

        // Xử lý is_active: vô hiệu hóa thay vì xóa, bảo toàn cơ hội đang chạy
        let finalActive = stage.is_active;
        if (is_active !== undefined) {
            finalActive = is_active === true || is_active === 'true' || is_active === 1;
        }

        await db.execute(
            `UPDATE pipeline_stages 
             SET name = ?, sort_order = ?, win_probability = ?, exit_criteria = ?, is_active = ?
             WHERE id = ?`,
            [
                name?.trim() || stage.name,
                finalOrder,
                finalProb,
                exit_criteria !== undefined ? exit_criteria : stage.exit_criteria,
                finalActive,
                stageId
            ]
        );

        return res.status(200).json({ message: 'Cập nhật giai đoạn pipeline thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Tên giai đoạn đã tồn tại trong pipeline!' });
        }
        console.error('Lỗi cập nhật giai đoạn pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật giai đoạn pipeline!' });
    }
};

// ==========================================
// 5. CẬP NHẬT THỨ TỰ HÀNG LOẠT (Reorder - Kéo thả)
//    Body: { stages: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }, ...] }
// ==========================================
const reorderStages = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { stages } = req.body;

        if (!Array.isArray(stages) || stages.length === 0) {
            return res.status(400).json({ message: 'Danh sách giai đoạn không hợp lệ! Cần mảng [{id, sort_order}].' });
        }

        // Validate mỗi phần tử phải có id và sort_order hợp lệ
        for (const item of stages) {
            if (!item.id || item.sort_order === undefined || item.sort_order === null) {
                return res.status(400).json({ message: 'Mỗi giai đoạn phải có id và sort_order!' });
            }
            if (parseInt(item.sort_order) < 0) {
                return res.status(400).json({ message: 'sort_order phải là số nguyên không âm!' });
            }
        }

        await conn.beginTransaction();

        for (const item of stages) {
            await conn.execute(
                'UPDATE pipeline_stages SET sort_order = ? WHERE id = ?',
                [parseInt(item.sort_order), parseInt(item.id)]
            );
        }

        await conn.commit();
        return res.status(200).json({ message: 'Cập nhật thứ tự pipeline thành công!' });
    } catch (error) {
        await conn.rollback();
        console.error('Lỗi cập nhật thứ tự pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật thứ tự pipeline!' });
    } finally {
        conn.release();
    }
};

// ==========================================
// 6. XÓA MỀM GIAI ĐOẠN (Vô hiệu hóa - is_active = FALSE)
//    Thay đổi cấu hình không làm hỏng cơ hội đang chạy
// ==========================================
const deleteStage = async (req, res) => {
    try {
        const stageId = parseInt(req.params.id);
        if (!stageId) return res.status(400).json({ message: 'ID giai đoạn không hợp lệ!' });

        const [existing] = await db.execute('SELECT * FROM pipeline_stages WHERE id = ?', [stageId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy giai đoạn pipeline!' });
        }

        // Kiểm tra nếu có cơ hội (deals) đang sử dụng giai đoạn này -> chỉ vô hiệu hóa, không xóa cứng
        let hasDeal = false;
        try {
            const [deals] = await db.execute('SELECT COUNT(*) AS cnt FROM deals WHERE stage_id = ?', [stageId]);
            hasDeal = deals[0].cnt > 0;
        } catch {
            // Bảng deals chưa tồn tại -> không có cơ hội nào
        }

        if (hasDeal) {
            // Vô hiệu hóa thay vì xóa để bảo toàn dữ liệu cơ hội đang chạy
            await db.execute('UPDATE pipeline_stages SET is_active = FALSE WHERE id = ?', [stageId]);
            return res.status(200).json({
                message: 'Giai đoạn đang được sử dụng bởi cơ hội kinh doanh, đã vô hiệu hóa thay vì xóa để bảo toàn dữ liệu!'
            });
        }

        // Không có cơ hội nào đang dùng -> xóa cứng an toàn
        await db.execute('DELETE FROM pipeline_stages WHERE id = ?', [stageId]);
        return res.status(200).json({ message: 'Xóa giai đoạn pipeline thành công!' });
    } catch (error) {
        console.error('Lỗi xóa giai đoạn pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa giai đoạn pipeline!' });
    }
};

module.exports = { getStages, getStageById, createStage, updateStage, reorderStages, deleteStage };
