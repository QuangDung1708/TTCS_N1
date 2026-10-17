# Frontend CRM — Sprint 1–5

React 19, Vite 8, Ant Design 6, @ant-design/icons và dnd-kit. Giao diện tiếng Việt, light mode, sidebar trên desktop và Drawer điều hướng trên điện thoại. Mọi số liệu, danh mục, người phụ trách, thông báo và ma trận quyền đều lấy từ API/MySQL. Không có tài khoản đăng nhập mẫu hay danh sách khách hàng/lead/cơ hội dự phòng trong ứng dụng.

## Chạy cùng backend

Dùng Node.js 24 LTS và MySQL 8. Sao lưu database hiện có trước khi chạy migration. Xem [backend/README.md](../backend/README.md) để cấu hình database, JWT, SMTP, migration và tài khoản Admin thật.

Tại thư mục `backend`:

```sh
npm ci
```

Sao chép `.env.example` thành `.env`, điền kết nối MySQL hiện có (`DB_NAME=crm_db` nếu đó là tên database của bạn). Tạo JWT_SECRET ổn định bằng lệnh sau và tự đặt kết quả vào `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
npm run migrate
npm start
```

Nếu database chưa có tài khoản Admin, dùng `npm run bootstrap-admin` theo hướng dẫn backend. Không chạy lệnh này để thay thế tài khoản đang có. Email cấp tài khoản/khôi phục mật khẩu cần SMTP thật; không có mật khẩu chung hay OTP giả.

Mở terminal thứ hai tại thư mục `frontend`:

```sh
npm ci
npm run dev
```

Mặc định Vite chạy cổng 5173 và chuyển `/api`, `/uploads` tới backend cổng 5001. Dùng địa chỉ hiện trong terminal. Trên Windows có thể sao chép tệp cấu hình bằng `Copy-Item .env.example .env`. Nếu cần mở qua hostname khác, cập nhật `FRONTEND_URL` và `CORS_ORIGINS` của backend cho đúng địa chỉ trình duyệt.

Có thể sao chép `frontend/.env.example` thành `.env.local`; `VITE_API_URL=/api` là cấu hình cùng nguồn được khuyến nghị. Khi dùng API khác nguồn, đặt URL đầy đủ kết thúc bằng `/api`, cấu hình CORS và build lại. Không đặt bí mật trong biến `VITE_*`.

## Build và triển khai

```sh
npm run lint
npm run build
```

Đưa nội dung `dist/` lên máy chủ web. Cấu hình SPA fallback về `index.html` cho đường dẫn giao diện; chuyển `/api/` và `/uploads/` tới Express. Không chuyển API trả lỗi thành HTML. Backend dùng `FRONTEND_URL` cho liên kết khôi phục mật khẩu; đặt HTTPS và hostname thật khi triển khai. Biểu mẫu nhúng dùng đường dẫn `/public/lead-forms/:key` của frontend; trang này truy cập được khi chưa đăng nhập.

Vite dev proxy chỉ dùng cho phát triển. `vite preview` chỉ xem build, không thay thế cấu hình reverse proxy khi triển khai.

## Phân quyền

- `/auth/me` cung cấp vai trò, grants và phạm vi cây nhóm từ server. Không dùng `role_id` số cố định hoặc tin vai trò được sửa trong localStorage.
- Kiểm soát menu, route, nút và từng bản ghi. Quyền xem và quyền sửa được hợp nhất riêng khi có nhiều vai trò.
- Giá vốn chỉ Director xem/sửa; Admin quản trị tài khoản; Director đọc danh sách tài khoản/nhật ký/ma trận.
- Marketing không được chuyển lead thành cơ hội nếu không có thêm vai trò cho phép ghi cơ hội. Kế toán không thấy lead hoặc trình ghi hoạt động.
- Server vẫn kiểm tra quyền ở mọi yêu cầu, kể cả export và tải tệp. Không thể mở rộng quyền bằng cách hiện lại nút trong trình duyệt.
- Bản nháp biểu mẫu/ghi chú lưu trong sessionStorage, tách theo tài khoản và bản ghi. Hết phiên đưa về đăng nhập rồi quay lại công việc đang làm.

Các tệp tên cũ như `CustomerManagement.jsx`, `PipelineManagement.jsx` chuyển tiếp tới màn hình được duy trì trong `src/screens/`, tránh hai phiên bản xử lý khác nhau. Axios dùng chung ở `src/lib/api.js`.

## Kiểm thử đầu cuối bằng MySQL thật

Không chạy E2E trên database ứng dụng. Bộ kiểm thử chỉ cho phép tên `crm_test_...` kèm cờ cho phép reset. Tất cả fixture nằm trong database kiểm thử dùng một lần; không có mock API hoặc intercept dữ liệu trả về.

Cài backend và frontend bằng `npm ci`, cài Chromium (`npx playwright install chromium`), cấp quyền tạo database kiểm thử cho tài khoản MySQL. Ví dụ Bash:

```sh
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=root DB_PASSWORD='<mật khẩu MySQL kiểm thử>' DB_NAME=crm_test_ui ALLOW_DB_TEST_RESET=1 npm run test:e2e
```

Ví dụ PowerShell (chạy trong `frontend`):

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_USER='root'
$env:DB_PASSWORD='<mật khẩu MySQL kiểm thử>'
$env:DB_NAME='crm_test_ui'
$env:ALLOW_DB_TEST_RESET='1'
npm run test:e2e
```

Test tự chạy backend cổng 5002 và Vite cổng 5174, tắt worker/SMTP ngoài, tạo dữ liệu QA rồi đóng server. Cần hai cổng này còn trống. Có thể đặt `CHROMIUM_PATH` tới Chromium cài sẵn. Không có kết nối tới MySQL sản xuất được mặc định sử dụng cho E2E.

Đối chiếu yêu cầu trong [docs/AC-MATRIX.md](docs/AC-MATRIX.md) và kết quả thực chạy trong [docs/VALIDATION.md](docs/VALIDATION.md). Nghiệp vụ lịch Sprint 6, duyệt hợp đồng Sprint 7 và các sprint sau không được tuyên bố đã hoàn thành bởi màn hình báo giá nháp.
