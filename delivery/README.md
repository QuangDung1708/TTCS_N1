# Tải frontend và backend Sprint 1–5

[Tải gói source đầy đủ](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [Mở trang tệp trên GitHub](https://github.com/QuangDung1708/TTCS_N1/blob/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [SHA-256](TTCS_N1-fullstack.zip.sha256)

Nếu trình duyệt mở trang tệp, chọn **Download raw file**. Gói khoảng 821 KiB, chứa hai thư mục `frontend`/`backend`, lockfile, migration, test và tài liệu. Không kèm `.env`, node_modules, coverage, báo cáo trình duyệt hoặc tệp người dùng tải lên. Ứng dụng không seed dữ liệu nghiệp vụ mẫu; fixture QA chỉ chạy trong database kiểm thử có cờ reset rõ ràng.

Giải nén vào thư mục mới và làm theo [hướng dẫn chạy](../frontend/README.md). Cần Node.js 24 LTS và MySQL 8. Cấu hình database hiện có của bạn trong `backend/.env`; giữ bản sao cấu hình và dữ liệu đang có. Dùng **backend trong cùng gói fullstack** với frontend này để khớp các API phân quyền, thông báo và cơ cấu tổ chức mới.

Source ứng dụng: `9860a2cd176769b7c1f5bcc7e12b83369f92a44d`. `DELIVERY.json` bên trong ZIP liệt kê commit nguồn và SHA-256 của từng tệp. Gói đã kiểm tra CRC, đối chiếu byte từng tệp với source, và lint/build thành công từ mã giải nén.

Kiểm chứng cục bộ: **23/23 kiểm thử trình duyệt** qua API/MySQL thật, **95/95 kiểm thử backend**, lint/build thành công. Xem [kết quả và giới hạn xác minh](../frontend/docs/VALIDATION.md), [đối chiếu 151 AC](../frontend/docs/AC-MATRIX.md), [ảnh desktop](../frontend/docs/images/customers-desktop.png) và [ảnh 360px](../frontend/docs/images/customers-mobile-360.png).

## Bản cập nhật UI và dữ liệu kiểm thử

[Tải ZIP để chép đè vào folder đang dùng](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-ui-data-fix.zip). Có hai thư mục backend/frontend và hướng dẫn UPDATE-UI-AND-DATA.md. Dừng server, chép hai thư mục vào TTCS_N1, giữ .env/node_modules/uploads/database. Không cần migration hay dependency mới. Chạy backend `npm run data:examples` nếu muốn tạo dữ liệu kiểm thử; sau đó khởi động lại backend/frontend và Ctrl+F5.

Sửa cách mở avatar/chuông bằng nút có trạng thái, menu Hồ sơ/Đổi mật khẩu/Đăng xuất, popup lịch và định dạng ngày Việt Nam, định dạng tiền nhóm nghìn, kiểm tra thứ tự ngày chiến dịch, nhật ký tiếng Việt thay JSON, motion ngắn và reduced-motion. Kiểm chứng: **27/27 ca trình duyệt trên MariaDB 10.4**, lint frontend/backend và frontend build đạt; CLI tạo dữ liệu, đúng vai trò/liên kết/phân quyền và chạy lại không nhân đôi đã kiểm tra trên database QA riêng. Chưa truy cập máy người dùng.

Lệnh data:examples tạo 8 tài khoản, 2 nhóm, 4 khách hàng và liên hệ, 2 sản phẩm, 3 lead, 2 cơ hội và 1 chiến dịch trong MySQL. Đây là ví dụ kiểm thử có tiền tố KT, không phải danh tính đã xác minh. Mật khẩu ngẫu nhiên được ghi vào tệp riêng tư trên máy chạy lệnh, không kèm trong ZIP. Xem [hướng dẫn dữ liệu](../backend/docs/EXAMPLE-DATA.md).

## Bản vá danh sách người phụ trách — sau kiểm thử dashboard

[Tải bản vá một tệp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-directory-fix.zip). Sửa `/api/customers/users-list` trên MariaDB 10.4 do chưa có JSON_ARRAYAGG. Dừng backend, chép đè `backend/src/routes/customerRoutes.js`, chạy lại `npm run dev` và tải lại trình duyệt. Không chạy migration, không tạo lại database hoặc thay `.env`.

Bản sửa lấy vai trò bằng JOIN có cùng scope, trả mỗi người dùng một lần với mảng roles thực từ database. Kiểm chứng sau sửa: **95/95 test backend trên MySQL 8.4**, **95/95 test backend trên MariaDB 10.4**, **23/23 test trình duyệt trên MariaDB 10.4**, lint đạt. 23/23 test trình duyệt MySQL 8.4 cũng đạt ở đầu đợt kiểm thử, trước thay truy vấn directory. Smoke test database mới trên cả hai engine xác nhận bootstrap Admin và dashboard zero, không seed dữ liệu nghiệp vụ. Chưa thao tác database/trình duyệt trên máy người dùng. [Chi tiết](../backend/docs/DIRECTORY-COMPATIBILITY.md).

## Bản vá database tổng hợp trước đó

[Tải bản vá tổng hợp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-database-fix.zip). Gồm bản sửa worker, ánh xạ nhóm cũ và đồng bộ kiểu cột FK theo ID thực tế. Dừng API/worker, giữ bản sao lưu, chép thư mục `backend` của bản vá vào backend đang dùng (5 tệp source). Giữ `.env`, chạy `npm run migrate`; chỉ khi thành công mới `npm run dev`. Không cần npm install lại.

Kiểm chứng: **95/95 test backend MySQL 8.4**, **38/38 test liên quan MariaDB 10.4**, backend lint đạt. Có ca tái hiện lỗi FK `lead_activities` trước bản sửa với INT UNSIGNED/BIGINT UNSIGNED; bảo toàn lịch sử, NULL/default/comment; từ chối thu hẹp cột có dữ liệu hoặc chuyển số âm sang UNSIGNED; kiểm tra engine và bản ghi mồ côi. Bản fullstack phía trên đã cập nhật. Chưa truy cập database người dùng, chưa chạy lại E2E frontend cho bản sửa này. Xem [FOREIGN-KEY-MIGRATION.md](../backend/docs/FOREIGN-KEY-MIGRATION.md).

## Bản vá migration nhóm trùng ID

[Tải bản vá migration](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-migration-fix.zip). Dành cho lỗi `Conflicting legacy group ID 2`. Dừng API/worker, sao lưu database, thay `backend/sql/migrate.js` và thêm `backend/sql/reconcile-legacy-groups.js`. Giữ `.env` và bản vá worker. Chạy `npm run migrate`; chỉ khi thành công mới `npm run dev`. Không xóa bảng hoặc sửa ID bằng tay.

Giữ nhóm hiện tại, tạo ID riêng cho nhóm cũ bị trùng và chuyển thành viên theo FK xác định nguồn. Có checkpoint khi chạy lại, dừng nếu ánh xạ không rõ ràng. Kiểm chứng: **89/89 test backend MySQL 8.4**, **32/32 test liên quan MariaDB 10.4**, lint đạt; chưa truy cập database người dùng. Chi tiết: [GROUP-MIGRATION.md](../backend/docs/GROUP-MIGRATION.md). Gói fullstack phía trên chứa cả bản vá migration và worker.

## Bản vá worker XAMPP / MariaDB 10.4

[Tải bản vá hai tệp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-worker-fix.zip). Dừng backend, giải nén và chép đè `backend/src/core/leads.js`, `backend/src/jobs/worker.js` vào backend hiện tại; chạy lại `npm run dev`. Không thay `.env`, không cần cài npm hoặc migration riêng cho bản vá. Gói fullstack phía trên cũng đã cập nhật.

Đã tái hiện lỗi cú pháp `SKIP LOCKED` trên MariaDB 10.4.34 và sửa worker dùng khóa tương thích. Kiểm chứng bản sửa: **86/86 test backend MySQL 8.4**, **28/28 test liên quan MariaDB 10.4**, backend lint thành công. Gửi SMTP cục bộ đồng thời hai worker không gửi trùng bản ghi; chưa kiểm chứng Gmail ngoài. Frontend giữ nguyên; 23/23 test trình duyệt là kết quả tại mốc frontend trước bản vá này. Chi tiết: [WORKER-COMPATIBILITY.md](../backend/docs/WORKER-COMPATIBILITY.md).

## Gói backend trước khi làm frontend

Gói bên dưới giữ lại mốc bàn giao backend cũ. Khi chạy giao diện mới, dùng gói fullstack phía trên.


Tệp `TTCS_N1-backend.zip` chứa mã backend, migration MySQL, test và tài liệu. Không chứa `.env`, node_modules, uploads hoặc dữ liệu kinh doanh mẫu.

Trên GitHub, mở tệp ZIP rồi chọn **Download raw file** để tải. Giải nén vào thư mục mới, mở terminal trong thư mục `backend`.

Yêu cầu: Node.js >=22.13 và MySQL 8.x (đã kiểm thử MySQL 8.4).

1. Chạy `npm ci`.
2. Nếu chưa có `.env`, tạo từ `.env.example`; cấu hình kết nối MySQL và JWT_SECRET ngẫu nhiên ít nhất 32 ký tự. Không chép đè `.env` hiện có.
3. Sao lưu và thử migration trên bản sao database hiện có trước: `npm run migrate`.
4. Chạy `npm start`.

Database mới không có tài khoản mặc định. Xem `backend/README.md` để tạo quản trị viên đầu tiên bằng thông tin của bạn, và xem `backend/docs/API.md` để dùng API. Các giá trị DB_USER/DB_PASSWORD/DB_NAME phải khớp MySQL trên máy của bạn. SMTP cần được cấu hình riêng nếu muốn nhận email kích hoạt/đặt lại mật khẩu.

Đây là gói backend tại mốc trước khi triển khai frontend.
