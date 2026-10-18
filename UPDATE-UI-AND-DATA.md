# Cập nhật UI và tạo dữ liệu kiểm thử

ZIP này có thư mục `backend` và `frontend`. Dừng cả hai terminal bằng Ctrl+C. Giải nén, chép hai thư mục vào folder `TTCS_N1` đang dùng, đồng ý thay tệp trùng tên. Giữ `.env`, `node_modules`, uploads và database hiện có. ZIP không chứa những dữ liệu riêng tư đó.

Không cần tạo lại DB hoặc chạy migration cho các thay đổi UI này. Không thêm dependency mới.

Trong terminal backend:

```powershell
npm run data:examples
npm run dev
```

Lệnh đầu là tùy chọn nếu chỉ muốn sửa UI; chạy nó để có các tài khoản và dữ liệu kiểm thử được lưu thực trong MySQL. Mật khẩu riêng từng tài khoản nằm trong tệp `.local-test-data` mà lệnh in đường dẫn; không có mật khẩu chung. Xem `backend/docs/EXAMPLE-DATA.md` để biết tài khoản và cách test. Đây là bản ghi kiểm thử có tiền tố KT, không phải danh tính khách hàng đã xác minh.

Trong terminal frontend:

```powershell
npm run dev
```

Tải lại trình duyệt bằng Ctrl+F5. Avatar có Hồ sơ cá nhân / Đổi mật khẩu / Đăng xuất. Chuông mở được kể cả khi chưa có thông báo. Tiền VNĐ có dấu chấm nhóm nghìn; lịch hiển thị ngày/tháng/năm và lưu ngày ISO; chiến dịch kiểm tra khoảng ngày. Nhật ký hiển thị nhãn và nội dung tiếng Việt. Animation ngắn, tôn trọng cài đặt giảm chuyển động của hệ điều hành.

Các bản vá backend tương thích XAMPP trước cũng có trong ZIP để đồng bộ source. Lệnh tạo dữ liệu chỉ cần database đã migration như database bạn đang đăng nhập dashboard; không nhập lại schema SQL cũ.
