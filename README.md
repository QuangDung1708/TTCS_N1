# N1-277 — backend — Lê Minh Danh

Gói này chỉ chứa code backend của tính năng quên mật khẩu, không có CRM.

## Push bằng tài khoản của bạn

Giải nén vào một thư mục mới, trống, nằm ngoài repository CRM cũ. Mở terminal ở thư mục giải nén (thư mục chứa backend). KHÔNG clone develop hoặc copy cả repository CRM vào đây.

```sh
git init -b backend/quen-mat-khau-mau
git config user.name "Tên của bạn"
git config user.email "Email GitHub đã xác minh của bạn"
git add .
git diff --cached --stat
git commit -m "N1-277: them backend quen mat khau"
git remote add origin https://github.com/QuangDung1708/TTCS_N1.git
git push -u origin backend/quen-mat-khau-mau
```

Đăng nhập GitHub bằng tài khoản của chính bạn, có quyền push repo. Nếu cùng tên nhánh đã tồn tại, dùng tên mới; không force push lên nhánh của người khác. Không commit node_modules, .env, dữ liệu và email demo.

Đây là nhánh độc lập cho bản mẫu. Khi xem nhánh này GitHub chỉ hiện code trong gói, không có lịch sử/code CRM. Không merge vào develop như nhánh tính năng thông thường vì lịch sử độc lập.

## Ghép và chạy

Ghép backend và frontend cạnh nhau trong một thư mục riêng, không đặt frontend bên trong backend:

```
backend/
frontend/
```

Cần Node.js >=20. Trong backend chạy `npm ci`, `npm run seed`, `npm start`; mở http://localhost:5055. Bấm Quên mật khẩu?, nhập sales@example.test. Email demo được lưu trong backend/outbox/. Mở tệp mới nhất để lấy link. Không mở frontend bằng file://.

## Backend

API forgot-password, check-reset-token, reset-password. Token băm, hạn 30 phút, dùng một lần. Mật khẩu xác nhận phải khớp, 8–128 ký tự có chữ và số/ký tự đặc biệt. Gửi lại sau 60 giây. Email không tồn tại trả cùng thông báo. Email demo hoặc SMTP. Dữ liệu JSON riêng cho demo một process. Chạy npm test trong backend: 8 kiểm thử.

Muốn gửi thật: copy backend/.env.example thành backend/.env, cấu hình MAIL_MODE=smtp, SMTP và DEMO_EMAIL rồi seed và restart. Chưa kiểm tra nhận SMTP thật cho bản này. Không chứa tài khoản mail thật trong ZIP.
