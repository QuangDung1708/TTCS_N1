const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../index');
const db = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure';
process.env.JWT_SECRET = JWT_SECRET;

describe('KIỂM THỬ PHÂN QUYỀN PHẠM VI DỮ LIỆU (RBAC & DATA SCOPING - S1-05)', () => {
    let directorToken = '';
    let leaderAToken = '';
    let salesA1Token = '';
    let salesB1Token = '';

    beforeAll(async () => {
        // 1. Tự sinh Token chuẩn xác cho 4 vị trí kiểm thử (không phụ thuộc vào mật khẩu đăng nhập)
        // Giám đốc: Toàn quyền (ALL)
        directorToken = jwt.sign(
            { id: 1, email: 'admin@gmail.com', role_id: 1, group_id: null, data_scope: 'ALL' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Trưởng nhóm A: Quản lý nhóm 1 (GROUP)
        leaderAToken = jwt.sign(
            { id: 2, email: 'leader_a@gmail.com', role_id: 2, group_id: 1, data_scope: 'GROUP' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Nhân viên Sales A1: Thuộc nhóm 1 (OWN)
        salesA1Token = jwt.sign(
            { id: 3, email: 'sales_a1@gmail.com', role_id: 3, group_id: 1, data_scope: 'OWN' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Nhân viên Sales B1: Thuộc nhóm 2 (OWN)
        salesB1Token = jwt.sign(
            { id: 4, email: 'sales_b1@gmail.com', role_id: 3, group_id: 2, data_scope: 'OWN' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 2. Đảm bảo dữ liệu khách hàng mẫu luôn tồn tại trong CSDL
        const conn = await db.getConnection();
        try {
            await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
            await conn.execute(`
                INSERT INTO customers (id, name, phone, email, company, created_by, group_id) VALUES
                (1, 'Khách hàng VIP của Sales A1', '0912345678', 'vip_a1@gmail.com', 'Tập đoàn Alpha', 3, 1),
                (2, 'Khách hàng VIP của Sales B1', '0987654321', 'vip_b1@gmail.com', 'Công ty Beta', 4, 2)
                ON DUPLICATE KEY UPDATE created_by = VALUES(created_by), group_id = VALUES(group_id)
            `);
            await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
        } finally {
            conn.release();
        }
    });

    afterAll(async () => {
        if (db && db.end) {
            await db.end();
        }
    });

    // ==============================================================
    // TIÊU CHÍ CHẤP NHẬN AC: CHẶN NHÂN VIÊN A ĐỌC DỮ LIỆU NHÂN VIÊN B
    // ==============================================================
    test('1. Nhân viên Sales A1 không được phép truy cập chi tiết khách hàng của Sales B1 (Trả về 403 Forbidden)', async () => {
        const response = await request(app)
            .get('/api/customers/2')
            .set('Authorization', `Bearer ${salesA1Token}`);

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toContain('Từ chối truy cập: Đây là dữ liệu riêng của nhân viên khác, bạn không có quyền xem!');
    });

    test('2. Nhân viên Sales A1 truy cập thành công khách hàng do chính mình tạo (Trả về 200 OK)', async () => {
        const response = await request(app)
            .get('/api/customers/1')
            .set('Authorization', `Bearer ${salesA1Token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.id).toBe(1);
        expect(response.body.data.created_by).toBe(3);
    });

    // ==============================================================
    // KIỂM TRA PHẠM VI DANH SÁCH (OWN - GROUP - ALL)
    // ==============================================================
    test('3. Nhân viên Sales A1 chỉ nhìn thấy danh sách khách hàng của chính mình (phạm vi OWN)', async () => {
        const response = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${salesA1Token}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.scope).toBe('OWN');
        expect(response.body.total).toBe(1);
        expect(response.body.data[0].created_by).toBe(3);
    });

    test('4. Trưởng nhóm A nhìn thấy toàn bộ khách hàng trong Nhóm của mình (phạm vi GROUP)', async () => {
        const response = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${leaderAToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.scope).toBe('GROUP');
        const hasGroup2 = response.body.data.some(c => c.group_id === 2);
        expect(hasGroup2).toBe(false);
    });

    test('5. Giám đốc nhìn thấy toàn bộ dữ liệu khách hàng của tất cả các nhóm (phạm vi ALL)', async () => {
        const response = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${directorToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.scope).toBe('ALL');
        expect(response.body.total).toBeGreaterThanOrEqual(2);
    });
});