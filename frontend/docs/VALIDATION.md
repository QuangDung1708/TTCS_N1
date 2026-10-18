# Kiểm chứng frontend / backend — cập nhật 18-10-2026

## Kết quả thực chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend `npm ci` trên thư mục Linux sạch | Thành công từ package-lock.json |
| Frontend `npm run lint` | Thành công, gồm cả source và test |
| Frontend `npm run build` | Thành công |
| Playwright + Chromium + Express + MariaDB 10.4 thật | **34/34 ca**, gồm các phản hồi bổ sung ngày 18/10 |
| Backend lint | Thành công |
| Backend Jest/MySQL | **101/101 test**, 12/12 suite trên MySQL 8.4 và MariaDB 10.4 |
| Backend coverage của bản trước | 90.64% dòng; 76.50% nhánh; 91.2% hàm; 87.43% câu lệnh; chưa đo lại cho phần Excel/mail mới |
| Server phát triển | Frontend HTTP 200, backend health HTTP 200; dùng crm_dev không nạp dữ liệu nghiệp vụ mẫu |

Môi trường: Node 24.19.0, MySQL 8.4.11 / MariaDB 10.4.34, Chromium 154.0.8037.57, Playwright 1.56.1. Dữ liệu máy đọc ở [validation.json](validation.json). Có workflow CI cho backend và frontend; chưa theo dõi kết quả chạy GitHub Actions của lần push này.

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

## Bản vá worker — 18-10-2026 (UTC+7)

Tái hiện `ER_PARSE_ERROR` gần `SKIP LOCKED` trên MariaDB 10.4.34. Sau bản sửa: 86/86 test backend (11 suite) trên MySQL 8.4.11; 28/28 test liên quan (worker, security-runtime, leads-deals) trên MariaDB 10.4.34; backend lint thành công. Test SMTP dùng socket thật, chạy đồng thời hai worker và xác nhận không gửi lại thư đã hoàn tất. Kiểm thử trình duyệt 23/23 ở trên là kết quả trước bản vá; frontend không thay đổi và không chạy lại E2E cho bản vá này. Chưa xác nhận phiên bản database trên máy người dùng. Xem [hướng dẫn áp dụng](../../backend/docs/WORKER-COMPATIBILITY.md).

## Bản vá migration nhóm — 18-10-2026 (UTC+7)

Bổ sung ánh xạ nhóm cũ khi trùng ID và checkpoint để chạy lại sau bước bỏ FK. MySQL 8.4: 89/89 test backend (11 suite), lint đạt. MariaDB 10.4.34: 32/32 test liên quan (4 suite: migration, worker, security-runtime, leads-deals). Các ca mới kiểm tra giữ hai nhóm khác tên, giữ nhóm của khách hàng, chuyển đúng nhóm người dùng theo FK cũ, chạy lặp, phục hồi checkpoint và dừng khi thiếu căn cứ ánh xạ. Frontend không đổi; chưa chạy lại E2E. Xem [hướng dẫn migration nhóm](../../backend/docs/GROUP-MIGRATION.md).

## Bản vá tương thích khóa ngoại — 18-10-2026 (UTC+7)

Kết quả cuối: **95/95 test backend MySQL 8.4** (11 suite), **38/38 test liên quan MariaDB 10.4** (4 suite), backend lint đạt. Có 10 ca migration trên mỗi engine. Đã tái hiện lỗi tạo FK với ID cha INT UNSIGNED/BIGINT UNSIGNED trước sửa, kiểm tra FK thật sau sửa, bảo toàn dữ liệu lịch sử và thuộc tính cột; chặn chuyển đổi âm sang UNSIGNED, thu hẹp kiểu có dữ liệu và engine chưa hỗ trợ. Đã sửa cleanup fixture lỗi để không ảnh hưởng các suite kế tiếp; lượt chạy cuối toàn bộ backend đạt. Chưa xác nhận metadata database trên máy người dùng, chưa chạy lại trình duyệt (frontend không đổi). Xem [hướng dẫn bản vá tổng hợp](../../backend/docs/FOREIGN-KEY-MIGRATION.md).

## Kiểm thử sau khi vào dashboard — 18-10-2026 (UTC+7)

Đã chạy 23/23 ca trình duyệt qua API/MySQL 8.4 ở đầu đợt. Khi mở rộng toàn bộ backend sang MariaDB 10.4, phát hiện 1/95 ca lỗi do `/api/customers/users-list` dùng JSON_ARRAYAGG chưa có trên phiên bản này. Đã đổi sang một JOIN có cùng scope và gom mảng vai trò trong Node.js; response không lặp tài khoản và giữ đủ vai trò thực.

Sau bản sửa: **95/95 test backend trên MySQL 8.4**, **95/95 test backend trên MariaDB 10.4** (mỗi engine 11 suite), **23/23 test trình duyệt trên MariaDB 10.4**, backend lint đạt. Frontend không đổi. Bộ 23 ca trình duyệt MySQL ở đầu đợt chạy trước bản sửa query directory, chưa chạy lại bộ đó trên MySQL sau sửa. Smoke test database mới riêng trên từng engine xác nhận migration không tạo người dùng/dữ liệu nghiệp vụ, bootstrap Admin đầu tiên thành công, bootstrap lần hai bị từ chối, đăng nhập và auth/me thành công, dashboard zero, truy cập dashboard không đăng nhập bị chặn. Sau bootstrap chỉ có 1 Admin QA, 0 khách hàng/lead/cơ hội/sản phẩm.

Dữ liệu QA nằm riêng trong crm_test, crm_test_ui, crm_test_compat, crm_test_uimaria và crm_test_bootstrap*. Không truy cập hoặc reset database trên máy người dùng; chưa kiểm chứng SMTP ngoài. Có cảnh báo Ant Design List deprecated không làm thất bại ca chức năng; chưa chuyển component trong đợt sửa API này. Xem [bản vá directory](../../backend/docs/DIRECTORY-COMPATIBILITY.md).

## Sửa UI và bộ dữ liệu kiểm thử — 18-10-2026 (UTC+7)

Lượt cuối **27/27 ca trình duyệt trên MariaDB 10.4** (2,9 phút); frontend lint/build và backend lint đạt. Bốn ca mới kiểm tra bấm vào hình avatar, đủ menu hồ sơ/mật khẩu/đăng xuất, chuông rỗng vẫn mở, chọn cả hai ngày bằng lịch thật, ngân sách 5.000.000 giữ nguyên sau lưu/F5, chặn khoảng ngày sai, nhật ký không có JSON và đổi mật khẩu thực sự làm mật khẩu cũ bị từ chối. Ca cũ về tài khoản/nhật ký cũng chạy lại đạt sau khi phân biệt nhãn hành động lịch sử với hiện tại. Motion ngắn theo token Ant Design, chuyển trang/hover và tôn trọng reduced-motion.

CLI `npm run data:examples` được chạy trên crm_test_examples riêng: 8 tài khoản thật có mật khẩu bcrypt và vai trò đúng; 2 nhóm; 4 khách hàng/liên hệ; 2 sản phẩm; 3 lead (2 lead giao hai Sales khác nhau); 2 cơ hội liên kết đúng khách hàng/liên hệ; 1 chiến dịch. Dữ liệu nghiệp vụ đi qua API thật, account provisioning là CLI cục bộ dùng core store/auth, không cần SMTP. Chạy lại không nhân đôi hoặc đổi mật khẩu khi checkpoint hoàn tất; kiểm tra SQL xác nhận role, liên kết và chủ sở hữu. Tệp mật khẩu riêng tư bị gitignore, không đưa vào gói bàn giao. Không tạo dữ liệu trên máy người dùng. Tên ví dụ không phải danh tính đã xác minh.

Không sửa backend API nghiệp vụ trong đợt này; kết quả 95/95 backend trên hai engine ở đợt trước vẫn ghi riêng, không tuyên bố đã chạy lại suite đó cho CLI mới. Có cảnh báo AntD List deprecated và useForm chưa gắn khi form ẩn ở một số luồng; chúng không làm thất bại các ca chức năng, chưa đổi component ngoài phạm vi sửa. Chưa tái hiện đầy đủ cấu hình trình duyệt của người dùng; nút/popup được điều khiển rõ trạng thái và kiểm thử bằng con trỏ trên Chromium. Xem [hướng dẫn cập nhật](../../UPDATE-UI-AND-DATA.md) và [dữ liệu kiểm thử](../../backend/docs/EXAMPLE-DATA.md).

## Bản sửa liên kết dữ liệu, tài khoản, Excel và tổ chức — 18/10/2026

Backend 101 ca / 12 suite chạy trên hai engine MySQL 8.4 và MariaDB 10.4. Gồm tạo/sửa danh mục với mã tự sinh, API tên chiến dịch không lộ ngân sách, phân bổ lead cùng giao dịch và rollback khi vượt scope, bảng Excel có định dạng, nhập tiêu đề tiếng Việt, mẫu có trường tùy chỉnh, xuất/nhập lại giữ kiểu và số điện thoại; nội dung bắt đầu bằng dấu bằng được lưu dạng chuỗi Excel, không phải công thức. Admin có quyền đầy đủ gồm giá vốn và audit theo yêu cầu mới; các vai trò khác vẫn bị giới hạn theo ma trận.

Bổ sung trình duyệt thực: mở avatar/chuông, hồ sơ/password/logout, dữ liệu nguồn/chiến dịch mới xuất hiện cho Sales, đổi trạng thái sản phẩm còn đúng sau tải lại, chọn người phụ trách trong form, cây nhóm và công ty mẹ/con (gồm bỏ liên kết cha), chọn cơ hội để lưu báo giá, form ngành nghề tạo mã tự động và dùng lại trong khách hàng, quên mật khẩu qua UI rồi đăng nhập bằng mật khẩu mới, từ chối dùng lại reset token. Bộ chọn tên được lấy từ API/MySQL thật; không chặn API để trả dữ liệu giả.

Email tạo tài khoản và quên mật khẩu được đưa vào hàng đợi thực, gửi text/HTML qua kết nối socket SMTP cục bộ thật; kiểm tra không gửi trùng khi worker chạy đồng thời và xóa bí mật trong outbox sau gửi. Chưa xác minh Gmail/App Password, hộp thư thật, trình duyệt Cốc Cốc Windows hoặc DB trên máy người dùng. Bài browser chạy Chromium Linux.

Thêm ExcelJS là thay đổi dependency backend; hướng dẫn cập nhật yêu cầu npm ci, giữ .env/uploads/DB, không yêu cầu migration hay reset database.

Lượt hồi quy phát hành cuối đạt **34/34 ca trình duyệt** trên Chromium + MariaDB 10.4. Hai engine backend đạt **101/101 ca, 12/12 suite**; sau tinh chỉnh tên nguồn/chiến dịch trong Excel, chạy lại 6/6 ca phần bổ sung trên mỗi engine. Frontend lint/build và backend lint đạt. Cảnh báo List bị đánh dấu deprecated và useForm khi đổi màn hình vẫn xuất hiện; không có ngoại lệ JavaScript làm hỏng luồng trong các ca đã kiểm tra.
