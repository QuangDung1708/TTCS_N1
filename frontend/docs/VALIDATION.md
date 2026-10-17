# Kiểm chứng frontend / backend — 17-10-2026

## Kết quả thực chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend `npm ci` trên thư mục Linux sạch | Thành công từ package-lock.json |
| Frontend `npm run lint` | Thành công, gồm cả source và test |
| Frontend `npm run build` | Thành công |
| Playwright + Chromium + Express + MySQL thật | **23/23 test**, lượt chạy cuối 2,6 phút |
| Backend lint | Thành công |
| Backend Jest/MySQL | **86/86 test**, 11/11 suite |
| Backend coverage | 90.59% dòng; 76.43% nhánh; 91.2% hàm; 87.35% câu lệnh |
| Server phát triển | Frontend HTTP 200, backend health HTTP 200; dùng crm_dev không nạp dữ liệu nghiệp vụ mẫu |

Môi trường: Node 24.19.0, MySQL 8.4.11, Chromium 154.0.8037.57, Playwright 1.56.1. Dữ liệu máy đọc ở [validation.json](validation.json). Có workflow CI cho backend và frontend; chưa theo dõi kết quả chạy GitHub Actions của lần push này.

## Những luồng đã được kiểm tra bằng trình duyệt

- Đăng nhập đúng/sai, đăng xuất, light mode kể cả khi hệ điều hành đặt dark mode.
- Menu, route trực tiếp, nút ghi và giá vốn cho đủ 7 vai trò. Director đọc tài khoản nhưng không có thao tác sửa/khóa. API cũng chặn các thao tác này.
- Sales không xem khách của người khác; Team Lead thấy nhóm con; đa vai trò có quyền đọc rộng nhưng quyền sửa vẫn theo bản ghi.
- Tạo khách hàng và tải lại để chứng minh lưu MySQL; thêm liên hệ, ghi chú, hai yêu cầu hỗ trợ sinh cờ rủi ro; upload/download tệp thật.
- Hết phiên quay về đăng nhập và khôi phục bản nháp ghi chú của đúng tài khoản/hồ sơ.
- Điều kiện cuộc gặp chặn chuyển giai đoạn; ghi nhận cuộc gặp rồi chuyển được. Dòng thuê bao lấy đơn giá danh mục, số lượng/số kỳ tính lại tổng tiền. Chốt thắng khóa sửa.
- Kéo thả bằng con trỏ thực sự thay đổi stage trong MySQL. Manager ghi đè bắt buộc lý do, xem dự báo và phân bổ lại cơ hội.
- Tạo lead, nhận lead, ghi chú, chuyển thành khách hàng/cơ hội; lịch sử được giữ lại và lead đã chuyển không còn nút sửa.
- Excel thật: tải mẫu, đánh dấu trùng/lỗi từng dòng, nhập dòng hợp lệ, báo cáo kết quả.
- Biểu mẫu website Ant Design gửi lead thật có nguồn, truy cập không cần đăng nhập.
- Chỉnh chữ ký hồ sơ, kiểm tra số điện thoại, upload PNG thực và nhận URL avatar được xử lý trên server; thông báo lưu trạng thái đã đọc.
- Admin tạo tài khoản, gán nhiều vai trò, khóa có người tiếp nhận và xem nhật ký thay đổi.
- Trường tùy chỉnh bắt buộc xuất hiện trong form, được lọc/lưu bộ lọc và xuất vào XLSX thật.
- Cấu hình điểm theo tên nguồn lấy từ API; tạo lead đúng nguồn tự tính 50 điểm và phân loại Nóng theo ngưỡng đã lưu.
- Viewport 360px không tràn ngang toàn trang; menu Drawer và form vừa màn hình. Kiểm tra thêm bằng ảnh thực tế xác nhận có thể cuộn đến nút lưu của form dài. Tôn trọng prefers-reduced-motion.

## Tách dữ liệu kiểm thử

Toàn bộ fixture QA chỉ được tạo trong `crm_test`/`crm_test_ui` với cờ reset rõ ràng. Không intercept hoặc mock response API. `crm_dev` có 0 người dùng, khách hàng, lead và cơ hội tại lần xác minh. App không chứa danh sách khách hàng/lead/cơ hội dự phòng hoặc mật khẩu đăng nhập chung.

Ảnh dưới đây lấy từ database QA, có nhãn E2E; các bản ghi đó không được nạp khi cài/chạy ứng dụng.

[Khách hàng desktop](images/customers-desktop.png) · [Pipeline desktop](images/pipeline-desktop.png) · [Khách hàng 360px](images/customers-mobile-360.png) · [Cuộn đến nút lưu trên điện thoại](images/customer-form-mobile.png)

## Giới hạn xác minh

Bảng [151 AC](AC-MATRIX.md) phân biệt mã đã triển khai, bằng chứng backend và kiểm tra trình duyệt. Kết quả trên không đồng nghĩa mọi câu AC đã được nghiệm thu độc lập trên dữ liệu sản xuất.

Chưa kết nối hoặc chạy migration vào database thật trong hai ảnh của người dùng; chưa đối chiếu ZIP gốc vì giới hạn tải 32 MiB. Chưa kiểm tra hộp thư SMTP ngoài hoặc hiệu năng UI trên staging; yêu cầu hồ sơ khách hàng 360 dưới 1,5 giây với 500 hoạt động mới được đo ở tầng API cục bộ. Chưa có nghiệm thu PO. Các luồng tương tác chuyên biệt chưa có E2E riêng được ghi rõ trong bảng AC, dù đã có UI nối API và test backend liên quan.
