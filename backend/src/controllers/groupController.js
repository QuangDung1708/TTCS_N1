const db = require('../config/db');

// Hàm chuyển danh sách phẳng thành cấu trúc Cây lồng nhau (Tree Structure)
function formatToTree(groups, parentId = null) {
    const branch = [];
    for (const group of groups) {
        if (group.parent_id === parentId) {
            const children = formatToTree(groups, group.id);
            branch.push({
                ...group,
                children: children.length > 0 ? children : []
            });
        }
    }
    return branch;
}

// 1. [N1-157] Lấy toàn bộ cây sơ đồ tổ chức kinh doanh
exports.getOrganizationTree = async (req, res) => {
    try {
        const query = `
            SELECT 
                g.id, g.name, g.parent_id, g.region, g.leader_id,
                u.full_name as leader_name, u.email as leader_email,
                (SELECT COUNT(*) FROM users m WHERE m.group_id = g.id) as member_count
            FROM \`groups\` g
            LEFT JOIN users u ON g.leader_id = u.id
            ORDER BY g.parent_id ASC, g.id ASC
        `;
        const [rows] = await db.execute(query);
        const treeData = formatToTree(rows, null);

        return res.status(200).json({
            success: true,
            tree: treeData,
            flatList: rows
        });
    } catch (error) {
        console.error('Lỗi lấy cây tổ chức:', error);
        return res.status(500).json({ message: 'Lỗi server khi tải sơ đồ tổ chức!' });
    }
};

// 2. [N1-158] Tạo mới nhóm kinh doanh (gán nhóm cha, trưởng nhóm, khu vực)
exports.createGroup = async (req, res) => {
    try {
        const { name, parent_id, leader_id, region } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên nhóm kinh doanh không được để trống!' });
        }

        const parentId = parent_id ? parseInt(parent_id) : null;
        const leaderId = leader_id ? parseInt(leader_id) : null;

        const [result] = await db.execute(
            `INSERT INTO \`groups\` (name, parent_id, leader_id, region) VALUES (?, ?, ?, ?)`,
            [name.trim(), parentId, leaderId, region || 'Toàn quốc']
        );

        // Nếu có chỉ định trưởng nhóm, tự động cập nhật vai trò và nhóm của người đó
        if (leaderId) {
            await db.execute(`UPDATE users SET group_id = ?, role_id = 2 WHERE id = ?`, [result.insertId, leaderId]);
        }

        return res.status(201).json({ message: 'Tạo nhóm kinh doanh thành công!', groupId: result.insertId });
    } catch (error) {
        console.error('Lỗi tạo nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi thêm nhóm mới!' });
    }
};

// 3. [N1-158] Cập nhật thông tin nhóm (Tên, Trưởng nhóm, Khu vực)
exports.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parent_id, leader_id, region } = req.body;

        const parentId = parent_id !== undefined ? (parent_id ? parseInt(parent_id) : null) : undefined;
        const leaderId = leader_id !== undefined ? (leader_id ? parseInt(leader_id) : null) : undefined;

        // Chặn chọn chính mình làm nhóm cha (tránh vòng lặp vô tận)
        if (parentId && parseInt(parentId) === parseInt(id)) {
            return res.status(400).json({ message: 'Một nhóm không thể làm nhóm cha của chính nó!' });
        }

        await db.execute(
            `UPDATE \`groups\` SET 
                name = COALESCE(?, name),
                parent_id = COALESCE(?, parent_id),
                leader_id = COALESCE(?, leader_id),
                region = COALESCE(?, region)
             WHERE id = ?`,
            [name || null, parentId, leaderId, region || null, id]
        );

        if (leaderId) {
            await db.execute(`UPDATE users SET group_id = ?, role_id = 2 WHERE id = ?`, [id, leaderId]);
        }

        return res.status(200).json({ message: 'Cập nhật nhóm kinh doanh thành công!' });
    } catch (error) {
        console.error('Lỗi sửa nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật nhóm!' });
    }
};

// 4. [N1-158] Lấy danh sách thành viên trong nhóm & các ứng viên chưa có nhóm
exports.getGroupMembers = async (req, res) => {
    try {
        const { id } = req.params;
        // Thành viên hiện tại của nhóm
        const [members] = await db.execute(
            `SELECT id, full_name, email, role_id FROM users WHERE group_id = ?`,
            [id]
        );
        // Danh sách nhân sự chưa thuộc nhóm nào hoặc sẵn sàng điều chuyển
        const [allUsers] = await db.execute(
            `SELECT id, full_name, email, group_id FROM users WHERE role_id != 1`
        );

        return res.status(200).json({
            success: true,
            members,
            allUsers
        });
    } catch (error) {
        console.error('Lỗi lấy thành viên nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi tải thành viên!' });
    }
};

// 5. [N1-158] Điều chuyển nhân sự vào nhóm
exports.assignMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body; // Mảng [userId1, userId2...]

        if (!Array.isArray(userIds)) {
            return res.status(400).json({ message: 'Dữ liệu danh sách nhân sự không hợp lệ!' });
        }

        if (userIds.length > 0) {
            const placeholders = userIds.map(() => '?').join(',');
            await db.execute(
                `UPDATE users SET group_id = ? WHERE id IN (${placeholders})`,
                [id, ...userIds]
            );
        }

        return res.status(200).json({ message: 'Điều chuyển nhân sự thành công!' });
    } catch (error) {
        console.error('Lỗi điều chuyển nhân sự:', error);
        return res.status(500).json({ message: 'Lỗi server khi điều chuyển nhân sự!' });
    }
};
// Chỉ định hoặc thay đổi Trưởng nhóm cho một nhóm kinh doanh
// 1. Cho phép hủy bổ nhiệm (leader_id = null)
exports.setGroupLeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { leader_id } = req.body;
        const leaderId = leader_id ? parseInt(leader_id) : null;

        // Cập nhật leader_id cho nhóm
        await db.execute('UPDATE `groups` SET leader_id = ? WHERE id = ?', [leaderId, id]);

        if (leaderId) {
            await db.execute('UPDATE users SET role_id = 2, group_id = ? WHERE id = ?', [id, leaderId]);
        }

        return res.status(200).json({ 
            message: leaderId ? 'Chỉ định trưởng nhóm thành công!' : 'Đã bãi nhiệm / hủy trưởng nhóm!' 
        });
    } catch (error) {
        console.error('Lỗi chỉ định trưởng nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi chỉ định trưởng nhóm!' });
    }
};

// 2. Tự động xóa chức Trưởng nhóm ở nhóm cũ khi nhân viên bị chuyển sang nhóm mới
exports.assignMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Danh sách nhân sự không hợp lệ!' });
        }

        const placeholders = userIds.map(() => '?').join(',');

        // Tự động BỎ chức Trưởng nhóm ở các nhóm cũ nếu nhân viên này đang làm leader ở đó
        await db.execute(
            `UPDATE \`groups\` SET leader_id = NULL WHERE leader_id IN (${placeholders}) AND id != ?`,
            [...userIds, id]
        );

        // Chuyển nhóm mới cho nhân viên
        await db.execute(
            `UPDATE users SET group_id = ? WHERE id IN (${placeholders})`,
            [id, ...userIds]
        );

        return res.status(200).json({ message: 'Điều chuyển nhân sự thành công!' });
    } catch (error) {
        console.error('Lỗi điều chuyển nhân sự:', error);
        return res.status(500).json({ message: 'Lỗi server khi điều chuyển nhân sự!' });
    }
};