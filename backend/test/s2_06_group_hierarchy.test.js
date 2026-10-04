const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../index');
const db = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure';
process.env.JWT_SECRET = JWT_SECRET;

describe('KIỂM THỬ TÍNH NĂNG [S2-06]: CƠ CẤU TỔ CHỨC & RBAC TREE BRANCH DATA SCOPING', () => {
    let adminToken = '';
    let leaderParentToken = '';
    let leaderChildToken = '';
    let leaderUnrelatedToken = '';

    beforeAll(async () => {
        // Generates tokens for tests
        adminToken = jwt.sign(
            { id: 1, email: 'admin@gmail.com', role_id: 1, group_id: null, data_scope: 'ALL' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        leaderParentToken = jwt.sign(
            { id: 10, email: 'leader_parent@gmail.com', role_id: 2, group_id: 100, data_scope: 'GROUP' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        leaderChildToken = jwt.sign(
            { id: 20, email: 'leader_child@gmail.com', role_id: 2, group_id: 200, data_scope: 'GROUP' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        leaderUnrelatedToken = jwt.sign(
            { id: 40, email: 'leader_other@gmail.com', role_id: 2, group_id: 400, data_scope: 'GROUP' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        const conn = await db.getConnection();
        try {
            await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

            // 1. Tạo 4 nhóm kinh doanh phân cấp (Root Group 100 -> Child Group 200 -> Grandchild Group 300; Unrelated Group 400)
            await conn.execute(`
                INSERT INTO \`groups\` (id, name, description, parent_id) VALUES
                (100, 'Tập đoàn Kinh Doanh Mới', 'Cấp Tập đoàn (Root)', NULL),
                (200, 'Chi nhánh Miền Bắc', 'Cấp Chi nhánh (Child)', 100),
                (300, 'Đội Kinh doanh Hà Nội', 'Cấp Đội (Grandchild)', 200),
                (400, 'Chi nhánh Miền Nam', 'Chi nhánh Độc lập', NULL)
                ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id)
            `);

            // 2. Tạo các User thuộc các nhóm
            await conn.execute(`
                INSERT INTO users (id, email, password, full_name, role_id, group_id, status) VALUES
                (10, 'leader_parent@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Trưởng Nhóm Cấp Cao', 2, 100, 'ACTIVE'),
                (20, 'leader_child@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Trưởng Nhóm Miền Bắc', 2, 200, 'ACTIVE'),
                (30, 'sales_grandchild@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Sales Hà Nội', 3, 300, 'ACTIVE'),
                (40, 'leader_other@gmail.com', '$2a$10$w4rDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq.kdn.y', 'Trưởng Nhóm Miền Nam', 2, 400, 'ACTIVE')
                ON DUPLICATE KEY UPDATE group_id = VALUES(group_id), role_id = VALUES(role_id), status = VALUES(status)
            `);

            // 3. Tạo Khách hàng ở các tầng trong cây tổ chức
            await conn.execute(`
                INSERT INTO customers (id, name, phone, email, company, created_by, group_id) VALUES
                (1000, 'Khách hàng Cấp Tập đoàn (Group 100)', '0901111111', 'c1000@gmail.com', 'Tập đoàn A', 10, 100),
                (2000, 'Khách hàng Chi nhánh Miền Bắc (Group 200)', '0902222222', 'c2000@gmail.com', 'Công ty B', 20, 200),
                (3000, 'Khách hàng Đội Hà Nội (Group 300)', '0903333333', 'c3000@gmail.com', 'Đội C', 30, 300),
                (4000, 'Khách hàng Miền Nam (Group 400)', '0904444444', 'c4000@gmail.com', 'Công ty D', 40, 400)
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
    // 1. API LẤY CÂY SƠ ĐỒ TỔ CHỨC DẠNG PHÂN CẤP LỒNG NHAU ĐỆ QUY
    // ==============================================================
    test('[API Cây Tổ Chức] GET /api/groups/tree trả về cấu trúc đệ quy lồng nhau', async () => {
        const res = await request(app)
            .get('/api/groups/tree')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        // Tìm Root node 100
        const root100 = res.body.data.find(g => g.id === 100);
        expect(root100).toBeDefined();
        expect(root100.children).toBeDefined();

        // Kiểm tra con trực tiếp của 100 là 200
        const child200 = root100.children.find(g => g.id === 200);
        expect(child200).toBeDefined();
        expect(child200.children).toBeDefined();

        // Kiểm tra cháu của 100 (con của 200) là 300
        const grandchild300 = child200.children.find(g => g.id === 300);
        expect(grandchild300).toBeDefined();
    });

    // ==============================================================
    // 2. MIDDLEWARE RBAC DATA SCOPING CHO TRƯỞNG NHÓM CẤP TRÊN
    // ==============================================================
    test('[RBAC Data Scoping] Trưởng nhóm cấp cao (Group 100) xem được dữ liệu toàn bộ nhóm con cháu (100, 200, 300) nhưng không xem được nhóm khác (400)', async () => {
        const res = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${leaderParentToken}`);

        expect(res.statusCode).toBe(200);
        const groupIdsInList = res.body.data.map(c => c.group_id);

        expect(groupIdsInList).toContain(100);
        expect(groupIdsInList).toContain(200);
        expect(groupIdsInList).toContain(300);
        expect(groupIdsInList).not.toContain(400);
    });

    test('[RBAC Data Scoping] Trưởng nhóm cấp trung (Group 200) xem được dữ liệu nhóm con (300), nhưng không xem được nhóm cha (100) hay nhóm khác (400)', async () => {
        const res = await request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${leaderChildToken}`);

        expect(res.statusCode).toBe(200);
        const groupIdsInList = res.body.data.map(c => c.group_id);

        expect(groupIdsInList).toContain(200);
        expect(groupIdsInList).toContain(300);
        expect(groupIdsInList).not.toContain(100);
        expect(groupIdsInList).not.toContain(400);
    });

    test('[RBAC Record Access] Trưởng nhóm cấp cao (Group 100) xem chi tiết khách hàng của nhóm cháu (Group 300) thành công', async () => {
        const res = await request(app)
            .get('/api/customers/3000')
            .set('Authorization', `Bearer ${leaderParentToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.id).toBe(3000);
    });

    test('[RBAC Record Access] Trưởng nhóm cấp khác (Group 400) bị từ chối 403 khi cố xem khách hàng nhóm cháu (Group 300)', async () => {
        const res = await request(app)
            .get('/api/customers/3000')
            .set('Authorization', `Bearer ${leaderUnrelatedToken}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('Từ chối truy cập: Bản ghi này thuộc nhóm kinh doanh khác, bạn không có quyền xem!');
    });

    // ==============================================================
    // 3. RÀNG BUỘC MỖI NHÂN VIÊN CHỈ THUỘC ĐÚNG 1 NHÓM VÀ PHÒNG CHỐNG VÒNG LẶP CÂY
    // ==============================================================
    test('[Ràng buộc Nhóm] Chuyển nhân viên sang nhóm mới sẽ cập nhật group_id duy nhất', async () => {
        const res = await request(app)
            .put('/api/groups/200/members')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ user_id: 30 });

        expect(res.statusCode).toBe(200);

        // Verify database: user 30 now belongs to group 200
        const [rows] = await db.execute('SELECT group_id FROM users WHERE id = 30');
        expect(rows[0].group_id).toBe(200);
    });

    test('[Phòng chống vòng lặp] Không cho phép chọn nhóm con làm parent_id của nhóm cha', async () => {
        // Thử đặt parent_id của Group 100 thành Group 300 (tạo vòng lặp 100 -> 200 -> 300 -> 100)
        const res = await request(app)
            .put('/api/groups/100')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ parent_id: 300 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('Không thể chọn nhóm này làm cha vì sẽ tạo vòng lặp trong cây!');
    });
});
