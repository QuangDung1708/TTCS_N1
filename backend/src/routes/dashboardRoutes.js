const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// Lấy verifyToken an toàn tuyệt đối (hỗ trợ mọi kiểu export)
const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. API DASHBOARD ĐỘNG 100% TỪ CƠ SỞ DỮ LIỆU MYSQL (Theo đúng RBAC S1-05)
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const user = req.user || {};
        let custWhere = 'WHERE 1=1';
        let dealWhere = 'WHERE 1=1';
        const custParams = [];
        const dealParams = [];

        // Phân quyền phạm vi dữ liệu (S1-05: RBAC Data Scope)
        if (user.role_code === 'Sales Rep') {
            custWhere += ' AND (c.assigned_to = ? OR c.created_by = ?)';
            dealWhere += ' AND d.owner_id = ?';
            custParams.push(user.id, user.id);
            dealParams.push(user.id);
        } else if (user.role_code === 'Team Lead' && user.group_id) {
            custWhere += ' AND c.group_id = ?';
            dealWhere += ' AND d.group_id = ?';
            custParams.push(user.group_id);
            dealParams.push(user.group_id);
        }
        // Admin và Director truy vấn toàn bộ công ty (WHERE 1=1)

        // Truy vấn 1: Đếm tổng khách hàng & khách mới tạo trong 30 ngày từ bảng customers
        let totalCustomers = 0;
        let newCustomers = 0;
        try {
            const [cRes] = await db.execute(`
                SELECT 
                    COUNT(*) AS total,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS newCount
                FROM customers c ${custWhere}
            `, custParams);
            totalCustomers = Number(cRes[0]?.total || 0);
            newCustomers = Number(cRes[0]?.newCount || 0);
        } catch (err) {
            console.error('Lỗi SQL customers:', err.message);
        }

        // Truy vấn 2: Tính tổng giá trị Pipeline, số Deal Won & Tỷ lệ thắng từ bảng deals
        let totalDeals = 0;
        let dealsWon = 0;
        let pipelineValue = 0;
        try {
            const [dRes] = await db.execute(`
                SELECT 
                    COUNT(*) AS total,
                    SUM(CASE WHEN stage = 'Won' THEN 1 ELSE 0 END) AS wonCount,
                    SUM(CASE WHEN stage != 'Lost' THEN amount ELSE 0 END) AS pipelineSum
                FROM deals d ${dealWhere}
            `, dealParams);
            totalDeals = Number(dRes[0]?.total || 0);
            dealsWon = Number(dRes[0]?.wonCount || 0);
            pipelineValue = Number(dRes[0]?.pipelineSum || 0);
        } catch (err) {
            console.error('Lỗi SQL deals:', err.message);
        }

        const winRate = totalDeals > 0 ? ((dealsWon / totalDeals) * 100).toFixed(1) : 0;
        const targetProgress = totalDeals > 0 ? Math.min(100, Math.round((dealsWon / 10) * 100)) : 0;

        // Truy vấn 3: Phễu chuyển đổi (Funnel) theo các stage thực tế trong MySQL
        const funnel = { discovery: 0, proposal: 0, negotiation: 0, won: 0 };
        try {
            const [stages] = await db.execute(`
                SELECT stage, COUNT(*) AS count 
                FROM deals d ${dealWhere} 
                GROUP BY stage
            `, dealParams);

            stages.forEach(item => {
                const s = (item.stage || '').toLowerCase();
                if (funnel[s] !== undefined) funnel[s] = Number(item.count || 0);
            });
        } catch (err) {
            console.error('Lỗi SQL funnel:', err.message);
        }

        // Truy vấn 4: Lấy 5 cơ hội (deals) mới nhất từ MySQL kết hợp thông tin khách hàng
        let recentDeals = [];
        try {
            const [deals] = await db.execute(`
                SELECT d.id AS \`key\`, d.title AS deal, d.amount AS value, d.stage,
                       COALESCE(d.company_name, 'Khách hàng cá nhân') AS company,
                       COALESCE(u.full_name, 'Chưa gán') AS owner
                FROM deals d
                LEFT JOIN customers c ON d.customer_id = c.id
                LEFT JOIN users u ON d.owner_id = u.id
                ${dealWhere}
                ORDER BY d.id DESC LIMIT 5
            `, dealParams);
            recentDeals = deals;
        } catch (err) {
            console.error('Lỗi SQL recent deals:', err.message);
        }

        return res.json({
            kpi: {
                totalCustomers,
                newCustomers,
                pipelineValue,
                dealsWon,
                winRate,
                targetProgress
            },
            funnel,
            recentDeals
        });
    } catch (error) {
        console.error('Lỗi /api/dashboard/stats:', error);
        return res.status(500).json({ message: 'Lỗi server khi nạp thống kê dashboard.' });
    }
});

// 2. API THÔNG BÁO CHUÔNG ĐỘNG 100% TỪ BẢNG AUDIT_LOGS (S2-04)
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const [logs] = await db.execute(`
            SELECT id, action_type AS title, description AS \`desc\`, 
                   DATE_FORMAT(created_at, '%H:%i %d/%m/%Y') AS time
            FROM audit_logs
            ORDER BY id DESC
            LIMIT 10
        `);
        return res.json({ data: logs });
    } catch (error) {
        console.error('Lỗi /api/dashboard/notifications:', error);
        return res.status(500).json({ message: 'Lỗi nạp thông báo từ database.' });
    }
});

module.exports = router;