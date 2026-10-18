# Dữ liệu để kiểm thử bằng giao diện

Chạy thủ công trong thư mục backend đã migration và có Admin:

```powershell
npm run data:examples
```

Lệnh dùng kết nối MySQL từ `.env`. Giữ database hiện tại; không chạy lại bootstrap hoặc tạo database khác. Nên sao lưu trước khi thêm dữ liệu. Lệnh bị chặn khi `NODE_ENV=production`, không được gọi bởi server/migration, không xóa hoặc cập nhật khách hàng có sẵn. Các bản ghi nghiệp vụ được tạo qua API thật và lưu MySQL; không intercept response hoặc cung cấp danh sách giả cho frontend. CLI cấp tài khoản kiểm thử cục bộ với mật khẩu bcrypt và nhật ký rồi đăng nhập để gọi các API theo đúng vai trò.

**Tên doanh nghiệp, người liên hệ và giá trong bộ này là ví dụ kiểm thử, không phải khách hàng, danh tính hoặc báo giá đã được xác minh.** Dùng tiền tố `KT ·` để phân biệt. Email thuộc miền `example.test`, không gửi/nhận thư Internet; các tài khoản đăng nhập được ngay với mật khẩu riêng được tạo ngẫu nhiên, không cần SMTP. Kiểm thử gửi mail thật phải dùng email do bạn kiểm soát và cấu hình SMTP riêng.

## Tài khoản

| Email | Vai trò | Nhóm |
|---|---|---|
| director.crm-test@example.test | Giám đốc kinh doanh | Toàn hệ thống |
| leader-a.crm-test@example.test | Trưởng nhóm | Miền Bắc |
| leader-b.crm-test@example.test | Trưởng nhóm | Miền Nam |
| sales-a.crm-test@example.test | Kinh doanh | Miền Bắc |
| sales-b.crm-test@example.test | Kinh doanh | Miền Nam |
| marketing.crm-test@example.test | Marketing | Theo ma trận quyền |
| care.crm-test@example.test | Chăm sóc khách hàng | Miền Bắc |
| accountant.crm-test@example.test | Kế toán | Theo ma trận quyền |

Admin hiện có được giữ nguyên. Mật khẩu mới, ID và checkpoint nằm trong `backend/.local-test-data/examples-<mã-database>.json`; đường dẫn đầy đủ được in sau lệnh. Mở tệp bằng VS Code và sao chép mật khẩu của tài khoản tương ứng. Tệp này chứa bí mật đăng nhập: không đưa lên GitHub hoặc gửi cho người khác. Nó được gitignore và không nằm trong ZIP. Lệnh không in mật khẩu ra terminal. Chạy lại sau khi hoàn tất chỉ kiểm tra tài khoản và chỉ dẫn tới tệp, không nhân đôi bộ dữ liệu hoặc đổi mật khẩu.

Nếu đã tạo lại database cùng tên hoặc tự xóa một phần bộ dữ liệu, giữ tệp checkpoint và đối chiếu trước khi chạy lại; lệnh không tự đoán hay ghi đè tài khoản khác trùng email. Nếu có trường tùy chỉnh bắt buộc mới, API có thể từ chối bản ghi thiếu trường; các bước đã tạo vẫn được lưu, không tự rollback bằng cách xóa dữ liệu.

## Bản ghi có sẵn

- Hai nhóm kinh doanh độc lập; hai Trưởng nhóm, hai Sales được gán đúng nhóm.
- Bốn khách hàng: `KT · Doanh nghiệp Minh An`, `KT · Doanh nghiệp Bắc Sơn` thuộc Sales Bắc; `KT · Doanh nghiệp Nam Việt` thuộc Sales Nam; `KT · Khách hàng chăm sóc` thuộc CS. Mỗi khách hàng có một người liên hệ riêng.
- Hai sản phẩm: `KT-CRM` triển khai một lần, giá 5.000.000 ₫; `KT-SUB` thuê bao, giá 500.000 ₫/tháng. Có giá sàn và giá vốn, giá vốn chỉ Giám đốc được xem.
- Một nguồn lead, một ngành nghề, hai giai đoạn pipeline và hai lý do thắng/thua riêng cho kiểm thử; không thay cấu hình có sẵn.
- Một chiến dịch Website ngân sách 5.000.000 ₫, từ ngày chạy đến 30 ngày sau.
- Ba lead có nguồn và chiến dịch: lead 1 giao Sales Bắc, lead 2 giao Sales Nam, lead 3 chưa giao. Worker có thể đưa lead chưa giao vào hàng chờ nếu chưa có quy tắc phân bổ; đây là trạng thái thật.
- Hai cơ hội 5.000.000 ₫, thuộc đúng khách hàng/người liên hệ của từng Sales, ngày dự kiến chốt sau 30 ngày. Các ID lấy từ API, không gán cứng số ID hoặc tham chiếu khách hàng không tồn tại.

## Các thao tác nên thử

1. Admin mở chuông: có thể thấy danh sách rỗng. Mở avatar: Hồ sơ cá nhân, Đổi mật khẩu, Đăng xuất đều hoạt động.
2. Sales Bắc thấy khách/lead/cơ hội của mình; Sales Nam không thấy dữ liệu của Sales Bắc. Trưởng nhóm chỉ thấy nhóm mình. Kế toán không có Lead hoặc nút sửa khách hàng.
3. Giám đốc thấy giá vốn; Admin và các vai trò khác không thấy giá vốn.
4. Marketing tạo chiến dịch: nhập `5000000`, ô hiển thị `5.000.000`; chọn hai ngày trên lịch; lưu, F5 và sửa lại. Ngày kết thúc trước ngày bắt đầu bị chặn.
5. Chọn lead đã giao để nhận chăm sóc, ghi hoạt động và chuyển đổi; hồ sơ khách hàng giữ lịch sử.
6. Chỉnh cơ hội, thêm sản phẩm, kiểm tra thành tiền; chốt thắng/thua với lý do. Nhập số lượng và kỳ thuê bao theo nhu cầu thử, dữ liệu được lưu thật.
7. Admin/Giám đốc mở Nhật ký thay đổi: người thực hiện, hành động, nhãn trường và giá trị trước/sau là văn bản, không hiển thị JSON. `Hệ thống` là người thực hiện khi bootstrap.
8. Sửa hồ sơ/chữ ký rồi tải lại. Đổi mật khẩu: đăng xuất và đăng nhập bằng mật khẩu mới; mật khẩu cũ phải bị từ chối.
