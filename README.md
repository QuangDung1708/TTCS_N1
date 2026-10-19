# N1-277 — Quên mật khẩu

Dự án mẫu độc lập, chỉ gồm backend và frontend quên/đặt lại mật khẩu. Giao diện ban đầu chỉ có nút **Quên mật khẩu?**; bấm nút để mở form email. Mở liên kết nhận được để hiện form mật khẩu mới và xác nhận. Không có giao diện đăng nhập, slogan, dashboard hoặc code CRM.

Phân công: **Lê Minh Danh — Backend**, **Triệu Quang Dũng — Frontend**.

## Chạy

Node.js >=20, không cần MySQL. Từ thư mục giải nén:

```sh
cd backend
npm ci
npm run seed
npm start
```

Mở http://localhost:5055. Nhập `sales@example.test`. Mặc định email demo được lưu trong `backend/outbox/`; mở tệp mới nhất để lấy liên kết. Tài khoản mẫu có mật khẩu ban đầu `Demo12345!`, nhưng dự án không có chức năng đăng nhập.

Muốn gửi email thật: sao chép `backend/.env.example` thành `backend/.env`; đặt MAIL_MODE=smtp, SMTP_HOST/PORT/SECURE/USER/PASS/FROM và DEMO_EMAIL là email nhận cần thử. Gmail dùng App Password, không dùng mật khẩu đăng nhập Gmail. Chạy seed rồi khởi động server. APP_URL là địa chỉ người nhận truy cập được. Không commit .env/data/outbox/node_modules. Bản bàn giao đã kiểm tra chế độ email demo, chưa xác nhận nhận mail SMTP thật.

## Backend — Danh

- POST `/api/auth/forgot-password`: body email; cùng thông báo với email có hoặc không tồn tại.
- POST `/api/auth/check-reset-token`: body token; kiểm tra liên kết trước khi hiện form.
- POST `/api/auth/reset-password`: token, password, confirmPassword.
- Token ngẫu nhiên, lưu băm, hết hạn 30 phút, dùng một lần; chặn dùng đồng thời.
- Mật khẩu 8–128 ký tự có chữ và số/ký tự đặc biệt, xác nhận khớp; băm scrypt.
- Gửi lại cùng email sau 60 giây, giới hạn API 20 yêu cầu/IP/phút.
- Email demo ra tệp hoặc SMTP; dữ liệu JSON riêng, giữ sau restart.
- `npm test` trong backend: 8 bài kiểm tra API/nghiệp vụ.

## Frontend — Dũng

- Chỉ nút Quên mật khẩu và dialog form email/form mật khẩu mới.
- Hiện/ẩn mật khẩu, validation, countdown 60 giây, loading, thông báo lỗi/thành công.
- Dialog đóng bằng nút × hoặc Escape, focus bàn phím; responsive và animation nhẹ.
- HTML/CSS/JavaScript thuần, không cần build. Frontend gọi API cùng origin do backend phục vụ.

## Test

Bấm nút, gửi email mẫu; lấy link trong outbox; thử xác nhận không khớp rồi nhập đúng; đặt lại thành công; mở lại link phải bị từ chối. Email không tồn tại hiển thị cùng thông báo. Token hết hạn sau 30 phút; test tự động dùng đồng hồ giả để kiểm tra mốc hết hạn. Sau khi tải trang token được bỏ khỏi thanh địa chỉ; nếu refresh thì mở lại liên kết gốc từ email.

DB JSON và giới hạn IP trong RAM dành cho demo một process. Không có session đăng nhập, DB/queue của CRM. Thời gian xử lý SMTP có thể khác giữa email có/không tồn tại. Không dùng bản mẫu này thay cho hệ thống auth production.

## Nhánh GitHub riêng

Nhánh `tinh-nang/quen-mat-khau` là nhánh độc lập, chỉ chứa code mẫu này; không dựa trên develop. Không merge nhánh độc lập vào develop như một nhánh tính năng CRM thông thường. Nếu cần tích hợp CRM về sau, chuyển riêng code phù hợp và kiểm thử tích hợp.

Hai ZIP riêng có hướng dẫn để từng người tạo nhánh độc lập từ folder sạch và push bằng chính tài khoản mình. Không tạo nhánh từ develop vì như vậy GitHub vẫn hiển thị toàn bộ code develop.
