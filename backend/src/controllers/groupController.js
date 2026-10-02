const db = require('../config/db');

// Nhóm cha không được là con cháu của chính nhóm đang sửa (tránh vòng lặp)
async function createsCycle(conn, groupId, newParentId) {
    const visited = new Set();
    let current = newParentId;
    while (current) {
        if (current === groupId || visited.has(current)) return true;
        visited.add(current);
        const [rows] = await conn.execute('SELECT parent_id FROM `groups` WHERE id = ?', [current]);
        current = rows.length ? rows[0].parent_id : null;
    }
    return false;
}

// Trưởng nhóm phải ACTIVE, thuộc đúng nhóm này, và chưa làm trưởng nhóm khác
async function validateLeader(conn, leaderId, groupId) {
    const [rows] = await conn.execute('SELECT id, group_id, status FROM users WHERE id = ?', [leaderId]);
    if (rows.length === 0) return 'Không tìm thấy người được chọn làm trưởng nhóm!';
    if (rows[0].status !== 'ACTIVE') return 'Trưởng nhóm phải là tài khoản đang hoạt động!';
    if (rows[0].group_id !== groupId) return 'Trưởng nhóm phải là thành viên của chính nhóm này!';
    const [other] = await conn.execute(
        'SELECT id FROM `groups` WHERE leader_id = ? AND id <> ?', [leaderId, groupId]
    );
    if (other.length > 0) return 'Người này đang là trưởng của nhóm khác!';
    return null;
}

// GET /api/groups -> trả về dạng cây
const getGroupTree = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT g.id, g.name, g.description, g.parent_id, g.leader_id, g.region_id,
                   r.name AS region_name, u.full_name AS leader_name,
                   (SELECT COUNT(*) FROM users m WHERE m.group_id = g.id) AS member_count
            FROM \`groups\` g
            LEFT JOIN users u ON g.leader_id = u.id
            LEFT JOIN regions r ON g.region_id = r.id
            ORDER BY g.id
        `);
        const map = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
        const roots = [];
        for (const node of map.values()) {
            if (node.parent_id && map.has(node.parent_id)) map.get(node.parent_id).children.push(node);
            else roots.push(node);
        }
        return res.status(200).json({ data: roots });
    } catch (error) {
        console.error('Lỗi lấy cây tổ chức:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy cơ cấu tổ chức!' });
    }
};

// POST /api/groups  { name, description, parent_id, region_id }
const createGroup = async (req, res) => {
    try {
        const { name, description = null, parent_id = null, region_id = null } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên nhóm là bắt buộc!' });
        }
        if (parent_id) {
            const [p] = await db.execute('SELECT id FROM `groups` WHERE id = ?', [parent_id]);
            if (p.length === 0) return res.status(400).json({ message: 'Nhóm cha không tồn tại!' });
        }
        if (region_id) {
            const [r] = await db.execute('SELECT id FROM regions WHERE id = ?', [region_id]);
            if (r.length === 0) return res.status(400).json({ message: 'Khu vực không tồn tại!' });
        }
        const [result] = await db.execute(
            'INSERT INTO `groups` (name, description, parent_id, region_id) VALUES (?, ?, ?, ?)',
            [name.trim(), description, parent_id || null, region_id || null]
        );
        return res.status(201).json({ message: 'Tạo nhóm thành công!', groupId: result.insertId });
    } catch (error) {
        console.error('Lỗi tạo nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo nhóm!' });
    }
};

// PUT /api/groups/:id  { name?, description?, parent_id?, leader_id?, region_id? }
const updateGroup = async (req, res) => {
    const groupId = parseInt(req.params.id);
    if (!groupId) return res.status(400).json({ message: 'ID nhóm không hợp lệ!' });

    const { name, description, parent_id, leader_id, region_id } = req.body;
    const conn = await db.getConnection();
    try {
        const [groups] = await conn.execute('SELECT * FROM `groups` WHERE id = ?', [groupId]);
        if (groups.length === 0) return res.status(404).json({ message: 'Không tìm thấy nhóm!' });
        const g = groups[0];

        const newParent = parent_id !== undefined ? (parent_id ? parseInt(parent_id) : null) : g.parent_id;
        const newLeader = leader_id !== undefined ? (leader_id ? parseInt(leader_id) : null) : g.leader_id;
        const newRegion = region_id !== undefined ? (region_id ? parseInt(region_id) : null) : g.region_id;

        if (newParent) {
            const [p] = await conn.execute('SELECT id FROM `groups` WHERE id = ?', [newParent]);
            if (p.length === 0) return res.status(400).json({ message: 'Nhóm cha không tồn tại!' });
            if (await createsCycle(conn, groupId, newParent)) {
                return res.status(400).json({ message: 'Không thể chọn nhóm này làm cha vì sẽ tạo vòng lặp trong cây!' });
            }
        }
        if (newRegion) {
            const [r] = await conn.execute('SELECT id FROM regions WHERE id = ?', [newRegion]);
            if (r.length === 0) return res.status(400).json({ message: 'Khu vực không tồn tại!' });
        }
        if (newLeader && newLeader !== g.leader_id) {
            const err = await validateLeader(conn, newLeader, groupId);
            if (err) return res.status(400).json({ message: err });
        }

        await conn.execute(
            'UPDATE `groups` SET name = ?, description = ?, parent_id = ?, leader_id = ?, region_id = ? WHERE id = ?',
            [
                name?.trim() || g.name,
                description !== undefined ? description : g.description,
                newParent, newLeader, newRegion, groupId
            ]
        );
        return res.status(200).json({ message: 'Cập nhật nhóm thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật nhóm:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật nhóm!' });
    } finally {
        conn.release();
    }
};

// PUT /api/groups/:id/members  { user_id } -> chuyển nhân viên sang nhóm này (tự rời nhóm cũ)
const assignMember = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const userId = parseInt(req.body.user_id);
        if (!userId) return res.status(400).json({ message: 'Thiếu user_id!' });

        const [g] = await db.execute('SELECT id FROM `groups` WHERE id = ?', [groupId]);
        if (g.length === 0) return res.status(404).json({ message: 'Không tìm thấy nhóm!' });

        const [u] = await db.execute('SELECT id, group_id FROM users WHERE id = ?', [userId]);
        if (u.length === 0) return res.status(404).json({ message: 'Không tìm thấy nhân viên!' });

        // Đang là trưởng của nhóm khác thì phải đổi trưởng nhóm đó trước
        const [leads] = await db.execute('SELECT id FROM `groups` WHERE leader_id = ? AND id <> ?', [userId, groupId]);
        if (leads.length > 0) {
            return res.status(400).json({ message: 'Nhân viên đang là trưởng của nhóm khác, hãy đổi trưởng nhóm đó trước!' });
        }

        await db.execute('UPDATE users SET group_id = ? WHERE id = ?', [groupId, userId]);
        return res.status(200).json({ message: 'Đã chuyển nhân viên vào nhóm!' });
    } catch (error) {
        console.error('Lỗi gán thành viên:', error);
        return res.status(500).json({ message: 'Lỗi server khi gán thành viên!' });
    }
};

module.exports = { getGroupTree, createGroup, updateGroup, assignMember };