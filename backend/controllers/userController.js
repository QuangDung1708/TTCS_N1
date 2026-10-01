const pool = require('../db');
const { logAudit } = require('../auditLogger');

// 1. Lấy danh sách users
const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, role FROM users');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Tạo user mới và tự động ghi Audit Log
const createUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và password'
      });
    }

    // Chèn user vào bảng users
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, password, role || 'user']
    );

    const newUserId = result.insertId;

    // TỰ ĐỘNG GHI AUDIT LOG VÀO DATABASE
    await logAudit({
      user_id: newUserId,
      action: 'CREATE_USER',
      target_entity: 'users',
      target_id: newUserId,
      old_value: null,
      new_value: JSON.stringify({ id: newUserId, email, role: role || 'user' }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.status(201).json({
      success: true,
      message: 'Tạo user thành công!',
      data: { id: newUserId, email, role: role || 'user' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Cập nhật thông tin user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    const [oldRows] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    await pool.query(
      'UPDATE users SET email = ?, role = ? WHERE id = ?',
      [email || oldRows[0].email, role || oldRows[0].role, id]
    );

    // Ghi Audit Log cập nhật
    await logAudit({
      user_id: parseInt(id),
      action: 'UPDATE_USER',
      target_entity: 'users',
      target_id: parseInt(id),
      old_value: JSON.stringify(oldRows[0]),
      new_value: JSON.stringify({ id: parseInt(id), email: email || oldRows[0].email, role: role || oldRows[0].role }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'Cập nhật user thành công!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Xóa user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    // Ghi Audit Log xóa
    await logAudit({
      user_id: parseInt(id),
      action: 'DELETE_USER',
      target_entity: 'users',
      target_id: parseInt(id),
      old_value: JSON.stringify(oldRows[0]),
      new_value: null,
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'Xóa user thành công!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};