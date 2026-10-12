const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendWelcomeEmail } = require('../utils/mailer');
const xlsx = require('xlsx');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { logAudit } = require('../utils/auditLogger');
const nodemailer = require('nodemailer');

// ==========================================
// 1. LẤY DANH SÁCH NGƯỜI DÙNG (Phân trang mặc định 20, Tìm kiếm, Lọc)
// ==========================================
const getUsers = async (req, res) => {
    try {
        const db = require('../config/db');
        const [users] = await db.execute(`
            SELECT u.id, u.full_name, u.email, u.role_code, u.status, u.group_id,
                   g.name AS group_name
            FROM users u
            LEFT JOIN \`groups\` g ON u.group_id = g.id
            ORDER BY u.id ASC
        `);
        return res.json({ data: users, total: users.length });
    } catch (error) {
        console.error('Lỗi getUsers:', error);
        // Fallback nếu database chưa có bảng groups
        try {
            const db = require('../config/db');
            const [users] = await db.execute('SELECT id, full_name, email, role_code, status, group_id FROM users');
            return res.json({ data: users, total: users.length });
        } catch (err) {
            return res.status(500).json({ message: 'Lỗi truy vấn danh sách người dùng.' });
        }
    }
};

// ==========================================
// 2. TẠO TÀI KHOẢN MỚI (AC: Check trùng mail, tạo pass tạm, gửi mail)
// ==========================================
// Hàm thêm người dùng mới
const createUser = async (req, res) => {    
  const { full_name, email, phone, password, role_id, role, department_id, group_id } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ họ tên và email!' });
  }

  const cleanEmail = email.trim().toLowerCase();
  // Mật khẩu khởi tạo: lấy mật khẩu quản trị viên nhập hoặc mặc định 123456@crm nếu để trống
  const rawPassword = (password && password.trim() !== '') ? password.trim() : '123456@crm';

  // Chuẩn hóa role_id: mặc định là 3 (Nhân viên kinh doanh)
  const finalRoleId = role_id || (role === 'Nhân viên kinh doanh' ? 3 : (Number(role) || 3));

  try {
    // 1. Kiểm tra email đã tồn tại trong hệ thống chưa
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống!' });
    }

    // 2. Hash mật khẩu
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 3. Thêm vào bảng users (dùng role_id chuẩn)
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, password, role_id, status) 
       VALUES (?, ?, ?, ?, ?, 'Hoạt động')`,
      [full_name.trim(), cleanEmail, phone || null, hashedPassword, finalRoleId]
    );

    console.log(`[USER CREATED] Đã tạo thành công user ID: ${result.insertId} (${cleanEmail})`);

    // 4. Gửi email kích hoạt chứa tài khoản và mật khẩu khởi tạo
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: (process.env.SMTP_USER || '').trim(),
          pass: (process.env.SMTP_PASS || '').trim()
        }
      });

      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

      await transporter.sendMail({
        from: `"Enterprise CRM" <${process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: '[Enterprise CRM] Thông tin tài khoản và mật khẩu khởi tạo',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e8e8e8; border-radius: 8px; max-width: 520px; color: #333;">
            <h2 style="color: #1677ff; margin-top: 0;">Chào mừng bạn đến với Enterprise CRM</h2>
            <p>Xin chào <b>${full_name.trim()}</b>,</p>
            <p>Tài khoản nhân viên của bạn đã được quản trị viên khởi tạo thành công trên hệ thống. Dưới đây là thông tin đăng nhập:</p>
            
            <div style="background-color: #f6f8fa; padding: 16px; border-radius: 6px; margin: 18px 0; border-left: 4px solid #1677ff;">
              <p style="margin: 6px 0;">• <b>Họ và tên:</b> ${full_name.trim()}</p>
              <p style="margin: 6px 0;">• <b>Email đăng nhập:</b> <code>${cleanEmail}</code></p>
              <p style="margin: 6px 0;">• <b>Mật khẩu khởi tạo:</b> <span style="background: #e6f4ff; color: #1677ff; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 15px;">${rawPassword}</span></p>
            </div>

            <p>Vui lòng nhấp vào liên kết bên dưới để đăng nhập và thay đổi mật khẩu trong lần đầu sử dụng:</p>
            <div style="text-align: center; margin: 26px 0;">
              <a href="${loginUrl}" style="background-color: #1677ff; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Đăng Nhập Ngay
              </a>
            </div>
            <p style="color: #888; font-size: 12px; margin-bottom: 0;">Email này được gửi tự động từ hệ thống quản trị Enterprise CRM.</p>
          </div>
        `
      });

      console.log(`✅ [MAIL SUCCESS] Đã gửi thông tin tài khoản tới: ${cleanEmail}`);
    } catch (mailErr) {
      console.error('⚠️ [MAIL ERROR] Không thể gửi email:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng mới thành công! Thông tin đăng nhập đã được gửi về email.',
      id: result.insertId
    });

  } catch (err) {
    console.error('Lỗi khi tạo người dùng:', err);
    return res.status(500).json({ message: 'Lỗi khi tạo người dùng: ' + err.message });
  }
};
const updateUserRole = async (req, res) => {
    try {
        const db = require('../config/db');
        const targetId = parseInt(req.params.id);
        const { role_code, group_id } = req.body;

        // Chặn an toàn: Không cho Admin tự hạ quyền của chính mình
        if (req.user.id === targetId && role_code !== 'Admin') {
            return res.status(403).json({ message: 'Không thể tự tước quyền Quản trị (Admin) của chính mình!' });
        }

        // Ràng buộc: Trưởng nhóm (Team Lead) bắt buộc phải có nhóm kinh doanh
        if (role_code === 'Team Lead' && !group_id) {
            return res.status(400).json({ message: 'Trưởng nhóm bắt buộc phải phân công một nhóm cụ thể!' });
        }

        // Director và Admin có phạm vi toàn công ty, group_id tự về null
        const finalGroupId = (role_code === 'Admin' || role_code === 'Director') ? null : (group_id || null);

        await db.execute(
            'UPDATE users SET role_code = ?, group_id = ? WHERE id = ?',
            [role_code, finalGroupId, targetId]
        );

        return res.json({ message: 'Cập nhật phân quyền thành công!' });
    } catch (error) {
        console.error('Lỗi updateUserRole:', error);
        return res.status(500).json({ message: 'Lỗi server khi phân quyền.' });
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

// --- HÀM CẬP NHẬT TRẠNG THÁI & BÀN GIAO DỮ LIỆU (S1-10) ---
const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status, handover_user_id } = req.body;
  const adminId = req.user?.id || 1;

  // Chuẩn hóa trạng thái lưu DB
  const isLocking = (status === 'inactive' || status === 'Đã khóa');
  const targetStatus = isLocking ? 'Đã khóa' : 'Hoạt động';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Kiểm tra tài khoản cần cập nhật
    const [targets] = await connection.query('SELECT full_name, email FROM users WHERE id = ?', [id]);
    if (!targets.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }
    const targetUser = targets[0];

    let handoverCount = 0;
    let newOwnerInfo = null;

    // 2. NẾU LÀ KHÓA TÀI KHOẢN (AC 2: BẮT BUỘC BÀN GIAO)
    if (isLocking) {
      if (!handover_user_id) {
        return res.status(400).json({ message: 'Bắt buộc chọn người tiếp nhận bàn giao trước khi khóa tài khoản!' });
      }

      if (Number(id) === Number(handover_user_id)) {
        return res.status(400).json({ message: 'Người tiếp nhận bàn giao không thể trùng với người bị khóa!' });
      }

      const [newOwners] = await connection.query(
        'SELECT full_name, email FROM users WHERE id = ? AND status = "Hoạt động"', 
        [handover_user_id]
      );
      if (!newOwners.length) {
        return res.status(400).json({ message: 'Người nhận bàn giao không hợp lệ hoặc đang bị khóa!' });
      }
      newOwnerInfo = newOwners[0];

      // Chuyển toàn bộ khách hàng sang cho người tiếp nhận (cột created_by)
      const [updateCust] = await connection.query(
        'UPDATE customers SET created_by = ? WHERE created_by = ?',
        [handover_user_id, id]
      );
      handoverCount = updateCust.affectedRows || 0;

      // Chuyển cơ hội (deals) nếu có
      try {
        await connection.query('UPDATE deals SET created_by = ? WHERE created_by = ?', [handover_user_id, id]);
      } catch (dealErr) {
        // Bỏ qua nếu bảng deals chưa có created_by
      }
    }

    // 3. Cập nhật trạng thái người dùng trong DB
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [targetStatus, id]);

    // 4. GHI NHẬT KÝ HỆ THỐNG (AC 3: AUDIT LOG)
    try {
      const actionName = isLocking ? 'LOCK_AND_HANDOVER_USER' : 'UNLOCK_USER';
      const logDetail = isLocking
        ? `Khóa tài khoản ${targetUser.full_name} (${targetUser.email}) và bàn giao ${handoverCount} khách hàng sang ${newOwnerInfo.full_name} (${newOwnerInfo.email})`
        : `Mở khóa tài khoản cho ${targetUser.full_name} (${targetUser.email})`;

      await connection.query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
        [adminId, actionName, logDetail, req.ip || '127.0.0.1']
      );
    } catch (logErr) {
      console.warn('⚠️ Ghi audit log bỏ qua nếu bảng audit_logs khác schema:', logErr.message);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: isLocking
        ? `Đã khóa tài khoản và bàn giao thành công ${handoverCount} khách hàng sang ${newOwnerInfo.full_name}!`
        : `Đã mở khóa tài khoản cho ${targetUser.full_name}!`
    });

  } catch (err) {
    await connection.rollback();
    console.error('Lỗi cập nhật trạng thái:', err);
    return res.status(500).json({ message: 'Lỗi server: ' + err.message });
  } finally {
    connection.release();
  }
};

module.exports = {
    getUsers,
    createUser,
    updateUserRole,
    updateUser: updateUserRole,
    getMetadata,
    lockAndHandoverUser,
    getUserCustomerCount,
    downloadTemplate,
    previewImportUsers,
    executeImportUsers,
    uploadAvatar,
    updateProfile,
    changePassword,
    updateUserStatus
};