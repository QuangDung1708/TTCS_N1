const db = require('../config/db');

// 1. Lấy danh sách người liên hệ của một khách hàng
const getContactsByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const [contacts] = await db.execute(
            `SELECT * FROM customer_contacts WHERE customer_id = ? ORDER BY is_primary DESC, id ASC`,
            [customerId]
        );
        return res.status(200).json(contacts);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi lấy danh sách người liên hệ: ' + error.message });
    }
};

// 2. Thêm mới người liên hệ (Đảm bảo chỉ có tối đa 1 đầu mối chính)
const createContact = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { name, title, email, phone, buying_role, is_primary } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Họ tên người liên hệ không được để trống!' });
        }

        const primaryValue = is_primary ? 1 : 0;
        // Kiểm tra định dạng Email
if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email người liên hệ không hợp lệ!' });
    }
}

// Kiểm tra định dạng Số điện thoại Việt Nam
if (phone) {
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Số điện thoại phải gồm 10 chữ số hợp lệ!' });
    }
}

        // Nếu đặt người này là đầu mối chính, reset các liên hệ khác của khách hàng về 0
        if (primaryValue === 1) {
            await db.execute(
                `UPDATE customer_contacts SET is_primary = 0 WHERE customer_id = ?`,
                [customerId]
            );
        }

        const [result] = await db.execute(
            `INSERT INTO customer_contacts (customer_id, name, title, email, phone, buying_role, is_primary)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                customerId,
                name.trim(),
                title ? title.trim() : null,
                email ? email.trim() : null,
                phone ? phone.trim() : null,
                buying_role || 'INFLUENCER',
                primaryValue
            ]
        );

        return res.status(201).json({
            message: 'Thêm người liên hệ thành công!',
            contactId: result.insertId
        });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi tạo người liên hệ: ' + error.message });
    }
};

// 3. Cập nhật thông tin người liên hệ
const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, title, email, phone, buying_role, is_primary } = req.body;

        const [existing] = await db.execute(`SELECT * FROM customer_contacts WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người liên hệ!' });
        }

        const currentContact = existing[0];
        const primaryValue = is_primary ? 1 : 0;

        // Nếu đặt làm đầu mối chính, hạ đầu mối chính của các liên hệ cùng khách hàng
        if (primaryValue === 1) {
            await db.execute(
                `UPDATE customer_contacts SET is_primary = 0 WHERE customer_id = ? AND id != ?`,
                [currentContact.customer_id, id]
            );
        }

        await db.execute(
            `UPDATE customer_contacts 
             SET name = ?, title = ?, email = ?, phone = ?, buying_role = ?, is_primary = ?
             WHERE id = ?`,
            [
                name ? name.trim() : currentContact.name,
                title !== undefined ? title : currentContact.title,
                email !== undefined ? email : currentContact.email,
                phone !== undefined ? phone : currentContact.phone,
                buying_role || currentContact.buying_role,
                primaryValue,
                id
            ]
        );

        return res.status(200).json({ message: 'Cập nhật thông tin người liên hệ thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật người liên hệ: ' + error.message });
    }
};

// 4. Chuyển người liên hệ sang khách hàng mới (Ghi nhận lịch sử chuyển đổi)
const transferContactCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetCustomerId, transferReason } = req.body;

        if (!targetCustomerId) {
            return res.status(400).json({ message: 'Vui lòng chọn khách hàng/công ty đích cần chuyển đến!' });
        }

        // Lấy thông tin liên hệ và khách hàng cũ
        const [contactRows] = await db.execute(
    `SELECT c.*, cust.name AS old_company_name 
     FROM customer_contacts c
     JOIN customers cust ON c.customer_id = cust.id
     WHERE c.id = ?`,
    [id]
);

        if (contactRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người liên hệ!' });
        }

        const contact = contactRows[0];

        // Lấy thông tin khách hàng mới
// Đảm bảo SELECT lấy cả name và company
const [targetRows] = await db.execute(
    'SELECT id, name, company FROM customers WHERE id = ?', 
    [targetCustomerId]
);        if (targetRows.length === 0) {
            return res.status(404).json({ message: 'Khách hàng/công ty mới không tồn tại!' });
        }
        const targetCustomer = targetRows[0];

        // Ghi log chuyển giao
    const targetName = targetCustomer.company || targetCustomer.name;

    // Ghi log chuyển giao
    const dateStr = new Date().toLocaleString('vi-VN');
    const logEntry = `[${dateStr}] Chuyển từ "${contact.old_company_name}" sang "${targetName}". Lý do: ${transferReason || 'Không có'}`;
    const newHistoryLog = contact.history_log
        ? `${contact.history_log}\n${logEntry}`
        : logEntry;

    // Cập nhật customer_id mới, hủy cờ đầu mối chính
    await db.execute(
        `UPDATE customer_contacts
        SET customer_id = ?, is_primary = 0, history_log = ?
        WHERE id = ?`,
        [targetCustomerId, newHistoryLog, id]
    );

    return res.status(200).json({
        message: `Đã chuyển người liên hệ sang công ty "${targetName}" thành công!`
    });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi chuyển giao người liên hệ: ' + error.message });
    }
};

// 5. Xóa người liên hệ
const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute(`DELETE FROM customer_contacts WHERE id = ?`, [id]);
        return res.status(200).json({ message: 'Đã xóa người liên hệ thành công!' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi xóa người liên hệ: ' + error.message });
    }
};

module.exports = {
    getContactsByCustomer,
    createContact,
    updateContact,
    transferContactCustomer,
    deleteContact
};