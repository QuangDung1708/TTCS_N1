# Rà dropdown, dữ liệu liên kết và email

> Bản cây tổ chức tiếp theo chỉ dùng một cây nhóm/phòng ban. Màn cây công ty cũ không còn được mount; quan hệ công ty mẹ/con sửa trong form khách hàng. Số 78 bên dưới là phạm vi đợt rà dropdown trước đó.

## Phạm vi bộ chọn

Rà tĩnh 78 điểm dùng Select/HierarchySelect trong giao diện đang chạy (không tính bộ chọn nội bộ của thư viện như số dòng phân trang). Tất cả đi qua cùng nút mở danh sách và ô tìm kiếm bên trong popup. Không còn input chỉnh giá trị trực tiếp trên trigger; chỉ chọn giá trị hợp lệ, kể cả khi tìm không ra. Mũi tên và cả phần giá trị đều bấm được. Popup đặt trực tiếp ở body, căn theo nút và viewport, theo cuộn/resize, không bị modal cắt. Hỗ trợ tìm không dấu/hoa thường, bàn phím, Escape, xóa, nhiều lựa chọn, disabled và trạng thái loading/empty.

| Màn hình/thành phần | Điểm dùng | Nguồn lựa chọn |
| --- | ---: | --- |
| Khách hàng & liên hệ | 19 | Ngành/quy mô/khu vực, nhân sự, doanh nghiệp, trường tùy chỉnh từ DB; trạng thái/vai trò mua hàng là giá trị hệ thống hợp lệ |
| Lead & phân bổ | 21 | Nguồn, chiến dịch, ngành/quy mô/khu vực, nhóm/nhân sự, khách hàng, giai đoạn từ DB; trạng thái/phân loại là enum |
| Cơ hội & pipeline | 16 | Khách hàng/liên hệ, nguồn, chiến dịch, giai đoạn, nhân sự, sản phẩm, lý do/đối thủ, trường tùy chỉnh từ DB |
| Báo giá | 1 | Cơ hội được xem trong DB |
| Danh mục/sản phẩm/trường tùy chỉnh | 4 | Loại sản phẩm/đối tượng/kiểu trường/điều kiện là enum hợp lệ |
| Người dùng | 6 | Vai trò, nhóm, nhân sự từ API/DB, trạng thái là enum |
| Cơ cấu tổ chức | 4 | Nhóm cha, trưởng nhóm, khu vực, nhân sự từ DB |
| Công ty mẹ/con | 1 | Doanh nghiệp trong phạm vi, bỏ chính nó và nhánh con |
| Nhật ký | 3 | Người thực hiện, loại đối tượng và hành động |
| Trường tùy chỉnh dùng chung, nhập Excel, bộ lọc đã lưu | 3 | Giá trị tùy chỉnh/bộ lọc của tài khoản từ DB; xử lý trùng Excel là enum |

Cây công ty/nhóm trên bảng giữ phân cấp. Bộ chọn cha hiển thị danh sách thụt cấp, tìm theo cả tên và đường dẫn; vẫn loại nhánh tạo vòng lặp, backend kiểm tra độc lập.

Người liên hệ chính chỉ bật sau khi chọn khách hàng và chỉ lấy liên hệ của khách hàng đó. Không có liên hệ thì thông báo thêm trong hồ sơ, không tự bịa người liên hệ. Các danh sách phụ thuộc quyền, bộ lọc riêng chưa lưu hoặc khách hàng chưa có liên hệ có thể rỗng hợp lệ; UI hiển thị rõ trạng thái.

## Nạp dữ liệu

`CAP-NHAT-VA-NAP-DU-LIEU.cmd` cài dependency cả hai phía, hỏi email tài khoản đang test rồi gọi `data:examples` vào DB trong `.env`. Không reset DB. Dùng bản ghi KT lưu thật qua API, có liên kết và nhật ký. Dữ liệu không phải danh tính/khách hàng đã xác minh.

Bộ chung: 8 tài khoản KT, 2 nhóm có khu vực, 4 khách hàng/liên hệ, 2 sản phẩm, 3 lead, 2 cơ hội, 1 chiến dịch, 2 báo giá, danh mục chuẩn và các mục KT cho quy mô/hoạt động/khu vực/đối thủ/lý do. Nếu cung cấp email đang dùng: thêm khách hàng/liên hệ/cơ hội/báo giá thuộc tài khoản đó, thêm lead được giao khi tài khoản có Sales Rep. Giữ role/nhóm/mật khẩu và dữ liệu hiện có. Chạy lại cùng checkpoint không nhân đôi; mật khẩu mới được lưu riêng trên máy, không kèm ZIP.

Kiểm tra thực tế trên MySQL và MariaDB: bộ nạp mới, chạy lại, nâng cấp checkpoint từ script bản trước; số bản ghi và hash mật khẩu giữ nguyên khi chạy lại. Tài khoản Sales đọc được các endpoint lựa chọn và bản ghi thuộc mình qua API thật, không mở rộng scope.

## Gửi mail

Tạo user và quên mật khẩu dùng outbox; worker gửi qua SMTP thật. `mail:check` kiểm tra cấu hình, TLS và đăng nhập SMTP nhưng không gửi thư. `SMTP_USER`/`SMTP_PASS` không đủ nếu thiếu `SMTP_HOST`. Xem hướng dẫn `.env` trong UPDATE-UI-AND-DATA.md.

Admin thấy cấu hình thiếu, pending/sent/failed, mã lỗi ở Quản trị người dùng; API `/admin/mail/status` không trả recipient/body/token/credentials, không cho role khác xem. SMTP đã nhận không đồng nghĩa Inbox đã nhận. Job nghiệp vụ thất bại không chặn mail. SMTP từ chối giữ thư để retry; chỉ SMTP chấp nhận mới đánh dấu sent và xóa nội dung bí mật.

Kiểm chứng socket SMTP cục bộ: thư tạo user chứa mật khẩu tạm đăng nhập được và buộc đổi lần đầu; token từ thư reset đổi được mật khẩu, không dùng lại; CLI verify không gửi mail; từ chối recipient rồi retry, và gửi khi business job lỗi. Chưa truy cập SMTP/Gmail/hộp thư thật của người dùng. Tệp CMD dùng lệnh Windows, chưa chạy trực tiếp trên Windows trong môi trường Linux này; các lệnh Node/npm bên trong đã kiểm tra.
