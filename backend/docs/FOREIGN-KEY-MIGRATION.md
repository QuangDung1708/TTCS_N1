# Bản vá khóa ngoại trên database hiện có

Ảnh người dùng báo không tạo được khóa ngoại trên `lead_activities` (errno 150). Đây chưa đủ bằng chứng để kết luận nguyên nhân trên máy người dùng. Một nguyên nhân đã tái hiện trên MariaDB 10.4/MySQL 8.4: `leads.id` là `INT UNSIGNED` hoặc `BIGINT UNSIGNED`, trong khi `lead_activities.lead_id` do migration cũ tạo là `INT` có dấu.

## Áp dụng bản vá tổng hợp

1. Dừng API và mọi worker, giữ bản sao lưu database. Thử migration trên bản sao trước khi dùng dữ liệu thật.
2. Giải nén `TTCS_N1-database-fix.zip`, chép nội dung thư mục `backend` vào backend đang dùng. Bản vá chứa đúng năm tệp source, bao gồm cả hai bản sửa trước:
   - `sql/migrate.js`
   - `sql/reconcile-legacy-groups.js`
   - `sql/ensure-foreign-key.js`
   - `src/core/leads.js`
   - `src/jobs/worker.js`
3. Giữ nguyên `.env`. Không cần npm install lại. Trong backend chạy `npm run migrate`.
4. Chỉ khi có `Migration complete; no demo data inserted.` mới chạy `npm run dev`.

Không chạy SQL schema cũ, không xóa database và không dùng `FOREIGN_KEY_CHECKS=0` để ép migration đi tiếp. ZIP không chứa dữ liệu mẫu, `.env` hay thông tin đăng nhập.

## Hành vi migration

- Đọc kiểu cột và engine từ metadata database; bỏ qua FK đích đã tồn tại.
- Giữ nguyên ID cha. Khi cần, đồng bộ kiểu số nguyên cột liên kết với ID cha. Kiểm tra miền giá trị bằng số nguyên chính xác; không làm tròn BIGINT, không chuyển số âm sang UNSIGNED.
- Giữ NULL/NOT NULL, giá trị default và comment. Cột có dữ liệu không bị thu hẹp số bit. Với cột rỗng có thể đồng bộ sang kiểu ID cha nhỏ hơn. Cột có ràng buộc khác hoặc thuộc tính sinh tự động không tự sửa.
- Kiểm tra bản ghi mồ côi và index PRIMARY/UNIQUE của ID cha trước khi tạo FK. Không xóa bản ghi để vượt kiểm tra.
- Dừng rõ ràng nếu bảng không dùng InnoDB, kiểu ID không được hỗ trợ hoặc dữ liệu không chuyển được an toàn. Thông báo gồm `bảng.cột (kiểu, engine) -> bảng_cha.id (kiểu, engine)` và nguyên nhân; không in dữ liệu khách hàng hay mật khẩu.

DDL MySQL có implicit commit: migration thất bại vẫn có thể đã thêm cột/bảng hoặc đổi kiểu cột ở bước trước. Bản sao lưu vẫn cần thiết. Kiểm thử trên database QA không chứng minh tương thích với mọi database tùy biến của người dùng.

Các ca hồi quy kiểm tra: tái hiện lỗi FK trước bản sửa với cả INT UNSIGNED/BIGINT UNSIGNED; migration chạy lặp; giữ lịch sử có sẵn, default, nullability và comment; FK thật chặn bản ghi mồ côi; từ chối thu hẹp kiểu đang có dữ liệu, từ chối số âm sang UNSIGNED và báo rõ engine không tương thích. Kết quả chạy cuối ghi trong `delivery/README.md`.
