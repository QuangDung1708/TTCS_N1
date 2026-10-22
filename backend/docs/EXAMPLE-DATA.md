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
| demo-admin.crm-test@example.test | Admin kiểm thử riêng | Toàn hệ thống |
| director.crm-test@example.test | Giám đốc kinh doanh | Toàn hệ thống |
| leader-a.crm-test@example.test | Trưởng nhóm | Miền Bắc |
| leader-b.crm-test@example.test | Trưởng nhóm | Miền Nam |
| sales-a.crm-test@example.test | Kinh doanh | Miền Bắc |
| sales-b.crm-test@example.test | Kinh doanh | Miền Nam |
| marketing.crm-test@example.test | Marketing | Theo ma trận quyền |
| care.crm-test@example.test | Chăm sóc khách hàng | Miền Bắc |
| accountant.crm-test@example.test | Kế toán | Theo ma trận quyền |

Admin hiện có được giữ nguyên. Bản mới tạo thêm Admin KT riêng, tổng 12 tài khoản KT; không đổi mật khẩu các tài khoản cũ. Trên login, bộ chọn dưới form tự điền tài khoản thật cho đủ 7 vai trò, vẫn cần bấm đăng nhập. Bộ chọn chỉ dành cho kết nối cục bộ và luôn tắt khi NODE_ENV=production; đặt ENABLE_TEST_ACCOUNTS=false để tắt. Mật khẩu mới (gồm ba tài khoản trưởng đơn vị bổ sung), ID và checkpoint nằm trong `backend/.local-test-data/examples-<mã-database>.json`; đường dẫn đầy đủ được in sau lệnh. Mở tệp bằng VS Code và sao chép mật khẩu của tài khoản tương ứng. Tệp này chứa bí mật đăng nhập: không đưa lên GitHub hoặc gửi cho người khác. Nó được gitignore và không nằm trong ZIP. Lệnh không in mật khẩu ra terminal. Chạy lại sau khi hoàn tất chỉ kiểm tra tài khoản và chỉ dẫn tới tệp, không nhân đôi bộ dữ liệu hoặc đổi mật khẩu.

Nếu đã tạo lại database cùng tên hoặc tự xóa một phần bộ dữ liệu, giữ tệp checkpoint và đối chiếu trước khi chạy lại; lệnh không tự đoán hay ghi đè tài khoản khác trùng email. Nếu có trường tùy chỉnh bắt buộc mới, API có thể từ chối bản ghi thiếu trường; các bước đã tạo vẫn được lưu, không tự rollback bằng cách xóa dữ liệu.

## Bản ghi có sẵn

- Năm đơn vị theo cây bốn cấp; hai nhánh Bắc/Nam riêng biệt dưới Khối Kinh doanh Toàn quốc, thêm Phòng Thái Nguyên và Tổ Sông Công dưới nhánh Bắc. Trưởng nhóm/Sales cũ giữ nhóm và quyền cũ.
- Bốn khách hàng: `KT · Doanh nghiệp Minh An`, `KT · Doanh nghiệp Bắc Sơn` thuộc Sales Bắc; `KT · Doanh nghiệp Nam Việt` thuộc Sales Nam; `KT · Khách hàng chăm sóc` thuộc CS. Mỗi khách hàng có một người liên hệ riêng.
- Hai sản phẩm: `KT-CRM` triển khai một lần, giá 5.000.000 ₫; `KT-SUB` thuê bao, giá 500.000 ₫/tháng. Có giá sàn và giá vốn, giá vốn Admin và Giám đốc được xem.
- Một nguồn lead, một ngành nghề, hai giai đoạn pipeline và hai lý do thắng/thua riêng cho kiểm thử; không thay cấu hình có sẵn.
- Một chiến dịch Website ngân sách 5.000.000 ₫, từ ngày chạy đến 30 ngày sau.
- Ba lead có nguồn và chiến dịch: lead 1 giao Sales Bắc, lead 2 giao Sales Nam, lead 3 chưa giao. Worker có thể đưa lead chưa giao vào hàng chờ nếu chưa có quy tắc phân bổ; đây là trạng thái thật.
- Hai cơ hội 5.000.000 ₫, thuộc đúng khách hàng/người liên hệ của từng Sales, ngày dự kiến chốt sau 30 ngày. Các ID lấy từ API, không gán cứng số ID hoặc tham chiếu khách hàng không tồn tại.

## Các thao tác nên thử

1. Admin mở chuông: có thể thấy danh sách rỗng. Mở avatar: Hồ sơ cá nhân, Đổi mật khẩu, Đăng xuất đều hoạt động.
2. Sales Bắc thấy khách/lead/cơ hội của mình; Sales Nam không thấy dữ liệu của Sales Bắc. Trưởng nhóm chỉ thấy nhóm mình. Kế toán không có Lead hoặc nút sửa khách hàng.
3. Admin và Giám đốc thấy giá vốn; các vai trò khác không thấy.
4. Marketing tạo chiến dịch: nhập `5000000`, ô hiển thị `5.000.000`; chọn hai ngày trên lịch; lưu, F5 và sửa lại. Ngày kết thúc trước ngày bắt đầu bị chặn.
5. Chọn lead đã giao để nhận chăm sóc, ghi hoạt động và chuyển đổi; hồ sơ khách hàng giữ lịch sử.
6. Chỉnh cơ hội, thêm sản phẩm, kiểm tra thành tiền; chốt thắng/thua với lý do. Nhập số lượng và kỳ thuê bao theo nhu cầu thử, dữ liệu được lưu thật.
7. Admin/Giám đốc mở Nhật ký thay đổi: người thực hiện, hành động, nhãn trường và giá trị trước/sau là văn bản, không hiển thị JSON. `Hệ thống` là người thực hiện khi bootstrap.
8. Sửa hồ sơ/chữ ký rồi tải lại. Đổi mật khẩu: đăng xuất và đăng nhập bằng mật khẩu mới; mật khẩu cũ phải bị từ chối.

## Bổ sung dữ liệu dropdown và tài khoản đang test

`data:examples` nay gọi khởi tạo danh mục chuẩn trước, kể cả với checkpoint đã hoàn tất ở bản cũ. Bổ sung danh mục quy mô, loại hoạt động, khu vực, đối thủ, khu vực cho nhóm và hai báo giá liên kết. Giữ mật khẩu/tài khoản hiện có; phần bổ sung có checkpoint riêng. Có giá trị mặc định hợp lệ cho trường tùy chỉnh bắt buộc khi tạo các bản ghi mới (số/ngày/văn bản/lựa chọn đầu tiên đã khai báo), không tự tạo lựa chọn cho danh mục rỗng.

Nếu dùng tài khoản không phải Admin và không thấy dữ liệu của nhóm khác, chạy tại backend trên PowerShell:

```powershell
$env:CRM_EXAMPLE_OWNER_EMAIL='email-tai-khoan-ban-dang-test'
npm run data:examples
```

Email phải là tài khoản đang hoạt động trong DB này. Tạo thêm riêng một khách hàng, liên hệ, cơ hội và báo giá do tài khoản đó phụ trách; với Sales tạo/phân công thêm một lead. Không chuyển quyền các bản ghi cũ, không đổi role/nhóm/mật khẩu của tài khoản. API vẫn quyết định mục nào được xem/sửa theo User Roles. Chạy lại cùng email không nhân đôi bộ riêng. Tài khoản CS/Kế toán giữ các mục chỉ xem/không được truy cập theo ma trận.

Có thể chạy tệp `CAP-NHAT-VA-NAP-DU-LIEU.cmd` ở gốc để cài dependency hai phía, hỏi email nhận dữ liệu, nạp rồi kiểm tra kết nối SMTP. Script không reset DB; không gửi email kiểm thử.

## Cây tổ chức bốn cấp

Bản cây tổ chức bổ sung ba tài khoản: `org-root.crm-test@example.test`, `org-department.crm-test@example.test`, `org-team.crm-test@example.test`, đều là Team Lead và gán vào đơn vị tương ứng. Mật khẩu ngẫu nhiên riêng ở cùng tệp checkpoint. Tổng bộ chung nay có 11 tài khoản KT và 5 nhóm. Tám tài khoản cũ giữ nguyên role/mật khẩu; Team Lead Bắc vẫn không xem nhánh Nam.

Cây: Khối Toàn quốc → Bắc → Phòng Thái Nguyên → Tổ Sông Công; Nam là nhánh con khác của Khối. Dùng API tạo nhóm/gán trưởng nhóm, không chèn một nút cây giả trong UI. Tổng nhánh Khối có 8 người từ các đơn vị con và chính nó; các tài khoản toàn hệ thống khác không tự bị chuyển vào nhóm. Nếu Bắc/Nam đã có cha tùy chỉnh thì giữ nguyên. Chạy lại không thêm trùng hoặc tái áp đặt quan hệ cha.
