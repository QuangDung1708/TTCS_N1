const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('../utils/mailer');

// ==========================================
// 1. LẤY DANH SÁCH NGƯỜI DÙNG (Phân trang mặc định 20, Tìm kiếm, Lọc)
// ==========================================
const getUsers = async (req, res) => {
    try {
        let { page = 1, limit = 20, search = '', role_id = '', status = '' } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 20;
        const offset = (page - 1) * limit;

        let whereClauses = ['1=1'];
        let queryParams = [];

        // Tiêu chí AC: Tìm theo tên, email, nhóm kinh doanh
        if (search.trim()) {
            whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ? OR g.name LIKE ?)');
            const keyword = `%${search.trim()}%`;
            queryParams.push(keyword, keyword, keyword);
        }

        // Tiêu chí AC: Lọc theo vai trò (Role)
        if (role_id) {
            whereClauses.push('u.role_id = ?');
            queryParams.push(role_id);
        }

        // Tiêu chí AC: Lọc theo trạng thái (status)
        if (status) {
            whereClauses.push('u.status = ?');
            queryParams.push(status);
        }

        const whereSql = whereClauses.join(' AND ');

        // 1. Đếm tổng số lượng bản ghi thỏa mãn điều kiện
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE ${whereSql}
        `;
        const [countResult] = await db.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // 2. Lấy dữ liệu người dùng có phân trang (mặc định 20 dòng)
        const dataQuery = `
            SELECT 
                u.id, u.email, u.full_name, u.role_id, u.group_id, u.status, u.created_at,
                r.role_name, r.data_scope,
                g.name AS group_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            WHERE ${whereSql}
            ORDER BY u.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [users] = await db.execute(dataQuery, queryParams);

        return res.status(200).json({
            data: users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng!' });
    }
};

// ==========================================
// 2. TẠO TÀI KHOẢN MỚI (AC: Check trùng mail, tạo pass tạm, gửi mail)
// ==========================================
const createUser = async (req, res) => {
    try {
        const { email, full_name, role_id, group_id } = req.body;

        if (!email || !full_name || !role_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ: Email, Họ và tên, và Vai trò!' });
        }

        // Tiêu chí AC: Email trùng bị từ chối kèm thông báo cụ thể
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                message: 'Email này đã tồn tại trong hệ thống! Vui lòng chọn một email khác.' 
            });
        }

        // Tiêu chí AC: Sinh mật khẩu tạm thời tự động (đảm bảo chữ + số, tối thiểu 8 ký tự)
        const randomHex = crypto.randomBytes(3).toString('hex'); // 6 ký tự hex
        const tempPassword = `Crm@${randomHex}`; // ví dụ: Crm@a1b2c3

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Chèn vào CSDL với trạng thái mặc định ACTIVE
        const insertQuery = `
            INSERT INTO users (email, password, full_name, role_id, group_id, status)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        `;
        const [result] = await db.execute(insertQuery, [
            email,
            hashedPassword,
            full_name,
            role_id,
            group_id || null
        ]);

        // Tiêu chí AC: Gửi email kích hoạt kèm mật khẩu tạm
        await sendWelcomeEmail(email, full_name, tempPassword);

        return res.status(201).json({
            message: 'Tạo tài khoản người dùng thành công! Mật khẩu tạm đã được gửi tới email nhân sự.',
            userId: result.insertId,
            tempPassword // Trả về để tiện test hoặc hiển thị nhanh cho Admin
        });
    } catch (error) {
        console.error('Lỗi khi tạo người dùng:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo người dùng mới!' });
    }
};

// ==========================================
// 3. CẬP NHẬT TÀI KHOẢN & VAI TRÒ (Subtask N1-109)
// ==========================================
const updateUser = async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const currentAdminId = req.user.id;
        const { full_name, role_id, group_id, status } = req.body;

        // 1. Kiểm tra tài khoản tồn tại
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [targetUserId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng yêu cầu!' });
        }
        const targetUser = users[0];

        // 2. RÀNG BUỘC N1-109: Không cho phép Admin tự thu hồi quyền Admin của chính mình
        if (currentAdminId === targetUserId) {
            if (role_id && parseInt(role_id) !== targetUser.role_id) {
                return res.status(400).json({
                    message: 'Bảo mật: Bạn không thể tự thay đổi hoặc thu hồi quyền Quản trị viên của chính mình!'
                });
            }
            if (status && status !== 'ACTIVE') {
                return res.status(400).json({
                    message: 'Bảo mật: Bạn không thể tự khóa tài khoản của chính mình!'
                });
            }
        }

        // 3. RÀNG BUỘC N1-109: Trưởng nhóm (role_id = 2) bắt buộc phải có Group ID
        const finalRoleId = role_id !== undefined ? parseInt(role_id) : targetUser.role_id;
        const finalGroupId = group_id !== undefined ? (group_id ? parseInt(group_id) : null) : targetUser.group_id;

        if (finalRoleId === 2 && !finalGroupId) {
            return res.status(400).json({
                message: 'Ràng buộc nghiệp vụ: Tài khoản Trưởng nhóm bắt buộc phải thuộc về một nhóm kinh doanh cụ thể!'
            });
        }

        // 4. Thực thi cập nhật
        const updateQuery = `
            UPDATE users 
            SET full_name = COALESCE(?, full_name),
                role_id = COALESCE(?, role_id),
                group_id = ?,
                status = COALESCE(?, status)
            WHERE id = ?
        `;
        await db.execute(updateQuery, [
            full_name || null,
            role_id || null,
            finalGroupId,
            status || null,
            targetUserId
        ]);

        return res.status(200).json({ message: 'Cập nhật thông tin và vai trò người dùng thành công!' });
    } catch (error) {
        console.error('Lỗi khi cập nhật người dùng:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật tài khoản!' });
    }
};

// ==========================================
// 4. LẤY DANH MỤC ROLES VÀ GROUPS (Để Frontend đổ vào Select box)
// ==========================================
const getMetadata = async (req, res) => {
    try {
        const [roles] = await db.execute('SELECT id, role_name, data_scope, description FROM roles');
        const [groups] = await db.execute('SELECT id, name, description FROM `groups`');
        return res.status(200).json({ roles, groups });
    } catch (error) {
        console.error('Lỗi lấy metadata:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh mục vai trò và nhóm!' });
    }
};
// ==========================================
// 5. KHÓA TÀI KHOẢN & BÀN GIAO DỮ LIỆU (S1-10 & N1-111)
// ==========================================
const lockAndHandoverUser = async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        const adminId = req.user.id;
        const { receiver_id, reason = 'Nhân sự nghỉ việc - Bàn giao khách hàng' } = req.body;

        // 1. Không cho phép tự khóa chính mình
        if (targetUserId === adminId) {
            return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
        }

        // 2. Kiểm tra người nhận
        if (!receiver_id) {
            return res.status(400).json({ message: 'Bắt buộc phải chọn nhân viên tiếp nhận bàn giao!' });
        }

        const receiverId = parseInt(receiver_id);
        if (targetUserId === receiverId) {
            return res.status(400).json({ message: 'Người tiếp nhận không thể trùng với người bị khóa!' });
        }

        // 3. Kiểm tra người nhận có đang ACTIVE không
        const [receiverRows] = await db.execute('SELECT id, full_name, group_id, status FROM users WHERE id = ?', [receiverId]);
        if (receiverRows.length === 0 || receiverRows[0].status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Nhân viên tiếp nhận không hợp lệ hoặc đang bị khóa!' });
        }
        const receiver = receiverRows[0];

        // 4. Kiểm tra số lượng khách hàng (nếu bảng customers tồn tại)
        let customerCount = 0;
        try {
            const [custResult] = await db.execute('SELECT COUNT(*) as total FROM customers WHERE assigned_to = ?', [targetUserId]);
            customerCount = custResult[0].total;

            if (customerCount > 0) {
                await db.execute(
                    'UPDATE customers SET assigned_to = ?, group_id = COALESCE(?, group_id) WHERE assigned_to = ?',
                    [receiverId, receiver.group_id, targetUserId]
                );
            }
        } catch (tableErr) {
            // Nếu bảng customers chưa có cột assigned_to thì bỏ qua chuyển khách hàng
            console.log('Bỏ qua chuyển khách hàng vì cấu trúc bảng:', tableErr.message);
        }

        // 5. Cập nhật trạng thái người dùng thành LOCKED
        await db.execute('UPDATE users SET status = "LOCKED" WHERE id = ?', [targetUserId]);

        // 6. Ghi nhật ký bàn giao (handover_logs)
        try {
            await db.execute(
                'INSERT INTO handover_logs (from_user_id, to_user_id, admin_id, customers_transferred, reason) VALUES (?, ?, ?, ?, ?)',
                [targetUserId, receiverId, adminId, customerCount, reason]
            );
        } catch (logErr) {
            console.log('Chưa tạo bảng handover_logs hoặc lỗi ghi log:', logErr.message);
        }

        return res.status(200).json({
            message: `Khóa tài khoản thành công! Đã bàn giao dữ liệu sang cho ${receiver.full_name}.`,
            transferredCustomers: customerCount
        });

    } catch (error) {
        console.error('Chi tiết lỗi khóa tài khoản tại Terminal:', error);
        return res.status(500).json({ message: 'Lỗi server trong quá trình bàn giao và khóa tài khoản!' });
    }
};

// Đếm nhanh số khách hàng của 1 user để hiển thị trước lên Modal cảnh báo
const getUserCustomerCount = async (req, res) => {
    try {
        const userId = req.params.id;
        const [result] = await db.execute('SELECT COUNT(*) as total FROM customers WHERE assigned_to = ?', [userId]);
        return res.status(200).json({ total: result[0].total });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi lấy thông tin khách hàng!' });
    }
};

module.exports = { getUsers, createUser, updateUser, getMetadata, lockAndHandoverUser, getUserCustomerCount };