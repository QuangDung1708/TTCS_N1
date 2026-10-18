# API backend

Tiền tố `/api`. JSON yêu cầu dùng `Content-Type: application/json`. API được bảo vệ cần `Authorization: Bearer <token>` từ đăng nhập. ID phải là số nguyên dương, ngày dùng `YYYY-MM-DD`, dữ liệu thời gian lưu UTC. Lỗi có `message` tiếng Việt; 400 dữ liệu sai, 401 phiên không hợp lệ, 403 thiếu quyền/phạm vi, 409 xung đột, 422 thiếu điều kiện nghiệp vụ, 429 quá tần suất.

| Nhóm             | Đường dẫn chính                                                                                         | Hành vi                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sức khỏe         | `GET /health`                                                                                           | Kết nối database, migration và trạng thái cấu hình SMTP                                                                                  |
| Xác thực         | `POST /auth/login`, `/logout`, `/refresh`; `GET /auth/me`                                               | Phiên server, vai trò/nhóm/quyền theo module                                                                                             |
| Mật khẩu         | `POST /auth/forgot-password`, `/reset-password`; `PUT /auth/change-password`                            | Token 30 phút, dùng một lần; thu hồi phiên                                                                                               |
| Đăng ký tùy chọn | `POST /auth/send-register-otp`, `/auth/register`                                                        | Chỉ bật qua cấu hình; OTP 10 phút, tối đa 5 lần thử                                                                                      |
| Người dùng       | `GET/POST /users`; `PUT /users/:id`, `/:id/role`, `/:id/status`                                         | Admin ghi; Admin/Director đọc; nhiều vai trò, tìm kiếm/phân trang, khóa có bàn giao                                                                              |
| Hồ sơ            | `GET/PUT /users/profile`; `POST /users/profile/avatar`                                                  | Tự sửa tên/điện thoại/chữ ký; ảnh multipart `avatar`                                                                                     |
| Tổ chức          | `/organization/tree`, `/regions`, `/groups`, `/groups/:id/assign-member`                                | Cây nhóm, khu vực, trưởng nhóm và nhân viên                                                                                              |
| Danh mục         | `/products`, `/categories`, `/pipeline-stages`, `/deal-reasons`, `/competitors`, `/custom-fields`       | Đọc theo vai trò; ghi cấu hình theo ma trận; trường tùy chỉnh chỉ Admin sửa                                                              |
| Khách hàng       | `GET/POST /customers`; `GET/PUT/DELETE /customers/:id`                                                  | Hồ sơ doanh nghiệp, MST duy nhất, quan hệ mẹ/con, kiểm tra chủ sở hữu                                                                    |
| Hồ sơ 360        | `GET /customers/:id/360`                                                                                | Liên hệ, cơ hội, timeline lưu thật, tệp, hỗ trợ, tổng giá trị                                                                            |
| Liên hệ          | `GET/POST /contacts/customer/:customerId`; `PUT /contacts/:id`, `/:id/transfer`; `DELETE /contacts/:id` | Đầu mối chính duy nhất, chuyển công ty giữ lịch sử                                                                                       |
| Hỗ trợ           | `POST /customers/tickets`; `PUT /customers/tickets/:ticketId`                                           | Ưu tiên, trạng thái, người xử lý, cờ rủi ro và thông báo                                                                                 |
| Chăm sóc         | `GET /customers/care-list?days=N`; `PUT /customers/:id/contacted`                                       | Dữ liệu tương tác và giá trị hợp đồng lưu trong MySQL                                                                                    |
| Gộp khách hàng   | `GET /customers/detect-duplicates`; `POST /customers/merge`                                             | So sánh và gộp theo phạm vi; chỉ Team Lead/Director/Admin                                                                                |
| Tệp              | `POST /customers/:id/files`; `GET /customers/:id/files/:fileId`                                         | Multipart `file`, tối đa 10 MiB; tải xuống có kiểm tra quyền                                                                             |
| Lead             | `GET/POST /leads`; `GET/PUT /leads/:id`                                                                 | Bắt buộc nguồn, lọc trạng thái/nguồn/điểm/chủ sở hữu/ngày                                                                                |
| Phân bổ          | `POST /leads/:id/assign`, `/:id/accept`, `/:id/reject`                                                  | Phân tay, nhận/từ chối có lý do, SLA                                                                                                     |
| Chuyển đổi       | `POST /leads/:id/convert`                                                                               | Transaction tạo/gắn khách hàng, liên hệ, cơ hội; giữ hoạt động                                                                           |
| Trùng lead       | `GET /leads/duplicates`; `POST /leads/merge`                                                            | So khớp email, điện thoại, công ty và gợi ý khách hàng hiện có                                                                           |
| Quy tắc          | `GET/PUT /leads/scoring-rules`, `/leads/assignment-rules`                                               | Director/Admin cấu hình tiêu chí/ngưỡng, ưu tiên và round-robin                                                                          |
| Biểu mẫu         | `GET/POST /leads/forms`; `GET/POST /public/lead-forms/:key`                                             | Mã nhúng iframe, nguồn cố định, chữ ký thời gian, honeypot, rate limit theo IP                                                           |
| Chiến dịch       | `GET/POST /campaigns`; `PUT /campaigns/:id`                                                             | Ngân sách/thời gian/kênh, liên kết lead và cơ hội, doanh thu chốt                                                                        |
| Cơ hội           | `GET/POST /deals`; `GET/PUT /deals/:id`                                                                 | Ngày chốt, liên hệ chính, nguồn, xác suất và ghi chú                                                                                     |
| Pipeline         | `GET /deals/kanban`; `PUT /deals/:id/stage`                                                             | Cột/số lượng/tổng giá trị; điều kiện rời bước kiểm tra trên giao dịch ghi                                                                |
| Sản phẩm cơ hội  | `PUT /deals/:id/items`                                                                                  | `{items:[{product_id,quantity,unit_price?,periods?,period_months?}]}`; giá mặc định theo danh mục, MySQL tính tổng                       |
| Đóng/mở          | `POST /deals/:id/close`, `/:id/reopen`                                                                  | Won cần giá trị/ngày ký/lý do; Lost cần lý do, đối thủ nếu có; mở lại cần Team Lead trở lên và lý do                                     |
| Dự báo           | `GET /deals/forecast`; `POST /targets`                                                                  | Giá trị × xác suất giai đoạn; tháng này/tháng sau/quý này, theo người/nhóm, so với chỉ tiêu và thực tế                                   |
| Can thiệp        | `GET /deals/flagged`; `POST /deals/reassign`                                                            | Cờ đình trệ/quá hạn; đổi chủ sở hữu hàng loạt có lý do, transaction và audit                                                             |
| Hoạt động        | `GET/POST /activities`; `GET /activities/:id`                                                           | Phạm vi theo khách hàng/cơ hội; hỗ trợ điều kiện cuộc gặp ở pipeline                                                                     |
| Báo giá nháp     | `GET/POST /quotes`; `GET/PUT/DELETE /quotes/:id`                                                        | Phần hỗ trợ AC phân quyền Sprint 1: dữ liệu từ cơ hội/sản phẩm, chiết khấu và audit. Chưa phải toàn bộ quy trình duyệt/hợp đồng Sprint 7 |
| Nhật ký          | `GET /audit-logs`                                                                                       | Admin/Director; lọc `user_id`, `entity_type`, `action_type`, `from`, `to`                                                                |
| Thông báo        | `GET /notifications`; `PUT /notifications/:id/read`                                                     | Chỉ thông báo của người đăng nhập                                                                                                        |
| Dashboard        | `GET /dashboard/stats`                                                                                  | Dữ liệu SQL theo phạm vi báo cáo; giữ các khóa `kpi`, `funnel`, `recentDeals`                                                            |
| Thiết lập        | `GET/PUT /settings`                                                                                     | Director/Admin; `care_days`                                                                                                              |

## Import/export và bộ lọc

`users`, `customers`, `leads` hỗ trợ `GET /<nhóm>/import/template`, `POST /<nhóm>/import/preview`, `POST /<nhóm>/import/execute`. Gửi XLSX multipart `file`, hoặc JSON `{rows:[...]}`. Tối đa 1000 dòng/tệp 5 MiB. Preview rollback mọi dữ liệu; execute báo số nhập/bỏ qua và lỗi từng dòng. Khách hàng trùng MST cần `duplicate_action: "update"` để cập nhật trong phạm vi; mặc định báo trùng/bỏ qua.

Khách hàng, lead, cơ hội, hoạt động và báo giá có `GET /<nhóm>/export` trả XLSX theo phạm vi người gọi. Trường tùy chỉnh của khách hàng/cơ hội được đưa thành cột trong file xuất. Khách hàng và lead có `/saved-filters` GET/POST và DELETE `/:id`; bộ lọc thuộc riêng từng người.

Khách hàng lọc bằng `status`, `industry`, `company_size`, `region`, `owner_id`, `search`; cơ hội lọc bằng `owner_id`, `group_id`, `status`, `stage_id`, `customer_id`, `from`, `to`, `search`. `custom_fields` là JSON đã URL-encode, ví dụ đối tượng `{budget: 1000000}`. Không có bộ lọc nào mở rộng phạm vi được cấp.

## Các payload quan trọng

- `/users`: `email`, `full_name`, `roles` là mảng tên chuẩn, `group_id`, `phone`. Không trả mật khẩu tạm qua API; gửi trong thư kích hoạt. `role_code` một vai trò vẫn được hỗ trợ cho giao diện cũ.
- `/users/:id/status`: `status: "inactive"`, `transfer_to` là ID người tiếp nhận. Các khóa cũ `receiver_id`, `handover_user_id` được hỗ trợ. Mở lại tài khoản dùng `status: "active"`.
- `/leads/:id/convert`: tùy chọn `customer_id` để gắn với khách hiện có; hoặc `customer` cho các thuộc tính bổ sung. `deal` bắt buộc có `stage_id`, `expected_close_date`; dữ liệu liên hệ/nguồn/chiến dịch chuyển từ lead. Gọi lại lead đã chuyển đổi trả 409.
- `/deals/:id/stage`: `stage_id`, tùy chọn `override_reason` chỉ Team Lead/Director/Admin được dùng. Tên/mã giai đoạn cũ qua `stage` vẫn được hỗ trợ. Đóng qua đường cũ `stage: "Won"/"Lost"` dùng cùng kiểm tra với `/close`.
- `/deals/:id/close`: `status: "WON"`, `actual_amount`, `signed_date`, `win_reason_id`; hoặc `status: "LOST"`, `loss_reason_id`, `competitor_id` nếu có, `loss_note`.
- `/deals/reassign`: `ids` là mảng ID, `owner_id`, `reason`. Tất cả thành công hoặc rollback toàn bộ.

Các URL tương thích như `/users/avatar`, `/users/:id/lock`, `/groups`, `/deals/stages`, `/deals/reasons`, `/deals/competitors` được giữ qua cùng lớp kiểm tra quyền. Frontend cũ dùng JWT đời trước phải đăng nhập lại, và biểu mẫu tạo cơ hội phải bổ sung các trường bắt buộc theo AC.

## Dữ liệu phục vụ giao diện

`GET /auth/options` công khai chỉ trả cờ tự đăng ký. `GET /auth/me` trả grants theo module, managed_group_ids/managed_user_ids từ cây nhóm và danh tính đang có hiệu lực; frontend không tự quyết định vai trò. `GET /auth/role-matrix` chỉ Admin/Director đọc ma trận server.

`GET /public/lead-forms/:key/meta` trả tên biểu mẫu, timestamp và chữ ký chống spam (no-store), dùng cùng POST công khai với biểu mẫu HTML tương thích cũ. Nguồn/campaign được lấy từ cấu hình biểu mẫu trên server.

Thông báo cá nhân đòi quyền đọc AUTO; thao tác đánh dấu đã đọc không cấp quyền chỉnh cấu hình tự động hóa. Accountant không truy cập cả URL thông báo chuẩn và URL tương thích cũ.

## Bổ sung 18/10/2026

- `GET /campaigns/options`: các vai trò có quyền đọc LEAD lấy `{id,name}` để chọn chiến dịch; không trả ngân sách, số liệu hoặc quyền quản lý chiến dịch.
- `POST/PUT /leads[/:id]`: `owner_id` tùy chọn cho Admin/Director/Team Lead/Marketing. Thay người phụ trách dùng cùng giao dịch lưu; áp dụng scope, Sales Rep hoạt động, cập nhật nhóm/SLA/thông báo. `assignment_reason`, `sla_minutes` là tùy chọn. Sales không tự chuyển cho người khác.
- `POST /categories`: `code` có thể bỏ trống để sinh mã duy nhất; loại và tên vẫn bắt buộc.
- Import nhận tiêu đề kỹ thuật cũ hoặc tiếng Việt từ mẫu mới. Customer import ánh xạ các cột mã trường tùy chỉnh đang hoạt động vào `custom_fields` và kiểm tra kiểu/bắt buộc.
- Theo yêu cầu người dùng ngày 18/10/2026, Admin có toàn quyền bao gồm xem/sửa giá vốn và đọc giá vốn trong audit; Director cũng có quyền giá vốn. Các vai trò khác vẫn bị ẩn từ API. Quy tắc không tự đổi email/nhóm/vai trò trong `/users/profile` vẫn giữ; Admin dùng API quản trị người dùng để sửa quyền.
- Email tạo user chứa tài khoản, mật khẩu tạm hợp lệ từ đầu vào (hoặc sinh ngẫu nhiên nếu để trống) và liên kết đặt mật khẩu; email reset có token 30 phút, một lần. Worker gửi bản text/HTML qua SMTP đã cấu hình, xóa nội dung chứa bí mật trong outbox sau khi gửi thành công. Các đường gửi mail cũ không được ứng dụng hiện tại gọi.

### Mẫu user và dữ liệu chọn (bổ sung 18/10)

`GET /users/import/template` trả XLSX sáu cột: `Tên`, `Email`, `Mật khẩu tạm thời`, `Vai trò (RBAC)`, `Nhóm kinh doanh`, `Số điện thoại`. Nhận alias `full_name`, `email`, `temporary_password`, `role_code`, `group_name`, `phone`; `group_id` vẫn được hỗ trợ. `group_name` phải khớp duy nhất nhóm có sẵn, không tự tạo nhóm. `POST /users` cũng nhận `temporary_password`; nếu có phải đạt cùng quy tắc mật khẩu, nếu trống tự sinh. Không trả mật khẩu trong response, không xuất hash; thư SMTP chứa thông tin khởi tạo và yêu cầu đổi lần đầu.

Xuất khách hàng/lead/báo giá nháp trả XLSX nhị phân có tiêu đề ngay cả khi không có bản ghi. Các bộ chọn UI tìm theo tên không phân biệt dấu/hoa thường; dữ liệu lựa chọn tiếp tục do các API hiện hữu kiểm soát phạm vi và quyền. Khởi tạo danh mục chuẩn do backend thực hiện một lần hoặc CLI `npm run data:catalogs`, không có endpoint công khai để nạp dữ liệu.

### Trạng thái mail dành cho Admin

`GET /admin/mail/status` yêu cầu Admin, trả `{configured, missing, worker_enabled, queue:{pending, failed, sent, last_sent_at}, last_error}`. Không trả recipient/body, SMTP user/pass hoặc token. `sent` là SMTP đã nhận, không xác nhận Inbox. Tạo user và quên mật khẩu vẫn dùng outbox; thông báo reset chung không tiết lộ tài khoản. CLI `npm run mail:check` kiểm tra SMTP thực mà không gửi thư. Khi một business job thất bại, mail cycle vẫn được thực thi.
