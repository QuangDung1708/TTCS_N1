# Tải backend về máy

Tệp `TTCS_N1-backend.zip` chứa mã backend, migration MySQL, test và tài liệu. Không chứa `.env`, node_modules, uploads hoặc dữ liệu kinh doanh mẫu.

Trên GitHub, mở tệp ZIP rồi chọn **Download raw file** để tải. Giải nén vào thư mục mới, mở terminal trong thư mục `backend`.

Yêu cầu: Node.js >=22.13 và MySQL 8.x (đã kiểm thử MySQL 8.4).

1. Chạy `npm ci`.
2. Nếu chưa có `.env`, tạo từ `.env.example`; cấu hình kết nối MySQL và JWT_SECRET ngẫu nhiên ít nhất 32 ký tự. Không chép đè `.env` hiện có.
3. Sao lưu và thử migration trên bản sao database hiện có trước: `npm run migrate`.
4. Chạy `npm start`.

Database mới không có tài khoản mặc định. Xem `backend/README.md` để tạo quản trị viên đầu tiên bằng thông tin của bạn, và xem `backend/docs/API.md` để dùng API. Các giá trị DB_USER/DB_PASSWORD/DB_NAME phải khớp MySQL trên máy của bạn. SMTP cần được cấu hình riêng nếu muốn nhận email kích hoạt/đặt lại mật khẩu.

Gói này là backend. Frontend chưa được sửa trong đợt triển khai này.
