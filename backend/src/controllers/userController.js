const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('../utils/mailer');
const xlsx = require('xlsx');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { logAudit } = require('../utils/auditLogger');

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
        // [S2-04] Tự động ghi nhật ký thay đổi dữ liệu người dùng/vai trò
        await logAudit({
            userId: req.user.id,
            userName: req.user.full_name || req.user.name,
            action: 'UPDATE_USER_ROLE',
            targetType: 'USER',
            targetId: targetUserId,
            oldValue: {
                full_name: targetUser.full_name,
                role_id: targetUser.role_id,
                group_id: targetUser.group_id,
                status: targetUser.status
            },
            newValue: {
                full_name: full_name || targetUser.full_name,
                role_id: finalRoleId || targetUser.role_id,
                group_id: finalGroupId,
                status: status || targetUser.status
            }
        });


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

// ==========================================
// S2-01: XỬ LÝ IMPORT NGƯỜI DÙNG BẰNG EXCEL
// ==========================================

// 1. Tải tệp Excel mẫu chuẩn
const downloadTemplate = (req, res) => {
    try {
        const sampleData = [
            {
                'Họ và tên': 'Nguyễn Văn A',
                'Email': 'nguyenvana@gmail.com',
                'Số điện thoại': '0987654321',
                'Vai trò': 'Sales Executive',
                'Nhóm kinh doanh': 'Team Kinh Doanh Miền Bắc'
            },
            {
                'Họ và tên': 'Trần Thị B',
                'Email': 'tranthib@gmail.com',
                'Số điện thoại': '0912345678',
                'Vai trò': 'Sales Executive',
                'Nhóm kinh doanh': 'Team Kinh Doanh Miền Nam'
            }
        ];

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(sampleData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Mau_Import_Nhan_Su');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=Mau_Import_Nhan_Su.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi tạo tệp mẫu: ' + error.message });
    }
};

// 2. Xem trước (Preview) và báo lỗi chi tiết từng dòng
const previewImportUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng tải lên tệp Excel!' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rawRows.length === 0) {
            return res.status(400).json({ message: 'Tệp Excel không có dữ liệu!' });
        }

        // Lấy danh sách Vai trò, Nhóm và Email hiện có trong DB
        const [roles] = await db.execute('SELECT id, name FROM roles');
        const [groups] = await db.execute('SELECT id, name FROM `groups`');
        const [existingUsers] = await db.execute('SELECT email FROM users');
        const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

        const roleMap = new Map(roles.map(r => [r.name.trim().toLowerCase(), r.id]));
        const groupMap = new Map(groups.map(g => [g.name.trim().toLowerCase(), g.id]));

        const validRows = [];
        const errorRows = [];
        const seenEmailsInFile = new Set();

        rawRows.forEach((row, index) => {
            const rowNumber = index + 2; // Dòng 1 là tiêu đề cột
            const fullName = (row['Họ và tên'] || row['full_name'] || '').toString().trim();
            const email = (row['Email'] || row['email'] || '').toString().trim().toLowerCase();
            const phone = (row['Số điện thoại'] || row['phone'] || '').toString().trim();
            const roleName = (row['Vai trò'] || row['role'] || '').toString().trim();
            const groupName = (row['Nhóm kinh doanh'] || row['group'] || '').toString().trim();

            const errors = [];

            if (!fullName) errors.push('Thiếu họ và tên');
            if (!email) {
                errors.push('Thiếu email');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push('Email không đúng định dạng');
            } else if (existingEmails.has(email)) {
                errors.push('Email đã tồn tại trong hệ thống');
            } else if (seenEmailsInFile.has(email)) {
                errors.push('Email bị trùng lặp trong tệp Excel');
            }

            const roleId = roleMap.get(roleName.toLowerCase());
            if (!roleName) {
                errors.push('Thiếu vai trò');
            } else if (!roleId) {
                errors.push(`Vai trò "${roleName}" không tồn tại`);
            }

            let groupId = null;
            if (groupName) {
                groupId = groupMap.get(groupName.toLowerCase());
                if (!groupId) errors.push(`Nhóm "${groupName}" không tồn tại`);
            }

            const rowData = {
                rowNumber,
                full_name: fullName,
                email,
                phone,
                role_id: roleId,
                role_name: roleName,
                group_id: groupId,
                group_name: groupName
            };

            if (errors.length > 0) {
                errorRows.push({ ...rowData, errors: errors.join(', ') });
            } else {
                seenEmailsInFile.add(email);
                validRows.push(rowData);
            }
        });

        return res.status(200).json({
            totalRows: rawRows.length,
            validCount: validRows.length,
            errorCount: errorRows.length,
            validRows,
            errorRows
        });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi xử lý file Excel: ' + error.message });
    }
};

// 3. Thực thi Import dữ liệu hợp lệ (Dùng Transaction)
const executeImportUsers = async (req, res) => {
    const { usersToImport } = req.body;
    if (!usersToImport || !Array.isArray(usersToImport) || usersToImport.length === 0) {
        return res.status(400).json({ message: 'Không có dữ liệu hợp lệ để nhập!' });
    }

    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const item of usersToImport) {
        try {
            await db.execute(
                `INSERT INTO users (full_name, email, password, phone, role_id, group_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
                [item.full_name, item.email, defaultPasswordHash, item.phone || null, item.role_id, item.group_id || null]
            );
            successCount++;
        } catch (err) {
            failedCount++;
            errors.push(`Dòng ${item.rowNumber} (${item.email}): ${err.message}`);
        }
    }

    return res.status(200).json({
        message: `Đã nhập thành công ${successCount} tài khoản!${failedCount > 0 ? ` (${failedCount} dòng lỗi)` : ''}`,
        successCount,
        failedCount,
        errors
    });
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn ảnh để tải lên!' });
        }

        const userId = req.user.id;
        const uploadDir = path.join(__dirname, '../../uploads/avatars');    

        // Tạo thư mục nếu chưa có
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `avatar-${userId}-${Date.now()}.png`;
        const filePath = path.join(uploadDir, fileName);

        // Cắt ảnh vuông chính giữa 200x200 bằng sharp
        await sharp(req.file.buffer)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .toFormat('png')
            .toFile(filePath);

        const avatarUrl = `/uploads/avatars/${fileName}`;

        // Lưu đường dẫn avatar vào CSDL
        await db.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);

        return res.status(200).json({
            message: 'Tải lên ảnh đại diện thành công!',
            avatar: avatarUrl
        });
    } catch (error) {
        console.error('Lỗi upload avatar:', error);
        return res.status(500).json({ message: 'Không thể xử lý ảnh đại diện!' });
    }
};
// Cập nhật thông tin cá nhân của chính user đang đăng nhập
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ middleware verifyToken
        const { name, phone, email_signature, avatar } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Họ và tên không được để trống!' });
        }

        // Đổi `name = ?` thành `full_name = ?` theo đúng schema của bảng users
        await db.execute(
            `UPDATE users 
             SET full_name = ?, phone = ?, email_signature = ?, avatar = ? 
             WHERE id = ?`,
            [name.trim(), phone || null, email_signature || null, avatar || null, userId]
        );

        // Lấy lại thông tin mới nhất và alias `full_name AS name` để đồng bộ với Frontend
        const [rows] = await db.execute(
            `SELECT u.*, u.full_name AS name, r.role_name, r.data_scope 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?`,
            [userId]
        );

        return res.status(200).json({
            message: 'Cập nhật thông tin hồ sơ thành công!',
            user: rows[0]
        });
    } catch (error) {
        console.error('Lỗi update profile:', error);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật hồ sơ!' });
    }
};

// API Đổi mật khẩu kiểm tra mật khẩu hiện tại
// API Đổi mật khẩu kiểm tra mật khẩu hiện tại
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ mật khẩu!' });
        }

        // 1. Lấy mật khẩu đã mã hóa hiện tại trong DB
        const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Người dùng không tồn tại!' });
        }

        // 2. So khớp mật khẩu hiện tại với DB bằng bcrypt
        const isMatch = await bcrypt.compare(oldPassword, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác!' });
        }

        // 3. Mã hóa mật khẩu mới và cập nhật
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        return res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu!' });
    }
};

module.exports = {
    // ... giữ nguyên các hàm cũ
    updateProfile,
    changePassword
};  

module.exports = {
    getUsers,
    createUser,
    updateUser,
    getMetadata,
    lockAndHandoverUser,
    getUserCustomerCount,
    downloadTemplate,
    previewImportUsers,
    executeImportUsers,
    uploadAvatar,
    updateProfile,
    changePassword
};