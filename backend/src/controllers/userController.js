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
// 3. CẬP NHẬT TÀI KHOẢN (Sửa thông tin, vai trò, nhóm, trạng thái)
// ==========================================
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role_id, group_id, status } = req.body;

        const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng yêu cầu!' });
        }

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
            group_id !== undefined ? (group_id || null) : null,
            status || null,
            id
        ]);

        return res.status(200).json({ message: 'Cập nhật thông tin tài khoản thành công!' });
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

module.exports = { getUsers, createUser, updateUser, getMetadata };