# Bản vá migration nhóm cũ

Lỗi `Conflicting legacy group ID 2` xuất hiện khi `groups_table.id=2` và `groups.id=2` có tên khác nhau. Bản migration cũ dừng để tránh gắn người dùng vào nhầm nhóm. Lượt chạy đã có thể thêm bảng/cột trước khi dừng; DDL MySQL không rollback toàn bộ.

## Cập nhật

1. Dừng API và mọi tiến trình worker (Ctrl+C). Sao lưu database qua phpMyAdmin Export SQL; nên thử trên bản sao trước.
2. Giải nén `TTCS_N1-migration-fix.zip`, chép thư mục `backend/sql` của bản vá vào backend đang dùng: thay `sql/migrate.js` và thêm `sql/reconcile-legacy-groups.js`. Cần cả hai tệp.
3. Giữ nguyên `.env` và bản vá worker trước đó. Chạy `npm run migrate` trong backend.
4. Chỉ khi thấy `Migration complete; no demo data inserted.` mới chạy `npm run dev`.

Không cần cài npm lại, không xóa database và không sửa ID bằng tay. ZIP không chứa `.env`, dữ liệu mẫu hay thông tin đăng nhập. Bản vá dành cho gói fullstack đã bàn giao; gói fullstack tải mới cũng có bản sửa.

## Quy tắc bảo toàn dữ liệu

- Giữ nguyên ID/tên/nội dung nhóm đang có trong `groups`, cùng các liên kết khách hàng/cơ hội đang trỏ vào nhóm đó.
- Với nhóm cũ trùng ID nhưng khác tên, sao chép tên/mô tả sang một ID mới lớn hơn ID lớn nhất của cả hai bảng. Bảng `groups_table` cũ được giữ nguyên.
- Lưu `legacy_group_id → group_id` trong `crm_legacy_group_map`. Nếu FK chứng minh `users.group_id` trỏ vào `groups_table`, chuyển liên kết người dùng qua ánh xạ này; không đổi ID tài khoản hay vai trò. Nhóm không trùng giữ ID cũ.
- Các checkpoint DML được commit trước/sau thay FK; chạy lại không nhân đôi nhóm hoặc ánh xạ người dùng lần nữa, kể cả khi lần trước dừng sau bước bỏ FK cũ.
- Nếu người dùng có nhóm trùng ID mà không có FK xác định nguồn (và không có checkpoint trước đó), hoặc có tham chiếu `groups_table` ngoài `users.group_id`, migration dừng rõ ràng. Không tự suy đoán phạm vi phân quyền.

Kiểm thử tích hợp dùng MySQL/MariaDB thật trong database test riêng: schema cũ, trùng ID với thành viên và khách hàng, chạy lặp, tiếp tục sau checkpoint bỏ FK, và trường hợp thiếu FK mơ hồ. Không truy cập database trên máy người dùng; kết quả này không bảo đảm mọi cấu trúc tùy biến đều tương thích. Nếu có lỗi tiếp theo, giữ bản sao và trạng thái hiện tại để chẩn đoán, không xóa bảng hoặc ép tắt kiểm tra FK.
