const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// 1. LẤY CÂY TỔ CHỨC KINH DOANH (AC S2-06)
router.get('/tree', verifyToken, async (req, res) => {
    try {
        // Lấy danh sách nhóm kèm thông tin Trưởng nhóm, Khu vực và số lượng thành viên
        const [groups] = await db.execute(`
            SELECT g.id, g.parent_id, g.name, g.description, g.region_id, g.leader_id,
                   r.name AS region_name,
                   u.full_name AS leader_name, u.email AS leader_email,
                   (SELECT COUNT(*) FROM users WHERE group_id = g.id) AS member_count
            FROM \`groups\` g
            LEFT JOIN regions r ON g.region_id = r.id
            LEFT JOIN users u ON g.leader_id = u.id
            ORDER BY g.id ASC
        `);

        // Lấy danh sách toàn bộ nhân sự để hiển thị thành viên theo nhóm
        const [users] = await db.execute(`
            SELECT id, full_name, email, role_code, group_id, status 
            FROM users 
            WHERE status != 'inactive'
        `);

        // Hàm đệ quy dựng cấu trúc cây cha - con
        const buildTree = (parentId = null) => {
            return groups
                .filter(item => item.parent_id === parentId)
                .map(item => {
                    const children = buildTree(item.id);
                    const members = users.filter(u => u.group_id === item.id);
                    return {
                        key: item.id,
                        ...item,
                        members,
                        children: children.length > 0 ? children : undefined
                    };
                });
        };

        const treeData = buildTree(null);
        return res.json({ 
            treeData: treeData.length > 0 ? treeData : groups,
            rawGroups: groups,
            allUsers: users
        });
    } catch (error) {
        console.error('Lỗi GET /api/organization/tree:', error);
        return res.status(500).json({ message: 'Lỗi nạp cây tổ chức kinh doanh' });
    }
});

// 2. LẤY DANH SÁCH KHU VỰC ĐỊA LÝ
router.get('/regions', verifyToken, async (req, res) => {
    try {
        const [regions] = await db.execute('SELECT * FROM regions ORDER BY id ASC');
        return res.json({ data: regions });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi nạp khu vực địa lý' });
    }
});

// 3. THÊM MỚI KHU VỰC ĐỊA LÝ
router.post('/regions', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh hoặc Admin mới có quyền khai báo khu vực!' });
        }
        const { name, code, description } = req.body;
        if (!name || !code) return res.status(400).json({ message: 'Vui lòng điền đủ tên và mã khu vực!' });

        await db.execute('INSERT INTO regions (name, code, description) VALUES (?, ?, ?)', [
            name.trim(), code.trim().toUpperCase(), description || ''
        ]);
        return res.json({ message: 'Thêm khu vực địa lý thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi khi tạo khu vực' });
    }
});

// 4. THÊM NHÓM KINH DOANH MỚI TRONG CÂY TỔ CHỨC
router.post('/groups', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền tạo nhánh tổ chức!' });
        }
        const { name, parent_id, leader_id, region_id, description } = req.body;
        if (!name) return res.status(400).json({ message: 'Tên nhóm kinh doanh không được để trống!' });

        const [result] = await db.execute(`
            INSERT INTO \`groups\` (name, parent_id, leader_id, region_id, description)
            VALUES (?, ?, ?, ?, ?)
        `, [name.trim(), parent_id || null, leader_id || null, region_id || null, description || '']);

        // Nếu có chỉ định Trưởng nhóm, gán luôn trưởng nhóm vào nhóm này
        if (leader_id) {
            await db.execute('UPDATE users SET group_id = ? WHERE id = ?', [result.insertId, leader_id]);
        }

        return res.json({ message: 'Thêm nhóm kinh doanh vào cây tổ chức thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi khi tạo nhóm kinh doanh' });
    }
});

// 5. CẬP NHẬT NHÓM KINH DOANH
router.put('/groups/:id', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc kinh doanh mới có quyền sửa cơ cấu tổ chức!' });
        }
        const { name, parent_id, leader_id, region_id, description } = req.body;
        const groupId = req.params.id;

        // Tránh chọn chính mình làm nhóm cha
        if (Number(parent_id) === Number(groupId)) {
            return res.status(400).json({ message: 'Không thể chọn chính nhóm này làm nhóm cha!' });
        }

        await db.execute(`
            UPDATE \`groups\`
            SET name = ?, parent_id = ?, leader_id = ?, region_id = ?, description = ?
            WHERE id = ?
        `, [name.trim(), parent_id || null, leader_id || null, region_id || null, description || '', groupId]);

        // Cập nhật group_id cho Trưởng nhóm
        if (leader_id) {
            await db.execute('UPDATE users SET group_id = ? WHERE id = ?', [groupId, leader_id]);
        }

        return res.json({ message: 'Cập nhật nhóm kinh doanh thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi cập nhật nhóm kinh doanh' });
    }
});

// 6. ĐIỀU CHUYỂN NHÂN SỰ VÀO NHÓM (MỖI NHÂN VIÊN THUỘC ĐÚNG 1 NHÓM - AC S2-06)
router.post('/groups/:id/assign-member', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc mới có quyền điều chuyển nhân sự!' });
        }
        const { user_id } = req.body;
        const groupId = req.params.id;

        await db.execute('UPDATE users SET group_id = ? WHERE id = ?', [groupId, user_id]);
        return res.json({ message: 'Điều chuyển nhân viên vào nhóm thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi gán nhân viên vào nhóm' });
    }
});

// 7. XÓA NHÓM KINH DOANH
router.delete('/groups/:id', verifyToken, async (req, res) => {
    try {
        if (req.user?.role_code !== 'Director' && req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Giám đốc mới có quyền giải thể nhóm!' });
        }
        const groupId = req.params.id;

        // Chặn nếu có nhóm con
        const [children] = await db.execute('SELECT id FROM `groups` WHERE parent_id = ?', [groupId]);
        if (children.length > 0) {
            return res.status(400).json({ message: 'Không thể xóa nhóm này vì đang chứa các nhánh phòng ban con!' });
        }

        // Chuyển nhân sự nhóm này về trạng thái Chưa gán
        await db.execute('UPDATE users SET group_id = NULL WHERE group_id = ?', [groupId]);
        await db.execute('DELETE FROM `groups` WHERE id = ?', [groupId]);

        return res.json({ message: 'Đã giải thể nhóm kinh doanh thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi khi xóa nhóm' });
    }
});

module.exports = router;