const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');

const verifyToken = typeof authMiddleware === 'function' 
    ? authMiddleware 
    : (authMiddleware.verifyToken || ((req, res, next) => next()));

// =========================================================================
// 1. API LẤY DANH SÁCH VAI TRÒ ĐỘNG TỪ DATABASE (Marketing, CSM, Kế toán, v.v.)
// =========================================================================
router.get('/roles/list', verifyToken, async (req, res) => {
    try {
        let roles = [];
        // Thử lấy từ bảng roles nếu có
        try {
            const [rows] = await db.execute('SELECT * FROM roles ORDER BY id ASC');
            if (rows.length > 0) {
                roles = rows.map(r => ({
                    code: r.code || r.role_code || r.name,
                    name: r.name || r.code
                }));
            }
        } catch (_) {}

        // Quét thêm tất cả các vai trò thực tế đang có trong bảng users
        try {
            const [uRoles] = await db.execute('SELECT DISTINCT role_code FROM users WHERE role_code IS NOT NULL AND role_code != ""');
            const userRoleCodes = uRoles.map(r => r.role_code);

            const baseRoles = [
                { code: 'Admin', name: 'Quản trị hệ thống (Admin)' },
                { code: 'Director', name: 'Giám đốc kinh doanh (Director)' },
                { code: 'Team Lead', name: 'Trưởng nhóm kinh doanh (Team Lead)' },
                { code: 'Sales Rep', name: 'Nhân viên kinh doanh (Sales Rep)' },
                { code: 'Marketing', name: 'Chuyên viên Marketing' },
                { code: 'Accountant', name: 'Kế toán doanh nghiệp' },
                { code: 'CSM', name: 'Chăm sóc khách hàng (CSM)' }
            ];

            baseRoles.forEach(br => {
                if (!roles.some(r => r.code.toLowerCase() === br.code.toLowerCase())) {
                    roles.push(br);
                }
            });

            userRoleCodes.forEach(code => {
                if (!roles.some(r => r.code.toLowerCase() === code.toLowerCase())) {
                    roles.push({ code, name: code });
                }
            });
        } catch (_) {}

        return res.json({ data: roles });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi tải danh mục vai trò' });
    }
});

// =========================================================================
// 2. API LẤY DANH SÁCH NHÓM KINH DOANH
// =========================================================================
router.get('/groups/list', verifyToken, async (req, res) => {
    try {
        const [groups] = await db.execute('SELECT id, name FROM `groups`');
        return res.json({ data: groups });
    } catch (_) {
        return res.json({ data: [] });
    }
});

// =========================================================================
// 3. API TẠO THỦ CÔNG NGƯỜI DÙNG MỚI (NÚT THÊM NGƯỜI DÙNG)
// =========================================================================
router.post('/', verifyToken, async (req, res) => {
    try {
        const { full_name, email, password, role_code, group_id, phone } = req.body;

        if (!full_name || !email) {
            return res.status(400).json({ message: 'Họ tên và email không được để trống!' });
        }

        // Kiểm tra trùng email
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống!' });
        }

        const [colRows] = await db.execute('SHOW COLUMNS FROM users');
        const existingCols = colRows.map(c => c.Field);
        const pwdCol = existingCols.includes('password_hash') ? 'password_hash' : (existingCols.includes('password') ? 'password' : null);

        const defaultPwd = password || '123456@crm';
        const passwordHash = await bcrypt.hash(defaultPwd, 10);

        const insertCols = ['full_name', 'email'];
        const placeholders = ['?', '?'];
        const values = [full_name.trim(), email.trim().toLowerCase()];

        if (pwdCol) {
            insertCols.push(pwdCol);
            placeholders.push('?');
            values.push(passwordHash);
        }
        if (existingCols.includes('role_code')) {
            insertCols.push('role_code');
            placeholders.push('?');
            values.push(role_code || 'Sales Rep');
        }
        if (existingCols.includes('group_id')) {
            insertCols.push('group_id');
            placeholders.push('?');
            values.push(group_id || null);
        }
        if (existingCols.includes('phone')) {
            insertCols.push('phone');
            placeholders.push('?');
            values.push(phone || null);
        }
        if (existingCols.includes('status')) {
            insertCols.push('status');
            placeholders.push('?');
            values.push('active');
        }

        const sql = `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const [result] = await db.execute(sql, values);

        // Ghi vết audit log
        try {
            await db.execute(`
                INSERT INTO audit_logs (user_id, action_type, entity_name, description)
                VALUES (?, 'CREATE_USER', 'Quản trị người dùng', ?)
            `, [req.user?.id || 1, `Tạo thủ công người dùng: ${full_name} (${email}) - Vai trò: ${role_code}`]);
        } catch (_) {}

        return res.json({ message: 'Tạo tài khoản người dùng mới thành công!', id: result.insertId });
    } catch (error) {
        console.error('Lỗi tạo người dùng:', error);
        return res.status(500).json({ message: error.message || 'Lỗi server khi tạo người dùng' });
    }
});

// =========================================================================
// 4. API PHÂN QUYỀN VAI TRÒ & ĐIỀU CHUYỂN NHÓM
// =========================================================================
router.put('/:id/role', verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { role_code, group_id } = req.body;

        // 1. Lấy thông tin vai trò cũ trước khi cập nhật
        const [oldUsers] = await db.execute('SELECT full_name, email, role_code FROM users WHERE id = ?', [userId]);
        if (oldUsers.length === 0) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        const targetUser = oldUsers[0];

        // 2. Cập nhật vào MySQL
        await db.execute('UPDATE users SET role_code = ?, group_id = ? WHERE id = ?', [
            role_code, 
            group_id || null, 
            userId
        ]);

        // 3. TỰ ĐỘNG GHI NHẬT KÝ THAO TÁC NHẠY CẢM (AC S2-04)
        const executor = req.user?.full_name ? `${req.user.full_name} (${req.user.role_code || 'Admin'})` : 'Quản trị viên';
        await db.execute(`
            INSERT INTO audit_logs (user_name, action_type, entity_type, entity_id, before_value, after_value, description)
            VALUES (?, 'ROLE_CHANGE', 'Vai trò người dùng', ?, ?, ?, ?)
        `, [
            executor,
            `U-00${userId}`,
            targetUser.role_code || 'Chưa phân quyền',
            role_code,
            `${executor} đã điều chỉnh vai trò của [${targetUser.full_name} - ${targetUser.email}] từ [${targetUser.role_code}] thành [${role_code}]`
        ]);

        return res.json({ message: 'Cập nhật vai trò và đã lưu nhật ký thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật vai trò:', error);
        return res.status(500).json({ message: 'Lỗi cập nhật vai trò' });
    }
});

// =========================================================================
// 5. API KHÓA / MỞ KHÓA TÀI KHOẢN & BÀN GIAO (S1-10)
// =========================================================================
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { status, handover_user_id } = req.body;

        if (req.user?.role_code !== 'Admin') {
            return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền đổi trạng thái tài khoản!' });
        }

        await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

        let handoverMsg = '';
        if (status === 'inactive' && handover_user_id) {
            let custCount = 0;
            let dealCount = 0;
            try {
                const [cRes] = await db.execute('UPDATE customers SET created_by = ? WHERE created_by = ?', [handover_user_id, userId]);
                custCount = cRes.affectedRows || 0;
            } catch (_) {}
            try {
                const [dRes] = await db.execute('UPDATE deals SET owner_id = ? WHERE owner_id = ?', [handover_user_id, userId]);
                dealCount = dRes.affectedRows || 0;
            } catch (_) {}
            handoverMsg = `Đã bàn giao ${custCount} khách hàng và ${dealCount} cơ hội sang nhân sự mới.`;
        }

        try {
            await db.execute(`
                INSERT INTO audit_logs (user_id, action_type, entity_name, description)
                VALUES (?, ?, 'Tài khoản #${userId}', ?)
            `, [req.user.id, status === 'inactive' ? 'LOCK_ACCOUNT' : 'UNLOCK_ACCOUNT', status === 'inactive' ? `Khóa tài khoản. ${handoverMsg}` : 'Mở khóa tài khoản']);
        } catch (_) {}

        return res.json({ message: status === 'inactive' ? `Đã khóa tài khoản! ${handoverMsg}` : 'Đã mở khóa tài khoản!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái tài khoản' });
    }
});

// =========================================================================
// 6. API NHẬP HÀNG LOẠT (S2-01)
// =========================================================================
router.post('/import-batch', verifyToken, async (req, res) => {
    try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'Danh sách tải lên trống!' });
        }

        const [colRows] = await db.execute('SHOW COLUMNS FROM users');
        const existingCols = colRows.map(c => c.Field);
        const pwdCol = existingCols.includes('password_hash') ? 'password_hash' : (existingCols.includes('password') ? 'password' : null);

        const validRows = [];
        const errorRows = [];
        const defaultPasswordHash = await bcrypt.hash('123456@crm', 10);

        const [existingUsers] = await db.execute('SELECT email FROM users');
        const existingEmails = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));

        let groupMap = {};
        try {
            const [groups] = await db.execute('SELECT id, name FROM `groups`');
            groups.forEach(g => { groupMap[g.name.toLowerCase().trim()] = g.id; });
        } catch (_) {}

        users.forEach((u, index) => {
            const rowNum = u.row || (index + 1);
            const email = (u.email || '').trim().toLowerCase();
            const fullName = (u.full_name || '').trim();
            const role = (u.role_code || 'Sales Rep').trim();
            const group = (u.group_name || '').trim();

            if (!fullName) {
                errorRows.push({ row: rowNum, email, error: 'Thiếu họ và tên' });
            } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errorRows.push({ row: rowNum, email, error: 'Email không đúng định dạng chuẩn' });
            } else if (existingEmails.has(email)) {
                errorRows.push({ row: rowNum, email, error: 'Email đã tồn tại trên hệ thống' });
            } else {
                existingEmails.add(email);
                const groupId = groupMap[group.toLowerCase()] || null;
                validRows.push({ fullName, email, role, groupId, originalRow: rowNum });
            }
        });

        let insertedCount = 0;
        for (const item of validRows) {
            try {
                const insertCols = ['full_name', 'email'];
                const placeholders = ['?', '?'];
                const values = [item.fullName, item.email];

                if (pwdCol) {
                    insertCols.push(pwdCol);
                    placeholders.push('?');
                    values.push(defaultPasswordHash);
                }
                if (existingCols.includes('role_code')) {
                    insertCols.push('role_code');
                    placeholders.push('?');
                    values.push(item.role);
                }
                if (existingCols.includes('group_id')) {
                    insertCols.push('group_id');
                    placeholders.push('?');
                    values.push(item.groupId);
                }
                if (existingCols.includes('status')) {
                    insertCols.push('status');
                    placeholders.push('?');
                    values.push('active');
                }

                const sql = `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
                await db.execute(sql, values);
                insertedCount++;
            } catch (dbErr) {
                errorRows.push({ row: item.originalRow, email: item.email, error: 'Lỗi ghi DB: ' + dbErr.message });
            }
        }

        try {
            await db.execute(`
                INSERT INTO audit_logs (user_id, action_type, entity_name, description)
                VALUES (?, 'IMPORT_USERS', 'Quản trị người dùng', ?)
            `, [req.user?.id || 1, `Nhập hàng loạt: ${insertedCount} thành công, ${errorRows.length} lỗi bị bỏ qua.`]);
        } catch (_) {}

        return res.json({
            message: 'Hoàn tất tiến trình xử lý tệp!',
            summary: {
                total: users.length,
                success: insertedCount,
                failed: errorRows.length,
                errors: errorRows
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi nhập dữ liệu' });
    }
});

// =========================================================================
// 7. API PROFILE & DANH SÁCH NGƯỜI DÙNG
// =========================================================================
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user?.id || 1;
        const [users] = await db.execute(`
            SELECT u.id, u.full_name, u.email, u.phone, u.role_code, u.avatar, 
                   u.email_signature, g.name AS group_name
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE u.id = ?
        `, [userId]);
        return res.json({ user: users[0] || req.user });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi truy vấn hồ sơ' });
    }
});

router.put('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user?.id || 1;
        const { full_name, phone, email_signature, avatar } = req.body;
        if (phone && !/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(phone)) {
            return res.status(400).json({ message: 'Số điện thoại Việt Nam không hợp lệ!' });
        }
        await db.execute(`
            UPDATE users 
            SET full_name = ?, phone = ?, email_signature = ?, avatar = ?
            WHERE id = ?
        `, [full_name, phone || null, email_signature || null, avatar || null, userId]);
        const [users] = await db.execute('SELECT id, full_name, email, phone, role_code, avatar, email_signature FROM users WHERE id = ?', [userId]);
        return res.json({ message: 'Cập nhật thành công!', user: users[0] });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi cập nhật hồ sơ' });
    }
});

router.get('/', verifyToken, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT u.id, u.full_name, u.email, u.phone, u.role_code, u.status, u.group_id,
                   COALESCE(g.name, 'Chưa gán') AS group_name
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            ORDER BY u.id DESC
        `);
        return res.json({ data: users, total: users.length });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi nạp danh sách người dùng' });
    }
});

const updateUserRoleHandler = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role_code, role, group_id } = req.body;
        const targetRole = role_code || role;

        if (!targetRole) {
            return res.status(400).json({ message: 'Vui lòng chọn vai trò phân quyền!' });
        }

        // 1. Lấy thông tin vai trò cũ
        const [oldUsers] = await db.execute('SELECT full_name, email, role_code FROM users WHERE id = ?', [userId]);
        if (oldUsers.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        const currentUser = oldUsers[0];

        // 2. Cập nhật vào bảng users
        await db.execute('UPDATE users SET role_code = ?, group_id = ? WHERE id = ?', [
            targetRole,
            group_id || null,
            userId
        ]);

        // 3. Ghi log bất đồng bộ an toàn
        const executor = req.user?.full_name ? `${req.user.full_name} (${req.user.role_code || 'Admin'})` : 'Dũng Quang (Admin)';
        await logAudit({
            userName: executor,
            actionType: 'ROLE_CHANGE',
            entityType: 'Vai trò người dùng',
            entityId: `U-00${userId}`,
            beforeValue: currentUser.role_code || 'Chưa phân quyền',
            afterValue: targetRole,
            description: `${executor} đã thay đổi vai trò của [${currentUser.full_name} - ${currentUser.email}] từ [${currentUser.role_code || 'Chưa phân quyền'}] thành [${targetRole}]`
        });

        return res.json({ message: 'Cập nhật vai trò người dùng thành công!' });
    } catch (error) {
        console.error('Lỗi cập nhật vai trò:', error);
        return res.status(500).json({ message: error.message || 'Lỗi cập nhật vai trò' });
    }
};

// 1. API CẬP NHẬT TRẠNG THÁI (KHÓA / MỞ KHÓA)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active' hoặc 'locked'
    try {
        const db = require('../config/db');
        await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        return res.json({ 
            success: true, 
            message: status === 'locked' ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản!' 
        });
    } catch (err) {
        console.error('Lỗi cập nhật status:', err);
        return res.status(500).json({ message: 'Không thể cập nhật trạng thái người dùng.' });
    }
});

// 2. API XÓA HẲN NGƯỜI DÙNG KHỎI DATABASE
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = require('../config/db');
        
        // Tắt kiểm tra khóa ngoại tạm thời để xóa sạch không bị báo lỗi Foreign Key
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('DELETE FROM password_resets WHERE email IN (SELECT email FROM users WHERE id = ?)', [id]).catch(() => {});
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        return res.json({ success: true, message: 'Đã xóa vĩnh viễn người dùng khỏi cơ sở dữ liệu!' });
    } catch (err) {
        console.error('Lỗi xóa user:', err);
        return res.status(500).json({ message: 'Lỗi máy chủ khi xóa người dùng.' });
    }
});

router.put('/:id/role', verifyToken, updateUserRoleHandler);
router.put('/:id', verifyToken, updateUserRoleHandler);
// 1. API CẬP NHẬT TRẠNG THÁI (KHÓA / MỞ KHÓA)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const db = require('../config/db');
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        return res.json({ success: true, message: status === 'locked' ? 'Đã khóa tài khoản!' : 'Đã mở khóa tài khoản!' });
    } catch (err) {
        console.error('Lỗi cập nhật status:', err);
        return res.status(500).json({ message: 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái.' });
    }
});

module.exports = router;