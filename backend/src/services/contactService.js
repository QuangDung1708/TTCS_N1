const db = require('../config/db'); // Đường dẫn file pool db của dự án

const transferCompany = async (contactId, { new_customer_id, note, userId }) => {
  // 1. Kiểm tra người liên hệ có tồn tại không
  const [contacts] = await db.query(
    'SELECT * FROM contacts WHERE id = ?',
    [contactId]
  );

  if (!contacts || contacts.length === 0) {
    const error = new Error(`Không tìm thấy người liên hệ với ID: ${contactId}`);
    error.statusCode = 404;
    throw error;
  }

  const currentContact = contacts[0];

  // 2. Không cho phép chuyển sang chính công ty hiện tại
  if (String(currentContact.customer_id) === String(new_customer_id)) {
    const error = new Error('Người liên hệ hiện đã thuộc công ty này');
    error.statusCode = 400;
    throw error;
  }

  // 3. Lấy connection để thực hiện Transaction
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lưu vết lịch sử công ty cũ
    await connection.query(
      `INSERT INTO contact_company_histories 
       (contact_id, from_customer_id, to_customer_id, note, changed_by, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [contactId, currentContact.customer_id, new_customer_id, note || null, userId || null]
    );

    // Cập nhật customer_id mới cho contact
    await connection.query(
      'UPDATE contacts SET customer_id = ?, updated_at = NOW() WHERE id = ?',
      [new_customer_id, contactId]
    );

    await connection.commit();

    return {
      contact_id: contactId,
      old_customer_id: currentContact.customer_id,
      new_customer_id,
      note,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  transferCompany,
};