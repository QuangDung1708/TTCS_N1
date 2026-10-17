# Tải frontend và backend Sprint 1–5

[Tải gói source đầy đủ](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [Mở trang tệp trên GitHub](https://github.com/QuangDung1708/TTCS_N1/blob/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [SHA-256](TTCS_N1-fullstack.zip.sha256)

Nếu trình duyệt mở trang tệp, chọn **Download raw file**. Gói khoảng 800 KiB, chứa hai thư mục `frontend`/`backend`, lockfile, migration, test và tài liệu. Không kèm `.env`, node_modules, coverage, báo cáo trình duyệt hoặc tệp người dùng tải lên. Ứng dụng không seed dữ liệu nghiệp vụ mẫu; fixture QA chỉ chạy trong database kiểm thử có cờ reset rõ ràng.

Giải nén vào thư mục mới và làm theo [hướng dẫn chạy](../frontend/README.md). Cần Node.js 24 LTS và MySQL 8. Cấu hình database hiện có của bạn trong `backend/.env`; giữ bản sao cấu hình và dữ liệu đang có. Dùng **backend trong cùng gói fullstack** với frontend này để khớp các API phân quyền, thông báo và cơ cấu tổ chức mới.

Source ứng dụng: `af485f6bf29de3782db175e3532c4fafc83df9a7`. `DELIVERY.json` bên trong ZIP liệt kê commit nguồn và SHA-256 của từng tệp. Gói đã kiểm tra CRC, đối chiếu byte từng tệp với source, và lint/build thành công từ mã giải nén.

Kiểm chứng cục bộ: **23/23 kiểm thử trình duyệt** qua API/MySQL thật, **89/89 kiểm thử backend**, lint/build thành công. Xem [kết quả và giới hạn xác minh](../frontend/docs/VALIDATION.md), [đối chiếu 151 AC](../frontend/docs/AC-MATRIX.md), [ảnh desktop](../frontend/docs/images/customers-desktop.png) và [ảnh 360px](../frontend/docs/images/customers-mobile-360.png).

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
