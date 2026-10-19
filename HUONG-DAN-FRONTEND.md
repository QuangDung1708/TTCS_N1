# N1-288 — frontend: hướng dẫn push riêng

Gói này chỉ có code frontend của task nhập Excel người dùng. README.md ghi tính năng, API và cách chạy/test.

## Push nhánh độc lập bằng tài khoản của bạn

Giải nén vào folder MỚI, TRỐNG, bên ngoài thư mục CRM. Mở terminal ở thư mục có frontend/. Không clone/pull develop nếu muốn nhánh chỉ có code mẫu này.

```sh
git init -b frontend/nhap-excel-nguoi-dung
git config user.name "Tên của bạn"
git config user.email "Email GitHub đã xác minh của bạn"
git add .
git diff --cached --stat
git commit -m "N1-288: them frontend nhap Excel nguoi dung"
git remote add origin https://github.com/QuangDung1708/TTCS_N1.git
git push -u origin frontend/nhap-excel-nguoi-dung
```

Đăng nhập GitHub bằng tài khoản của chính mình có quyền push repo. Tên/email commit không thay thế việc đăng nhập. Nếu nhánh cùng tên đã tồn tại, chọn tên mới có hậu tố của mình; không force push.

Không đưa node_modules, data hoặc tệp chứa mật khẩu thật lên Git. Mẫu đi kèm chỉ chứa tài khoản/email/mật khẩu giả.

## PR bình thường trong dự án mẫu

Nếu muốn tạo PR vào nhánh `tinh-nang/nhap-excel-nguoi-dung`, thay vì git init ở trên, clone đúng nhánh đó rồi tạo nhánh con, sửa code và push:

```sh
git clone --single-branch --branch tinh-nang/nhap-excel-nguoi-dung https://github.com/QuangDung1708/TTCS_N1.git test-nhap-excel
cd test-nhap-excel
git switch -c feature/nhap-excel-frontend
```

Sau khi có chỉnh sửa thực tế: add đúng phần mình, commit, push `feature/nhap-excel-frontend`. Trên GitHub chọn base `tinh-nang/nhap-excel-nguoi-dung`, compare nhánh vừa push. Code giống hệt không tạo được PR có thay đổi. Nhánh tạo bằng git init độc lập không có cùng lịch sử để PR trực tiếp vào nhánh mẫu/develop.

## Ghép hai gói để chạy

Đặt backend/ và frontend/ cạnh nhau. Trong backend chạy npm ci, npm start; mở http://localhost:5057. Không cần MySQL, .env hoặc SMTP. Frontend không chạy riêng bằng Live Server/file:// vì dùng API cùng origin.

Test file mau-test/kiem-tra-co-dong-loi.xlsx trên DB mới: 2 dòng hợp lệ, 4 dòng lỗi. Xác nhận tạo 2 tài khoản, bỏ qua 4 dòng. Lặp lại sẽ bị chặn trùng. Mẫu chỉ tạo dữ liệu demo trong backend/data/users.json, không gửi email.
