# Backend CRM — Sprint 1–5

Node.js/Express, MySQL **8.0+** (kiểm thử bằng MySQL 8.4), mysql2, JWT, bcrypt, Nodemailer, Sharp và SheetJS. Cần Node.js >=22.13; môi trường hiện tại dùng Node.js 24. Không có bước nạp dữ liệu kinh doanh mẫu. Database mới bắt đầu rỗng; dữ liệu được nhập qua API/Excel.

## Cài đặt và khởi động

Chạy các lệnh từ thư mục `backend`:

```bash
npm ci
npm run schema:report
npm run migrate
npm start
```

Cấu hình qua biến môi trường hoặc tệp `.env` cục bộ theo tên biến trong `.env.example`. Giữ nguyên dữ liệu `.env` hiện có; không chép đè bằng tệp mẫu. Biến môi trường được ưu tiên hơn `.env`.

- MySQL: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Tạo database bằng `utf8mb4`; tài khoản migration cần quyền DDL, tài khoản ứng dụng cần quyền thao tác dữ liệu.
- `JWT_SECRET`: khóa ngẫu nhiên ít nhất 32 ký tự, ổn định qua các lần khởi động. Khóa trong bản `.env` có sẵn chưa đáp ứng điều kiện này. Thay khóa sẽ làm JWT cũ hết hiệu lực. Không ghi khóa vào Git.
- HTTP: `PORT` mặc định 5001, `BIND_HOST` mặc định 127.0.0.1; `FRONTEND_URL`, `PUBLIC_API_URL`, `CORS_ORIGINS` là các URL triển khai thực tế. Chỉ đặt `TRUST_PROXY_HOPS` khi biết số reverse proxy tin cậy.
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Không cấu hình SMTP thì thư nằm trong `mail_outbox`, không báo đã gửi ra ngoài. Worker dùng TLS/chứng chỉ mặc định của Nodemailer, không tắt xác minh.
- Worker tự chạy cùng `npm start`, mỗi 30 giây xử lý phân bổ/SLA. Đánh giá cơ hội đình trệ mỗi ngày một lần, dựa trên mốc UTC và lưu trạng thái chạy trong database. Có thể dùng `RUN_WORKER=false` trên API và chạy `npm run worker` riêng. Advisory lock ngăn hai worker xử lý cùng lượt phân bổ.
- Nếu XAMPP báo `worker_failed ER_PARSE_ERROR`: bản vá worker dùng `FOR UPDATE` cùng advisory lock, không còn yêu cầu `SKIP LOCKED` vốn chưa có trên MariaDB 10.4. Hàng đợi mail có khóa riêng để các worker không gửi đồng thời cùng bản ghi. Không cần tắt worker hoặc sửa App Password để xử lý lỗi cú pháp SQL này. Xem [bản vá và kiểm chứng](docs/WORKER-COMPATIBILITY.md); MySQL 8 vẫn là nền tảng kiểm thử đầy đủ.
- Đăng ký công khai bằng OTP được giữ dưới tùy chọn `ALLOW_SELF_REGISTRATION=true`; tài khoản tự đăng ký chỉ có vai trò Sales Rep. Mặc định quản trị viên cấp tài khoản.

Để chạy thử cục bộ với khóa phiên tạm thời (mọi phiên của lần chạy trước sẽ không dùng lại được):

```bash
JWT_SECRET="$(node -p "require('crypto').randomBytes(48).toString('hex')")" npm start
```

Một database mới cần tài khoản quản trị thật. Cấp `CRM_ADMIN_EMAIL`, `CRM_ADMIN_NAME`, `CRM_ADMIN_PASSWORD` qua môi trường, sau đó chạy `npm run bootstrap-admin`. Lệnh chỉ tạo quản trị viên đầu tiên, không có email/mật khẩu mặc định và không in mật khẩu.

## Database hiện có

`npm run migrate` là điểm vào chuẩn. `sql/setup_database.js` chuyển tiếp tới cùng migration. Hai tệp SQL cũ `schema.sql` và `s1_05_rbac_scope.sql` được giữ làm tài liệu lịch sử; không chạy chúng tiếp lên database đang sử dụng. `sql/schema.mysql.sql` là cấu trúc MySQL mới không chứa dữ liệu, được xuất từ database đã migration; sau khi khởi tạo cấu trúc vẫn cần chạy `npm run migrate`.

Migration thêm bảng/cột/index/khóa ngoại còn thiếu, không DROP bảng/cột hay nạp dữ liệu demo. Có backfill tên cột tương đương, ánh xạ nhóm cũ, vai trò và trạng thái thắng/thua. Các giá trị enum trạng thái cũ được mở rộng sang VARCHAR để giữ nguyên giá trị. FK `users.group_id → groups_table` cũ được thay bằng FK tới `groups`. Khi ID trùng nhưng tên khác, giữ nhóm hiện có và sao chép nhóm cũ sang ID mới, lưu ánh xạ trong `crm_legacy_group_map`; chỉ chuyển liên kết người dùng khi FK xác nhận nguồn nhóm cũ. Xem [bản vá migration nhóm](docs/GROUP-MIGRATION.md).

**Sao lưu database trước khi áp dụng lên dữ liệu thật, dừng API và worker trong suốt migration:** MySQL DDL không rollback toàn bộ như transaction dữ liệu. Migration dừng khi liên kết nhóm không xác định được nguồn, có tham chiếu nhóm cũ chưa được hỗ trợ, mã số thuế trùng, dữ liệu mồ côi hoặc kiểu cột không tương thích; không tự xóa hoặc chọn một bản ghi thay người dùng. Đối với database chỉ có ảnh danh sách bảng, chưa thể khẳng định cấu trúc cột và toàn bộ dữ liệu tương thích. `npm run schema:report` chỉ xuất metadata cột, không xuất nội dung khách hàng hoặc bí mật.

## Quyền và phiên

Ma trận vai trò nằm trong `src/config/roleMatrix.js`; lớp quyền dùng chung ở `src/core/access.js`. `user_roles` hỗ trợ nhiều vai trò, gộp quyền cho từng thao tác và kiểm tra bằng database ở mỗi yêu cầu. ID vai trò số cũ không được dùng để suy ra đặc quyền.

Sales Rep/Cust. Success chỉ được thao tác bản ghi thuộc phạm vi cho phép; Team Lead theo nhóm hiện tại và cây nhóm con. Lead chưa phân công thuộc hàng chờ của nhóm hoặc chưa có nhóm có thể được trưởng nhóm phân tay trong nhóm mình. Giá vốn chỉ Director đọc/sửa được, kể cả qua audit. Quyền áp dụng cho API chi tiết, danh sách, tìm kiếm, dữ liệu liên quan và xuất Excel.

JWT phải có phiên còn hiệu lực trong `auth_sessions`. Thời gian không hoạt động là 30 phút, tự gia hạn khi sử dụng; giới hạn tuyệt đối 7 ngày. Logout/khóa tài khoản thu hồi phiên ngay phía server. Đổi mật khẩu thu hồi các phiên khác. JWT cũ từ backend trước migration không được chấp nhận; cần đăng nhập lại.

## Kiểm thử

Tạo một database **riêng có thể xóa**, tên `crm_test` hoặc `crm_test_<hậu tố chữ/số>`, rồi chạy:

```bash
DB_NAME=crm_test ALLOW_DB_TEST_RESET=1 npm test
DB_NAME=crm_test ALLOW_DB_TEST_RESET=1 npm run test:coverage
npm run lint
```

Điều chỉnh DB_HOST/PORT/USER/PASSWORD theo MySQL của bạn. Bộ kiểm thử từ chối chạy nếu thiếu tên database thử nghiệm và cờ reset. Test thực hiện DDL, truncate và ghi fixture vào **database test riêng**. Đây là dữ liệu dành cho kiểm thử tự động, không được nạp vào database ứng dụng và không thay thế dữ liệu API bằng mock.

Kiểm thử dùng MySQL thật, HTTP thực qua Supertest, đọc/ghi tệp thật, tệp XLSX thật, và kết nối SMTP TCP tới máy chủ nhận thư cục bộ. Kiểm thử SMTP cục bộ không chứng minh Gmail hoặc dịch vụ SMTP triển khai đã nhận thư. Mốc 1,5 giây của API 360 với 500 hoạt động chỉ được đo trong môi trường kiểm thử cục bộ, chưa phải SLA trên máy chủ của bạn.

`jest.config.cjs` tính coverage trên các module phục vụ API đang chạy. Các controller cũ được giữ để tham khảo, không phải entry point của ứng dụng. CI MySQL được khai báo trong `.github/workflows/backend.yml`; kết quả CI từ GitHub chưa được xác minh ở phiên này.

Xem [API](docs/API.md) và [đối chiếu AC](docs/AC-MATRIX.md). Giao diện và nghiệm thu staging thuộc bước tiếp theo; không coi toàn bộ 151 AC đã đạt chỉ từ test backend.
