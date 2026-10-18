# Danh sách người phụ trách trên MariaDB 10.4

Trong đợt kiểm thử dashboard và phân quyền ngày 18-10-2026, toàn bộ backend trên MariaDB 10.4.34 phát hiện `/api/customers/users-list` trả lỗi `FUNCTION JSON_ARRAYAGG does not exist`. MySQL 8.4 hỗ trợ hàm này, MariaDB 10.4 chưa hỗ trợ. Danh sách này phục vụ bộ lọc và chọn người phụ trách trên giao diện.

Bản sửa dùng một truy vấn LEFT JOIN `user_roles`, giữ nguyên bộ lọc tài khoản hoạt động và phạm vi quyền từ `scope()`. Node.js gom các dòng thành một người dùng với mảng `roles`, không dùng dữ liệu dự phòng, không GROUP_CONCAT, không gọi một truy vấn cho mỗi người dùng. Tài khoản nhiều vai trò không xuất hiện lặp trong danh sách. Không đổi quyền đọc/ghi hoặc dữ liệu nhóm.

## Áp dụng

1. Dừng backend bằng Ctrl+C.
2. Giải nén `TTCS_N1-directory-fix.zip`, chép đè `backend/src/routes/customerRoutes.js` vào backend đang dùng.
3. Giữ nguyên `.env`, chạy lại `npm run dev`, rồi tải lại trình duyệt.

Không cần npm install, migration hoặc tạo lại database cho bản sửa truy vấn này. Bản fullstack tải mới cũng có bản sửa. Các bản vá database trước vẫn được giữ nguyên.

Kiểm thử hợp đồng API xác nhận HTTP 200, `roles` luôn là mảng chứa các vai trò thực, mỗi tài khoản xuất hiện một lần, Team Lead thấy nhóm con và không thấy nhóm khác; response không chứa mật khẩu. Xem kết quả chạy đầy đủ và giới hạn xác minh trong `frontend/docs/VALIDATION.md`.
