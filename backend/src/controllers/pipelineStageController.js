const db = require('../config/db');

// 1. Lấy danh sách tất cả các giai đoạn pipeline (sắp xếp theo thứ tự luồng phễu)
const getPipelineStages = async (req, res) => {
    try {
        const [stages] = await db.execute(
            `SELECT * FROM pipeline_stages ORDER BY sort_order ASC, id ASC`
        );
        return res.status(200).json({ data: stages });
    } catch (error) {
        console.error('Lỗi lấy danh sách pipeline stages:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách giai đoạn pipeline!' });
    }
};

// 2. Thêm mới một giai đoạn pipeline
const createPipelineStage = async (req, res) => {
    try {
        const { code, name, description, win_probability, sort_order, exit_condition } = req.body;

        // Validation cơ bản
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên giai đoạn không được để trống!' });
        }

        const prob = parseInt(win_probability);
        if (isNaN(prob) || prob < 0 || prob > 100) {
            return res.status(400).json({ message: 'Xác suất thắng dự báo phải là số nguyên từ 0% đến 100%!' });
        }

        const stageCode = code && code.trim() ? code.trim().toUpperCase() : `STAGE_${Date.now()}`;

        // Lấy thứ tự lớn nhất nếu không truyền
        let finalOrder = parseInt(sort_order);
        if (isNaN(finalOrder) || finalOrder <= 0) {
            const [maxOrder] = await db.execute('SELECT MAX(sort_order) AS max_o FROM pipeline_stages');
            finalOrder = (maxOrder[0].max_o || 0) + 1;
        }

        await db.execute(
            `INSERT INTO pipeline_stages (code, name, description, win_probability, sort_order, exit_condition, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [stageCode, name.trim(), description ? description.trim() : null, prob, finalOrder, exit_condition || 'none']
        );

        return res.status(201).json({ message: 'Thêm giai đoạn pipeline thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Mã định danh giai đoạn (Code) đã tồn tại!' });
        }
        console.error('Lỗi tạo giai đoạn pipeline:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo giai đoạn pipeline!' });
    }
};

// 3. Cập nhật thông tin chi tiết một giai đoạn (tên, xác suất %, điều kiện bắt buộc rời bước)
const updatePipelineStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, win_probability, sort_order, exit_condition, is_active } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên giai đoạn không được để trống!' });
        }

        const prob = parseInt(win_probability);
        if (isNaN(prob) || prob < 0 || prob > 100) {
            return res.status(400).json({ message: 'Xác suất thắng dự báo phải nằm trong khoảng từ 0% đến 100%!' });
        }

        await db.execute(
            `UPDATE pipeline_stages 
             SET name = ?, description = ?, win_probability = ?, sort_order = ?, exit_condition = ?, is_active = ?
             WHERE id = ?`,
            [
                name.trim(),
                description ? description.trim() : null,
                prob,
                parseInt(sort_order) || 1,
                exit_condition || 'none',
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                id
            ]
        );

        return res.status(200).json({ message: 'Cập nhật giai đoạn pipeline thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật pipeline stage:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật giai đoạn!' });
    }
};

// 4. Hoán đổi thứ tự giữa 2 giai đoạn (swap-order)
const swapPipelineStageOrder = async (req, res) => {
    try {
        const { id1, id2 } = req.body;
        if (!id1 || !id2) {
            return res.status(400).json({ message: 'Thiếu ID giai đoạn cần hoán đổi!' });
        }

        const [rows] = await db.execute('SELECT id, sort_order FROM pipeline_stages WHERE id IN (?, ?)', [id1, id2]);
        if (rows.length !== 2) {
            return res.status(404).json({ message: 'Không tìm thấy các giai đoạn cần hoán đổi!' });
        }

        const order1 = rows[0].sort_order;
        const order2 = rows[1].sort_order;

        await db.execute('UPDATE pipeline_stages SET sort_order = ? WHERE id = ?', [order2, rows[0].id]);
        await db.execute('UPDATE pipeline_stages SET sort_order = ? WHERE id = ?', [order1, rows[1].id]);

        return res.status(200).json({ message: 'Cập nhật thứ tự luồng phễu thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi hoán đổi thứ tự!' });
    }
};

// 5. Kiểm tra điều kiện bắt buộc để rời một giai đoạn (N1-177)
const validateStageTransition = async (req, res) => {
    try {
        const { deal_id, current_stage_id, next_stage_id } = req.body;

        // Lấy thông tin giai đoạn hiện tại
        const [stages] = await db.execute('SELECT * FROM pipeline_stages WHERE id = ?', [current_stage_id]);
        if (stages.length === 0) {
            return res.status(404).json({ message: 'Giai đoạn hiện tại không tồn tại!' });
        }

        const currentStage = stages[0];
        const condition = currentStage.exit_condition;

        // Kiểm tra từng điều kiện rời giai đoạn
        if (condition === 'require_meeting') {
            // Giả lập / kiểm tra: cơ hội phải có ít nhất 1 cuộc gặp/hoạt động
            const [activities] = await db.execute(
                `SELECT COUNT(*) AS count FROM customer_activities WHERE (customer_id = ? OR 1=1) AND activity_type_id IS NOT NULL`,
                [deal_id || 0]
            );
            // Nếu deal thực tế chưa có hoạt động nào (hoặc kiểm tra thực tế theo deal_id)
            if (activities[0].count === 0) {
                return res.status(400).json({
                    allowed: false,
                    message: `⚠️ Điều kiện bắt buộc chưa thỏa mãn: Giai đoạn "${currentStage.name}" yêu cầu phải có ít nhất 01 cuộc gặp/lịch hẹn với khách hàng trước khi chuyển bước!`
                });
            }
        } else if (condition === 'require_quote') {
            // Kiểm tra có báo giá hay không
            // (Khi tích hợp module Deal, kiểm tra bảng quotes hoặc quote_amount > 0)
        }

        return res.status(200).json({
            allowed: true,
            message: 'Đủ điều kiện chuyển giai đoạn!'
        });
    } catch (error) {
        console.error('Lỗi kiểm tra điều kiện chuyển bước:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra điều kiện chuyển bước!' });
    }
};

module.exports = {
    getPipelineStages,
    createPipelineStage,
    updatePipelineStage,
    swapPipelineStageOrder,
    validateStageTransition
};