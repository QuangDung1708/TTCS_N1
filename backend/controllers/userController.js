const bcrypt = require("bcrypt");
const db = require("../db");

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search ? req.query.search.trim() : "";
    const offset = (page - 1) * limit;

    let whereClause = "";
    const queryParams = [];

    if (search) {
      whereClause = "WHERE email LIKE ? OR full_name LIKE ?";
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const [countResult] = await db.query(countSql, queryParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const dataSql = `
      SELECT id, email, full_name, role_id
      FROM users
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [users] = await db.query(dataSql, [...queryParams, limit, offset]);

    return res.status(200).json({
      success: true,
      message: "Lay danh sach thanh cong",
      data: users,
      meta: {
        total_records: totalRecords,
        total_pages: totalPages,
        current_page: page
      }
    });
  } catch (error) {
    console.error("Loi khi lay danh sach user:", error);
    return res.status(500).json({ success: false, message: "Loi may chu noi bo: " + error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, full_name, password, phone, role_id, group_id } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ success: false, message: "Vui long cung cap day du email va ho ten" });
    }

    const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "Email nay da duoc su dung" });
    }

    const rawPassword = password || "123456aA@";
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

    const insertSql = `
      INSERT INTO users (email, full_name, password, phone, role_id, group_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSql, [
      email,
      full_name,
      hashedPassword,
      phone || null,
      role_id || null,
      group_id || null
    ]);

    console.log(`Da tao tai khoan cho ${email} voi mat khau: ${rawPassword}`);

    return res.status(201).json({
      success: true,
      message: "Tao tai khoan nguoi dung moi thanh cong",
      data: {
        userId: result.insertId,
        email,
        full_name,
        role_id: role_id || null,
        group_id: group_id || null
      }
    });
  } catch (error) {
    console.error("Loi khi tao user:", error);
    return res.status(500).json({ success: false, message: "Loi may chu noi bo: " + error.message });
  }
};

const lockUserAndTransfer = async (req, res) => {
  const id_bi_khoa = req.params.id;
  const { transfer_to_user_id } = req.body;

  if (!transfer_to_user_id) {
    return res.status(400).json({ success: false, message: "Thieu tham so transfer_to_user_id (nguoi tiep nhan)" });
  }
  if (String(transfer_to_user_id) === String(id_bi_khoa)) {
    return res.status(400).json({ success: false, message: "Khong the chuyen du lieu cho chinh tai khoan bi khoa" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [receiverRows] = await conn.query("SELECT id, status FROM users WHERE id = ? FOR UPDATE", [transfer_to_user_id]);
    if (receiverRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: "Nguoi tiep nhan khong ton tai" });
    }
    if (receiverRows[0].status === "LOCKED") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "Nguoi tiep nhan dang bi khoa, khong the chuyen giao" });
    }

    const [targetRows] = await conn.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [id_bi_khoa]);
    if (targetRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: "Tai khoan can khoa khong ton tai" });
    }

    const [customerResult] = await conn.query("UPDATE customers SET owner_id = ? WHERE owner_id = ?", [transfer_to_user_id, id_bi_khoa]);

    await conn.query("UPDATE users SET status = \"LOCKED\", token_version = token_version + 1 WHERE id = ?", [id_bi_khoa]);

    await conn.query(
      "INSERT INTO audit_logs (actor_id, action, target_id, detail) VALUES (?, \"LOCK_USER_AND_TRANSFER\", ?, ?)",
      [req.user.id, id_bi_khoa, JSON.stringify({ transfer_to_user_id, customers_transferred: customerResult.affectedRows })]
    );

    await conn.commit();
    conn.release();

    return res.status(200).json({
      success: true,
      message: "Da khoa tai khoan va chuyen giao du lieu thanh cong",
      data: {
        locked_user_id: id_bi_khoa,
        transferred_to: transfer_to_user_id,
        customers_transferred: customerResult.affectedRows
      }
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error("Loi lockUserAndTransfer:", error);
    return res.status(500).json({ success: false, message: "Loi server: " + error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  lockUserAndTransfer
};
