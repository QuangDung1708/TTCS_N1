const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

let logAudit = async () => {};
try {
    const logger = require('../utils/auditLogger');
    if (logger && logger.logAudit) logAudit = logger.logAudit;
} catch (e) {
    console.warn('Chưa nạp được auditLogger:', e.message);
}

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// =========================================================================
// 1. CÁC ROUTE GIAI ĐOẠN (STAGES) - PHẢI ĐẶT TRÊN CÙNG ĐỂ TRÁNH TRÙNG ROUTE
// =========================================================================

// Đổi thứ tự giai đoạn Lên (UP) / Xuống (DOWN) bằng mũi tên (S2-09)
router.put('/stages/:id/swap-order', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh hoặc Admin mới có quyền đổi thứ tự!' });
        }

        const { direction } = req.body; // 'UP' hoặc 'DOWN'
        const stageId = req.params.id;

        const [curRows] = await db.execute('SELECT id, sort_order FROM pipeline_stages WHERE id = ?', [stageId]);
        if (curRows.length === 0) return res.status(404).json({ message: 'Không tìm thấy giai đoạn' });
        const curItem = curRows[0];

        const compareOp = direction === 'UP' ? '<' : '>';
        const orderDir = direction === 'UP' ? 'DESC' : 'ASC';

        const [adjRows] = await db.execute(`
            SELECT id, sort_order 
            FROM pipeline_stages 
            WHERE sort_order ${compareOp} ? 
            ORDER BY sort_order ${orderDir} 
            LIMIT 1
        `, [curItem.sort_order]);

        if (adjRows.length === 0) {
            return res.json({ message: 'Giai đoạn đã ở vị trí đầu/cuối cùng!' });
        }

        const targetItem = adjRows[0];

        // Đổi chỗ thứ tự giữa 2 giai đoạn
        await db.execute('UPDATE pipeline_stages SET sort_order = ? WHERE id = ?', [targetItem.sort_order, curItem.id]);
        await db.execute('UPDATE pipeline_stages SET sort_order = ? WHERE id = ?', [curItem.sort_order, targetItem.id]);

        return res.json({ message: 'Đã cập nhật thứ tự phễu bán hàng thành công!' });
    } catch (error) {
        console.error('Lỗi swap-order stage:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi đổi thứ tự giai đoạn' });
    }
});

// Thêm giai đoạn mới vào phễu (S2-09)
router.post('/stages', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền tạo giai đoạn mới!' });
        }

        const { name, code, probability, required_condition } = req.body;
        if (!name || !code) {
            return res.status(400).json({ message: 'Tên giai đoạn và mã định danh không được để trống!' });
        }

        const cleanCode = code.trim().toUpperCase();
        const [existing] = await db.execute('SELECT id FROM pipeline_stages WHERE UPPER(code) = ?', [cleanCode]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `Mã giai đoạn "${cleanCode}" đã tồn tại!` });
        }

        const [maxOrder] = await db.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pipeline_stages');
        const sortOrder = maxOrder[0]?.next_order || 1;

        await db.execute(`
            INSERT INTO pipeline_stages (name, code, probability, sort_order, required_condition)
            VALUES (?, ?, ?, ?, ?)
        `, [name.trim(), cleanCode, Number(probability || 10), sortOrder, required_condition || null]);

        return res.json({ message: 'Đã thêm giai đoạn mới vào phễu bán hàng!' });
    } catch (error) {
        console.error('Lỗi POST /stages:', error);
        return res.status(500).json({ message: error.message || 'Lỗi khi tạo giai đoạn mới' });
    }
});

// Giám đốc cập nhật xác suất & điều kiện của giai đoạn
router.put('/stages/:id', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc mới có quyền cấu hình Pipeline!' });
        }
        const { probability, required_condition } = req.body;
        await db.execute('UPDATE pipeline_stages SET probability = ?, required_condition = ? WHERE id = ?', [
            probability, 
            required_condition || null, 
            req.params.id
        ]);
        return res.json({ message: 'Cập nhật cấu hình giai đoạn thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật cấu hình stage' });
    }
});

// =========================================================================
// 2. ROUTE LÝ DO THẮNG/THUA & ĐỐI THỦ CẠNH TRANH (S2-10)
// =========================================================================

// Thêm lý do thắng/thua
// THÊM LÝ DO THẮNG / THUA (TỰ ĐỘNG THÍCH ỨNG CỘT DATABASE)
router.post('/reasons', verifyToken, async (req, res) => {
    try {
        const { type, name, code, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Tên nguyên nhân không được để trống!' });
        }

        const cleanCode = (code || `REASON_${Date.now()}`).trim().toUpperCase();

        // 1. Quét các cột thực tế đang có trong bảng deal_reasons
        const [colRows] = await db.execute('SHOW COLUMNS FROM deal_reasons');
        const existingCols = colRows.map(c => c.Field);

        const insertCols = ['name'];
        const placeholders = ['?'];
        const values = [name.trim()];

        if (existingCols.includes('type')) {
            insertCols.push('type');
            placeholders.push('?');
            // Chuẩn hóa type thành 'WIN' hoặc 'LOSS'
            const normType = (type === 'LOST' || type === 'THUA') ? 'LOSS' : (type || 'WIN');
            values.push(normType);
        }

        if (existingCols.includes('code')) {
            insertCols.push('code');
            placeholders.push('?');
            values.push(cleanCode);
        }

        if (existingCols.includes('description')) {
            insertCols.push('description');
            placeholders.push('?');
            values.push(description || '');
        }

        if (existingCols.includes('status')) {
            insertCols.push('status');
            placeholders.push('?');
            values.push('active');
        }

        // 2. Thực thi chèn dữ liệu an toàn
        const sql = `INSERT INTO deal_reasons (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await db.execute(sql, values);

        return res.json({ message: 'Khai báo lý do mới thành công!' });
    } catch (error) {
        console.error('Lỗi POST /api/deals/reasons:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: `Mã lý do "${code}" đã tồn tại! Vui lòng chọn mã khác.` });
        }
        return res.status(500).json({ message: error.message || 'Lỗi máy chủ khi lưu lý do vào database' });
    }
});

// Thêm đối thủ cạnh tranh
router.post('/competitors', verifyToken, async (req, res) => {
    try {
        const { name, strengths, weaknesses } = req.body;
        if (!name) return res.status(400).json({ message: 'Tên đối thủ không được để trống!' });

        await db.execute(`
            INSERT INTO competitors (name, strengths, weaknesses)
            VALUES (?, ?, ?)
        `, [name.trim(), strengths || '', weaknesses || '']);

        return res.json({ message: 'Thêm đối thủ cạnh tranh thành công!' });
    } catch (error) {
        console.error('Lỗi POST /competitors:', error);
        return res.status(500).json({ message: 'Lỗi khi lưu đối thủ vào database' });
    }
});

// =========================================================================
// 3. ROUTE DEALS CHÍNH (GET, POST, UPDATE STAGE)
// =========================================================================

// Lấy danh sách Deal và Stages
router.get('/', verifyToken, async (req, res) => {
    try {
        const user = req.user || {};
        let dealWhere = 'WHERE 1=1';
        const params = [];

        if (user.role_code === 'Sales Rep') {
            dealWhere += ' AND owner_id = ?';
            params.push(user.id);
        } else if (user.role_code === 'Team Lead' && user.group_id) {
            dealWhere += ' AND group_id = ?';
            params.push(user.group_id);
        }

        let stages = [];
        try {
            const [stRows] = await db.execute('SELECT * FROM pipeline_stages ORDER BY sort_order ASC, id ASC');
            stages = stRows;
        } catch (_) {}

        let deals = [];
        try {
            const [dRows] = await db.execute(`SELECT * FROM deals ${dealWhere} ORDER BY id DESC`, params);
            deals = dRows;
        } catch (_) {}

        let customers = [];
        let users = [];
        let reasons = [];
        let competitors = [];

        try { const [c] = await db.execute('SELECT * FROM customers'); customers = c; } catch (_) {}
        try { const [u] = await db.execute('SELECT id, full_name FROM users'); users = u; } catch (_) {}
        try { const [r] = await db.execute('SELECT * FROM deal_reasons'); reasons = r; } catch (_) {}
        try { const [comp] = await db.execute('SELECT * FROM competitors'); competitors = comp; } catch (_) {}

        const custMap = {};
        customers.forEach(c => { custMap[c.id] = c.company_name || c.name || `Khách hàng #${c.id}`; });

        const userMap = {};
        users.forEach(u => { userMap[u.id] = u.full_name; });

        const reasonMap = {};
        reasons.forEach(r => { reasonMap[r.id] = r.name; });

        const compMap = {};
        competitors.forEach(cp => { compMap[cp.id] = cp.name; });

        const formattedDeals = deals.map(d => ({
            ...d,
            customer_name: custMap[d.customer_id] || 'Khách hàng vãng lai',
            owner_name: userMap[d.owner_id] || 'Chưa gán',
            win_reason_name: reasonMap[d.win_reason_id] || '',
            loss_reason_name: reasonMap[d.loss_reason_id] || '',
            competitor_name: compMap[d.competitor_id] || ''
        }));

        return res.json({ stages, deals: formattedDeals, reasons, competitors });
    } catch (error) {
        console.error('Lỗi GET /api/deals:', error);
        return res.status(500).json({ message: 'Lỗi nạp dữ liệu Pipeline' });
    }
});

// Tạo cơ hội mới
router.post('/', verifyToken, async (req, res) => {
    try {
        const { title, customer_id, amount, stage } = req.body;
        if (!title || !customer_id) {
            return res.status(400).json({ message: 'Vui lòng điền tên cơ hội và chọn khách hàng!' });
        }

        await db.execute(`
            INSERT INTO deals (title, customer_id, owner_id, group_id, amount, stage)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            title, 
            customer_id, 
            req.user?.id || 1, 
            req.user?.group_id || null, 
            amount || 0, 
            stage || 'Discovery'
        ]);

        return res.json({ message: 'Tạo cơ hội kinh doanh mới thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi tạo cơ hội' });
    }
});

// Chuyển giai đoạn / Đóng Deal (Won/Lost S2-10)
router.put('/:id/stage', verifyToken, async (req, res) => {
    try {
        const dealId = req.params.id;
        const { stage, win_reason_id, loss_reason_id, competitor_id, loss_note } = req.body;

        // 1. Lấy thông tin Deal hiện tại
        const [dealRows] = await db.execute('SELECT title, amount, stage FROM deals WHERE id = ?', [dealId]);
        if (dealRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy cơ hội' });
        }
        const currentDeal = dealRows[0];

        // 2. Cập nhật bảng deals an toàn theo các cột thực tế
        const [cols] = await db.execute('SHOW COLUMNS FROM deals');
        const existingCols = cols.map(c => c.Field);

        const updateParts = ['stage = ?'];
        const values = [stage];

        if (existingCols.includes('win_reason_id')) { updateParts.push('win_reason_id = ?'); values.push(win_reason_id || null); }
        if (existingCols.includes('loss_reason_id')) { updateParts.push('loss_reason_id = ?'); values.push(loss_reason_id || null); }
        if (existingCols.includes('competitor_id')) { updateParts.push('competitor_id = ?'); values.push(competitor_id || null); }
        if (existingCols.includes('loss_note')) { updateParts.push('loss_note = ?'); values.push(loss_note || null); }

        values.push(dealId);
        await db.execute(`UPDATE deals SET ${updateParts.join(', ')} WHERE id = ?`, values);

        // 3. Ghi audit log an toàn
        const executor = req.user?.full_name ? `${req.user.full_name} (${req.user.role_code || 'Sales'})` : 'Dũng Quang (Admin)';
        const formattedAmount = Number(currentDeal.amount || 0).toLocaleString('vi-VN') + ' đ';

        if (stage === 'Won') {
            await logAudit({
                userName: executor,
                actionType: 'TARGET_UPDATE',
                entityType: 'Chỉ tiêu doanh số',
                entityId: `DEAL-${dealId}`,
                beforeValue: `Giai đoạn: ${currentDeal.stage}`,
                afterValue: 'Chốt thành công (Won)',
                description: `${executor} đã chốt thành công hợp đồng cho cơ hội [${currentDeal.title}], ghi nhận doanh thu thực tế ${formattedAmount}`
            });
        } else if (stage === 'Lost') {
            await logAudit({
                userName: executor,
                actionType: 'DISCOUNT_CHANGE',
                entityType: 'Chiết khấu Deal',
                entityId: `DEAL-${dealId}`,
                beforeValue: `Giai đoạn: ${currentDeal.stage}`,
                afterValue: 'Đóng thất bại (Lost)',
                description: `${executor} đã báo đóng thất bại cơ hội [${currentDeal.title}] (${formattedAmount}). Ghi chú: ${loss_note || 'Thất bại trước đối thủ'}`
            });
        }

        return res.json({ message: `Cơ hội đã chuyển sang giai đoạn [${stage}] thành công!` });
    } catch (error) {
        console.error('Lỗi cập nhật giai đoạn cơ hội:', error);
        return res.status(500).json({ message: error.message || 'Lỗi cập nhật giai đoạn cơ hội' });
    }
});

module.exports = router;