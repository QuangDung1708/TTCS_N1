# Cập nhật theo phản hồi kiểm thử — 18/10/2026

Dừng hai terminal backend/frontend bằng Ctrl+C. Giải nén ZIP bản vá, chép hai thư mục `backend` và `frontend` vào folder `TTCS_N1` đang dùng, đồng ý thay tệp trùng. Giữ file `backend/.env`, uploads và database đang đăng nhập được. ZIP không chứa thông tin riêng tư đó.

Bản này thêm ExcelJS để tạo bảng Excel có định dạng. Chạy trong terminal backend:

```powershell
npm ci
npm run dev
```

Trong terminal frontend:

```powershell
npm run dev
```

Tải lại bằng Ctrl+F5. Không cần tạo lại DB hay chạy migration cho bản này. Không chạy lại SQL tạo database cũ. Giữ nguyên cấu hình DB/JWT/SMTP của bạn.

## Các điểm cần test

- Bấm avatar: menu Hồ sơ cá nhân / Đổi mật khẩu / Đăng xuất. Hồ sơ sửa tên, điện thoại, ảnh JPG/PNG tối đa 2 MB và chữ ký. Email, nhóm và vai trò chỉ xem trong hồ sơ; Admin quản lý tài khoản ở màn hình Quản trị người dùng.
- Bấm chuông: thông báo riêng của tài khoản. Admin/Director còn có nhật ký thao tác nhạy cảm bằng văn bản và nút xem toàn bộ nhật ký. Vai trò không có quyền nhật ký không nhận dữ liệu nhật ký từ API.
- Admin có toàn quyền các module, gồm giá vốn. Các vai trò khác giữ quyền theo User Roles. Nhật ký là lịch sử chỉ đọc cho mọi vai trò, Admin vẫn thực hiện các thao tác nghiệp vụ để tạo nhật ký mới.
- Thêm nguồn lead/ngành nghề/quy mô/loại hoạt động: tên và hướng dẫn phù hợp từng loại, mã có thể bỏ trống để hệ thống tạo duy nhất. Danh mục dùng chung được làm mới khi mở form hoặc sau khi lưu dữ liệu.
- Sales chọn được tên chiến dịch trong lead/cơ hội. API chọn chiến dịch chỉ trả mã và tên, không mở quyền xem ngân sách/báo cáo chiến dịch.
- Form lead có người phụ trách cho vai trò được phân bổ. Đổi người phụ trách cập nhật nhóm, thời hạn SLA và thông báo cùng giao dịch lưu; không được phân bổ vượt phạm vi nhóm. Form khách hàng có người phụ trách và công ty mẹ.
- Ngừng kinh doanh sản phẩm: bấm biểu tượng cấm → Xác nhận → trạng thái đổi và còn đúng sau F5; có thể kinh doanh trở lại. Báo giá cũ giữ nguyên.
- Cơ cấu tổ chức: thẻ Cây nhóm kinh doanh và Cây công ty mẹ/con. Bộ chọn cha loại chính nó và nhánh con. Cây công ty chỉ hiện dữ liệu theo phạm vi được xem.
- Mẫu Excel/xuất khách hàng và lead: có bảng, bộ lọc, cố định tiêu đề, độ rộng cột, hướng dẫn và danh mục mã cho mẫu nhập. Tiêu đề tiếng Việt; vẫn đọc được file cũ dùng `company_name`, `source_id`… Trường tùy chỉnh giữ mã trường. Nhập vẫn phải xem trước và xử lý trùng trước khi lưu.
- Tiền có dấu chấm nhóm nghìn, lịch lưu ngày thực, kiểm tra ngày kết thúc không trước ngày bắt đầu. Giữ animation và chế độ giảm chuyển động.

## Email tạo tài khoản và quên mật khẩu

Tạo người dùng bằng màn hình Admin hoặc Nhập Excel: hệ thống tạo mật khẩu tạm ngẫu nhiên, lưu hash và đưa email đăng nhập/mật khẩu tạm/liên kết đặt mật khẩu vào hàng đợi SMTP. Tài khoản phải đổi mật khẩu lần đầu. Không dùng mật khẩu chung mặc định.

Quên mật khẩu tại màn hình đăng nhập: nhập email của tài khoản đang hoạt động. Email chứa liên kết đặt mật khẩu có hiệu lực 30 phút, chỉ dùng một lần. Phản hồi UI giống nhau dù email có tồn tại hay không.

Để thư được gửi thật, `backend/.env` cần `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; `FRONTEND_URL` phải trỏ tới địa chỉ frontend bạn đang mở. Với Gmail: host `smtp.gmail.com`, port `465`, secure `true`, mật khẩu ứng dụng trong `SMTP_PASS`. Giữ worker chạy (mặc định đi kèm backend; không đặt `RUN_WORKER=false`). Worker kiểm tra khoảng 30 giây, gửi lỗi sẽ thử lại. Dòng “đã gửi yêu cầu” trên UI không chứng minh thư đã đến hộp thư.

Đã kiểm thử qua máy chủ SMTP cục bộ thật; chưa truy cập Gmail/SMTP hay hộp thư trên máy bạn. Không gửi App Password vào chat. Khi thử mail thật, dùng email bạn kiểm soát.

## Dữ liệu kiểm thử đã có

Không cần chạy lại lệnh tạo dữ liệu để sửa dropdown. Nếu muốn thêm bộ ví dụ đã lưu MySQL trên DB của bạn, trong backend chạy `npm run data:examples`. Tài khoản, dữ liệu liên kết và mật khẩu riêng nằm ở đường dẫn lệnh in ra; xem `backend/docs/EXAMPLE-DATA.md`. Dữ liệu KT là ví dụ kiểm thử, không phải khách hàng hay danh tính đã xác minh.
