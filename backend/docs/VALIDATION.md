# Kết quả xác minh backend

> Báo cáo 80 test dưới đây là mốc backend trước khi làm frontend. Xem [kiểm chứng frontend/fullstack](../../frontend/docs/VALIDATION.md) cho lần chạy mới nhất.

- Cài đặt bằng lockfile: npm ci thành công.
- Lint: npm run lint thành công.
- MySQL 8.4: **80/80 test**, **10/10 suite** thành công với npm run test:coverage.
- Coverage của các module API đang phục vụ: **90.35% dòng**, **75.6% nhánh**, **87.12% câu lệnh**, **90.96% hàm**. Ngưỡng tối thiểu cấu hình: 60% nhánh, 75% dòng/hàm/câu lệnh.
- Phân bổ nền đã được kiểm tra bằng scheduler mặc định 30 giây, không chỉ gọi trực tiếp hàm worker.
- API 360 đã được kiểm tra với 500 hoạt động lưu trong MySQL và thời gian dưới 1,5 giây tại máy kiểm thử.
- SMTP đã kiểm tra qua TCP tới máy chủ nhận thư cục bộ; lỗi kết nối giữ thư trong hàng chờ và ghi metadata để thử lại.
- Migration chạy trên database rỗng và schema cũ của kho, chạy lại được và giữ dữ liệu cũ trong các kiểm thử này.
- Server thật khởi động lại thành công: health trả HTTP 200; API được bảo vệ không có token trả HTTP 401.
- Database phát triển crm_dev không chứa người dùng/khách hàng/lead/cơ hội/sản phẩm/chiến dịch/báo giá mẫu. Fixture chỉ có trong crm_test.
- Tại mốc kiểm tra backend này frontend chưa sửa. Bản frontend tiếp theo đã được triển khai riêng; tệp .env có sẵn không bị thay đổi.

## Phạm vi chưa xác nhận

Chưa áp dụng migration vào database thật trong ảnh; chưa đối chiếu được ZIP vì giới hạn tải 32 MiB. Khóa JWT hiện có quá ngắn; server dùng khóa ngẫu nhiên trong bộ nhớ cho lần chạy thử hiện tại. Cần JWT_SECRET ổn định ít nhất 32 ký tự khi triển khai. SMTP_HOST chưa cấu hình, nên chưa xác nhận gửi thư tới hộp thư bên ngoài. Tại mốc backend, GitHub CI, staging, UI 360px và nghiệm thu PO chưa chạy; kiểm tra 360px mới được ghi ở báo cáo frontend.

Bảng 151 AC trong AC-MATRIX.md nêu rõ các phần backend, frontend và phụ thuộc triển khai. Kết quả test này không phải cam kết mọi lỗi đã được loại bỏ hoặc toàn bộ 151 AC đã được nghiệm thu.
