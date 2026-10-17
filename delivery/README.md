# Tải frontend và backend Sprint 1–5

[Tải gói source đầy đủ](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [Mở trang tệp trên GitHub](https://github.com/QuangDung1708/TTCS_N1/blob/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [SHA-256](TTCS_N1-fullstack.zip.sha256)

Nếu trình duyệt mở trang tệp, chọn **Download raw file**. Gói khoảng 793 KiB, chứa hai thư mục `frontend`/`backend`, lockfile, migration, test và tài liệu. Không kèm `.env`, node_modules, coverage, báo cáo trình duyệt hoặc tệp người dùng tải lên. Ứng dụng không seed dữ liệu nghiệp vụ mẫu; fixture QA chỉ chạy trong database kiểm thử có cờ reset rõ ràng.

Giải nén vào thư mục mới và làm theo [hướng dẫn chạy](../frontend/README.md). Cần Node.js 24 LTS và MySQL 8. Cấu hình database hiện có của bạn trong `backend/.env`; giữ bản sao cấu hình và dữ liệu đang có. Dùng **backend trong cùng gói fullstack** với frontend này để khớp các API phân quyền, thông báo và cơ cấu tổ chức mới.

Source ứng dụng: `9a98dd58d8f3ee0bd48d22a063ccd43fa61b6c44`. `DELIVERY.json` bên trong ZIP liệt kê commit nguồn và SHA-256 của từng tệp. Gói đã kiểm tra CRC, đối chiếu byte từng tệp với source, và lint/build thành công từ mã giải nén.

Kiểm chứng cục bộ: **23/23 kiểm thử trình duyệt** qua API/MySQL thật, **86/86 kiểm thử backend**, lint/build thành công. Xem [kết quả và giới hạn xác minh](../frontend/docs/VALIDATION.md), [đối chiếu 151 AC](../frontend/docs/AC-MATRIX.md), [ảnh desktop](../frontend/docs/images/customers-desktop.png) và [ảnh 360px](../frontend/docs/images/customers-mobile-360.png).

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
