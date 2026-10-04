const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../index');
const db = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'crm_jwt_secret_key_2026_super_secure';
process.env.JWT_SECRET = JWT_SECRET;

describe('KIỂM THỬ TÍNH NĂNG [S2-09]: CẤU HÌNH PIPELINE & XÁC SUẤT THẮNG', () => {
    let adminToken = '';
    let salesToken = '';

    beforeAll(async () => {
        // Token Giám đốc (ALL)
        adminToken = jwt.sign(
            { id: 1, email: 'admin@gmail.com', role_id: 1, group_id: null, data_scope: 'ALL' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Token Nhân viên (OWN) - không có quyền truy cập API pipeline
        salesToken = jwt.sign(
            { id: 3, email: 'sales_a1@gmail.com', role_id: 3, group_id: 1, data_scope: 'OWN' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Đảm bảo bảng pipeline_stages tồn tại
        const conn = await db.getConnection();
        try {
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS pipeline_stages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    win_probability INT NOT NULL DEFAULT 0,
                    exit_criteria TEXT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_stage_name (name),
                    INDEX idx_sort_order (sort_order)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            // Xóa sạch dữ liệu test cũ rồi chèn lại 6 giai đoạn chuẩn
            await conn.execute('DELETE FROM pipeline_stages');
            await conn.execute(`
                INSERT INTO pipeline_stages (id, name, sort_order, win_probability, exit_criteria) VALUES
                (1, 'Tiếp cận', 1, 10, 'Đã liên hệ lần đầu với khách hàng tiềm năng'),
                (2, 'Xác định nhu cầu', 2, 25, 'Đã ghi nhận nhu cầu cụ thể của khách hàng'),
                (3, 'Đề xuất giải pháp', 3, 50, 'Đã gửi đề xuất hoặc bản trình bày giải pháp'),
                (4, 'Báo giá', 4, 65, 'Đã gửi báo giá chính thức cho khách hàng'),
                (5, 'Đàm phán', 5, 80, 'Đang thương lượng điều khoản hợp đồng'),
                (6, 'Chốt', 6, 100, 'Khách hàng đã ký hợp đồng hoặc xác nhận đặt hàng')
            `);
        } finally {
            conn.release();
        }
    });

    afterAll(async () => {
        if (db && db.end) await db.end();
    });

    // ==============================================================
    // 1. QUYỀN TRUY CẬP: Chỉ Admin/Giám đốc mới quản lý pipeline
    // ==============================================================
    test('[Phân quyền] Nhân viên Sales bị từ chối 403 khi truy cập API pipeline', async () => {
        const res = await request(app)
            .get('/api/pipeline-stages')
            .set('Authorization', `Bearer ${salesToken}`);

        expect(res.statusCode).toBe(403);
    });

    // ==============================================================
    // 2. LẤY DANH SÁCH GIAI ĐOẠN PIPELINE
    // ==============================================================
    test('[GET] Lấy danh sách giai đoạn pipeline thành công, sắp theo sort_order', async () => {
        const res = await request(app)
            .get('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(6);

        // Kiểm tra thứ tự sắp xếp tăng dần
        for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i].sort_order).toBeGreaterThanOrEqual(res.body.data[i - 1].sort_order);
        }

        // Kiểm tra dữ liệu giai đoạn đầu tiên
        const firstStage = res.body.data[0];
        expect(firstStage.name).toBe('Tiếp cận');
        expect(firstStage.win_probability).toBe(10);
    });

    // ==============================================================
    // 3. TẠO GIAI ĐOẠN MỚI
    // ==============================================================
    test('[POST] Tạo giai đoạn mới thành công với đầy đủ thông tin', async () => {
        const res = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Theo dõi sau bán hàng',
                sort_order: 7,
                win_probability: 100,
                exit_criteria: 'Đã hoàn tất giao hàng và xác nhận từ khách hàng'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.stageId).toBeDefined();
    });

    test('[POST] Từ chối tạo giai đoạn trùng tên (409 Conflict)', async () => {
        const res = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Tiếp cận', sort_order: 99, win_probability: 5 });

        expect(res.statusCode).toBe(409);
    });

    test('[POST] Từ chối tạo giai đoạn với xác suất > 100%', async () => {
        const res = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Giai đoạn lỗi', win_probability: 150 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('0 - 100%');
    });

    test('[POST] Từ chối tạo giai đoạn với xác suất < 0', async () => {
        const res = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Giai đoạn lỗi 2', win_probability: -10 });

        expect(res.statusCode).toBe(400);
    });

    test('[POST] Từ chối tạo giai đoạn thiếu tên', async () => {
        const res = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ win_probability: 50 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('Tên giai đoạn là bắt buộc');
    });

    // ==============================================================
    // 4. CẬP NHẬT GIAI ĐOẠN (tên, xác suất, điều kiện rời)
    // ==============================================================
    test('[PUT] Cập nhật xác suất thắng mặc định của giai đoạn thành công', async () => {
        const res = await request(app)
            .put('/api/pipeline-stages/2')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ win_probability: 30 });

        expect(res.statusCode).toBe(200);

        // Verify DB
        const verify = await request(app)
            .get('/api/pipeline-stages/2')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(verify.body.data.win_probability).toBe(30);
    });

    test('[PUT] Cập nhật điều kiện rời giai đoạn (exit_criteria)', async () => {
        const res = await request(app)
            .put('/api/pipeline-stages/3')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ exit_criteria: 'Phải có ít nhất 1 cuộc gặp trực tiếp với khách hàng' });

        expect(res.statusCode).toBe(200);

        const verify = await request(app)
            .get('/api/pipeline-stages/3')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(verify.body.data.exit_criteria).toContain('cuộc gặp trực tiếp');
    });

    test('[PUT] Từ chối cập nhật xác suất > 100', async () => {
        const res = await request(app)
            .put('/api/pipeline-stages/1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ win_probability: 200 });

        expect(res.statusCode).toBe(400);
    });

    // ==============================================================
    // 5. CẬP NHẬT THỨ TỰ HÀNG LOẠT (Reorder)
    // ==============================================================
    test('[PUT /reorder] Sắp xếp lại thứ tự pipeline hàng loạt', async () => {
        const res = await request(app)
            .put('/api/pipeline-stages/reorder')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                stages: [
                    { id: 1, sort_order: 2 },
                    { id: 2, sort_order: 1 }
                ]
            });

        expect(res.statusCode).toBe(200);

        // Verify: stage 2 bây giờ phải có sort_order = 1
        const verify = await request(app)
            .get('/api/pipeline-stages/2')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(verify.body.data.sort_order).toBe(1);
    });

    test('[PUT /reorder] Từ chối khi body stages rỗng', async () => {
        const res = await request(app)
            .put('/api/pipeline-stages/reorder')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ stages: [] });

        expect(res.statusCode).toBe(400);
    });

    // ==============================================================
    // 6. XÓA GIAI ĐOẠN (An toàn cho cơ hội đang chạy)
    // ==============================================================
    test('[DELETE] Xóa giai đoạn không có cơ hội nào đang dùng thì xóa cứng', async () => {
        // Tạo giai đoạn tạm để xóa
        const createRes = await request(app)
            .post('/api/pipeline-stages')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Giai đoạn tạm xóa', sort_order: 99, win_probability: 5 });

        const tempId = createRes.body.stageId;

        const res = await request(app)
            .delete(`/api/pipeline-stages/${tempId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);

        // Verify đã xóa khỏi DB
        const verify = await request(app)
            .get(`/api/pipeline-stages/${tempId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(verify.statusCode).toBe(404);
    });

    test('[DELETE] Từ chối xóa giai đoạn không tồn tại (404)', async () => {
        const res = await request(app)
            .delete('/api/pipeline-stages/99999')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
    });
});
