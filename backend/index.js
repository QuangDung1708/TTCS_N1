const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const { verifyToken, checkRole } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// API lấy danh sách user: yêu cầu đăng nhập và có quyền Admin
app.get('/api/users', verifyToken, checkRole(['Admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search ? req.query.search.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    const queryParams = [];

    if (search) {
      whereClause = 'WHERE u.email LIKE ? OR u.full_name LIKE ?';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const dataSql = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        r.name AS role_name, 
        g.name AS group_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN \`groups\` g ON u.group_id = g.id
      ${whereClause}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...queryParams, limit, offset];
    const [users] = await pool.query(dataSql, dataParams);

    return res.status(200).json({
      success: true,
      data: users,
      total_records: totalRecords,
      total_pages: totalPages,
      current_page: page
    });
  } catch (error) {
    console.error('Loi query MySQL:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server dang lang nghe tren port ${PORT}...`);
});

// Giu tien trinh luon chay
process.stdin.resume();