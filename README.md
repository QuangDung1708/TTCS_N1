# N1-279 — Nhập người dùng từ Excel

Bản mẫu độc lập, chỉ chứa tính năng nhập Excel. Trang đầu chỉ có nút **Nhập người dùng từ Excel**; bấm để mở dialog tải mẫu, xem trước và nhập. Không có code CRM, đăng nhập, dashboard hoặc tính năng quên mật khẩu.

Hai phần tương ứng subtask trong ảnh Jira: **N1-287 [BE] API tải mẫu, kiểm tra và nhập người dùng từ Excel**; **N1-288 [FE] Giao diện nhập Excel và báo cáo kết quả**. Không tự thay đổi assignee hoặc trạng thái trên Jira.

## Chạy ngay

Cần Node.js >=20. Không cần MySQL, SMTP, .env hoặc chạy seed.

```sh
cd backend
npm ci
npm start
```

Mở `http://localhost:5057`. Backend phục vụ cả giao diện, không cần chạy frontend riêng. Chạy phát triển: `npm run dev`. Dừng bằng Ctrl+C. Chạy test: `npm test` trong backend.

Dữ liệu tài khoản được lưu riêng tại `backend/data/users.json`, giữ lại sau khi khởi động lại. ZIP không kèm dữ liệu đã test, node_modules hoặc thông tin bí mật. Không sửa dữ liệu CRM hiện tại.

## AC và cách test

| AC trong ảnh | Cách test | Kết quả |
|---|---|---|
| Tải được tệp mẫu | Bấm **Tải mẫu Excel** | Nhận .xlsx có 6 cột tiếng Việt, dữ liệu mẫu, danh mục dropdown vai trò/nhóm và sheet hướng dẫn |
| Xem trước và báo lỗi từng dòng | Chọn `mau-test/kiem-tra-co-dong-loi.xlsx` | Trên dữ liệu mới: 2 dòng hợp lệ, 4 dòng lỗi; chỉ rõ dòng, email sai, trùng email hoặc vai trò sai; chưa lưu tài khoản |
| Bỏ dòng lỗi, nhập dòng đúng, báo tổng hợp | Bấm **Nhập 2 dòng hợp lệ** | Tạo 2 tài khoản, bỏ qua 4 dòng; hiện kết quả từng dòng và tải được báo cáo Excel |

Test thêm:

1. Nhập lại cùng tệp: 0 dòng hợp lệ; các email đã tạo bị báo trùng; nút nhập bị khóa.
2. Dùng file tải từ nút **Tải mẫu Excel**: trên dữ liệu mới có 3 dòng hợp lệ. Đây là người dùng giả với email example.test; thay/xóa trước khi dùng dữ liệu khác.
3. Xóa tên, đổi email sai, dùng mật khẩu quá ngắn, vai trò/nhóm không có trong danh mục hoặc số điện thoại sai: lỗi đúng tại dòng đó.
4. Thử .csv/.xls, .xlsx hỏng, file >2 MB, sai tiêu đề, trống hoặc >1.000 dòng: báo lỗi, không nhập dữ liệu.
5. Xem trước rồi đóng dialog: chưa lưu tài khoản. Trong cùng phiên mở lại dialog giữ bản xem trước; reload trang thì chọn lại file.
6. Mở hai lượt xem trước cùng email; nhập một lượt trước, lượt còn lại được kiểm tra lại và không tạo trùng. Gửi lại cùng preview đã nhập trả cùng kết quả, không tạo lại.
7. Bản xem trước hết hạn sau 15 phút hoặc backend restart: chọn lại file. Test tự động kiểm tra mốc hết hạn không cần chờ thật.

Muốn test lại từ dữ liệu rỗng: **chỉ trong dự án demo này**, dừng server, sao lưu rồi đổi tên `backend/data/users.json`, chạy server lại. Không thao tác dữ liệu CRM.

## Mẫu Excel và ràng buộc

Đọc sheet đầu tiên, tối đa 1.000 dòng dữ liệu, 2 MB. Định dạng .xlsx. Tiêu đề phải theo mẫu:

| Cột | Ràng buộc |
|---|---|
| Tên | Bắt buộc, tối đa 100 ký tự |
| Email | Bắt buộc, đúng định dạng, tối đa 254 ký tự; chuẩn hóa chữ thường; không trùng hệ thống hoặc trong file |
| Mật khẩu tạm thời | Bắt buộc, 8–128 ký tự, có chữ và số/ký tự đặc biệt; được băm scrypt khi lưu |
| Vai trò (RBAC) | Bắt buộc, chọn trong danh mục |
| Nhóm kinh doanh | Bắt buộc, chọn trong danh mục |
| Số điện thoại | Không bắt buộc; di động Việt Nam 03/05/07/08/09 gồm 10 số hoặc +84 tương đương; cột Text giữ số 0 đầu |

Đây là ràng buộc triển khai của bản mẫu; ảnh AC chỉ quy định tải mẫu, xem trước lỗi và nhập một phần. Dòng trống bỏ qua, số dòng lỗi giữ theo số dòng Excel gốc. Mọi dòng cùng email trùng trong một tệp đều bị chặn. Không cập nhật tài khoản cũ. Công thức trong ô bị báo lỗi, không thực thi.

Mẫu có 7 vai trò và 7 nhóm demo. Sheet Danh muc cho biết giá trị hợp lệ; danh mục này độc lập, không phải danh mục từ DB CRM.

## Backend — N1-287

- Express 5, ExcelJS, Multer; nhận upload vào RAM, không lưu tệp gốc.
- Sinh mẫu Excel có header, độ rộng, dropdown bằng named ranges, giữ điện thoại dạng Text.
- Kiểm tra file, từng dòng, email trùng trong file/DB. Xem trước không ghi DB.
- Preview ID ngẫu nhiên, sống 15 phút, tối đa 20 bản chờ; backend giữ dữ liệu gốc, không tin rows gửi từ frontend.
- Khi xác nhận kiểm tra lại với DB mới nhất; hàng đợi trong một process ngăn hai import tạo trùng.
- Băm mật khẩu scrypt; không trả mật khẩu/hash qua API hoặc báo cáo; bỏ mật khẩu tạm trong RAM khi đã nhập.
- Nhập các dòng đúng, bỏ dòng sai. Ghi JSON qua tệp tạm và rename; lỗi ghi không thay đổi trạng thái đã giữ trong RAM.
- Execute lặp cùng preview trả cùng kết quả trong thời hạn preview, không nhập lần hai.
- Báo cáo .xlsx gồm số dòng, tên/email, trạng thái và lý do lỗi; tải ở cả bước xem trước và kết quả.
- Không gửi email kích hoạt, không có giao diện đăng nhập: không thuộc ba AC của task này.

## Frontend — N1-288

- HTML/CSS/JS thuần, không cần npm install/build riêng.
- Một nút mở dialog; ba bước chọn tệp → kiểm tra → kết quả.
- Tải mẫu, chọn file, tên file, loading và thông báo lỗi.
- Bảng có số dòng, tên/email, vai trò/nhóm, điện thoại và lỗi chi tiết; không hiển thị mật khẩu.
- Đếm hợp lệ/lỗi, khóa nhập nếu không có dòng đúng; chỉ nhập khi người dùng xác nhận.
- Xem số đã nhập/bỏ qua; tải báo cáo, chọn tệp khác.
- Thay tệp mới sẽ hủy bản xem trước trên giao diện, tránh dùng nhầm tệp cũ khi tệp mới bị lỗi.
- Responsive, điều hướng bàn phím, dialog focus, trạng thái aria-live, animation nhẹ và giảm chuyển động theo cài đặt hệ thống.

## API

| Method | Endpoint | Đầu vào / đầu ra |
|---|---|---|
| GET | `/api/health` | `{status:"ok"}` |
| GET | `/api/import/users/catalogs` | Danh sách roles và groups |
| GET | `/api/import/users/template` | File mẫu .xlsx |
| POST | `/api/import/users/preview` | multipart/form-data, trường `file`; trả previewId, expiresAt, total, valid, invalid, rows |
| POST | `/api/import/users/execute` | JSON `{ "previewId": "..." }`; trả total, imported, skipped, rows |
| GET | `/api/import/users/:id/report` | Báo cáo .xlsx của preview/kết quả |

Preview rows: row, name, email, role, group, phone, valid, errors. Execute thêm status IMPORTED/SKIPPED. Lỗi JSON `{message:"..."}`: 400 file/dữ liệu sai, 410 preview hết hạn/không tồn tại, 422 không còn dòng hợp lệ, 429 quá nhiều preview chờ, 500 lỗi nội bộ.

## Phạm vi

Bản mẫu chạy local trên 127.0.0.1, chưa có xác thực/phân quyền Admin, hệ thống mail hoặc database CRM. DB JSON và hàng đợi chỉ dành cho một process, không dùng làm dịch vụ import production. Cần tích hợp auth/RBAC, transaction/unique email ở DB và giới hạn tài nguyên trước khi đưa vào hệ thống thật.

File Excel nguồn có mật khẩu tạm rõ theo mẫu; dùng dữ liệu giả để test, không đưa file chứa mật khẩu thật lên Git. API và báo cáo không trả lại mật khẩu.

## GitHub và bàn giao

Nhánh độc lập: `tinh-nang/nhap-excel-nguoi-dung`, chỉ có code của task này. Không kế thừa develop, không merge thẳng nhánh độc lập vào develop theo Gitflow. Muốn PR trong dự án mẫu, tạo nhánh con từ nhánh này. Muốn PR tích hợp CRM, tạo nhánh từ develop rồi thêm riêng phần code thích hợp.

Hai ZIP BE/FE chứa hướng dẫn push từ folder trống bằng chính tài khoản của mỗi người. Ghép `backend/` và `frontend/` cạnh nhau để chạy đủ tính năng. Đã kiểm tra 11/11 test backend/API và Chromium: tải mẫu/báo cáo, xem trước 2 đúng 4 lỗi, nhập một phần, nhập lại bị chặn, file mới sai hủy preview cũ, bàn phím/mobile và không có lỗi JS.
