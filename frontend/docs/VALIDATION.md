# Kiểm chứng frontend / backend — cập nhật 18-10-2026

## Kết quả thực chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend `npm ci` trên thư mục Linux sạch | Thành công từ package-lock.json |
| Frontend `npm run lint` | Thành công, gồm cả source và test |
| Frontend `npm run build` | Thành công |
| Playwright + Chromium + Express + MariaDB 10.4 thật | Bản Excel/cây tổ chức **48/48 ca** và **4/4 ca ảnh hưởng**; bản khóa đăng nhập hiện tại chạy **4/4 ca auth** gồm đăng nhập, quên mật khẩu, đăng ký và khóa 15 giây. Chưa chạy lại toàn bộ browser suite cho bản khóa. Gồm gộp khách hàng, đăng ký email, animation, cây tổ chức và kéo chốt Won/Lost |
| Backend lint | Thành công |
| Backend Jest/MySQL | **121/121 test**, 14/14 suite trên MySQL 8.4 và MariaDB 10.4 |
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

Lượt hồi quy của bản trước đạt **34/34 ca trình duyệt** trên Chromium + MariaDB 10.4. Hai engine backend đạt **101/101 ca, 12/12 suite**; sau tinh chỉnh tên nguồn/chiến dịch trong Excel, chạy lại 6/6 ca phần bổ sung trên mỗi engine. Frontend lint/build và backend lint đạt. Cảnh báo List bị đánh dấu deprecated và useForm khi đổi màn hình vẫn xuất hiện; không có ngoại lệ JavaScript làm hỏng luồng trong các ca đã kiểm tra.

## Bổ sung dropdown và Excel

Đã tái hiện input ngành nghề không cho gõ tìm kiếm. Bộ chọn dùng chung nay tìm theo tên không phân biệt dấu/hoa thường, mở phía trên modal và đóng sau khi chọn. Ca trình duyệt mới bấm chính mũi tên, tìm/chọn từng ngành nghề, quy mô, khu vực, nguồn, chiến dịch và các dữ liệu cơ hội, rồi đối chiếu bản ghi lưu bằng API thật. Có loading, retry khi tải lỗi, phản hồi hoàn tất và animation tôn trọng reduced-motion. Một ca giữ request lưu đang chờ rồi tiếp tục tới backend thật để kiểm tra loading → success; không trả response nghiệp vụ giả.

Backend đầy đủ đạt 104/104 ca, 12/12 suite trên từng engine MySQL 8.4.11 và MariaDB 10.4.34. Bổ sung kiểm tra khởi tạo danh mục một lần, giữ cấu hình/xóa chủ động; mẫu user sáu cột và nhóm theo tên/mật khẩu tùy chọn; kiểu dữ liệu Excel, ký tự không hợp lệ trong XML và xuất rỗng có tiêu đề. Smoke test khởi động backend bình thường trên DB QA mới ở cả hai engine: 26 mục danh mục, 3 khu vực, 0 bản ghi user/khách hàng/lead/cơ hội; restart không nhân đôi.

XLSX mới dùng worksheet đơn giản thay structured table/comment/VML. Kiểm tra byte file tải bằng Chromium trùng payload HTTP; XML trong ZIP được parse độc lập và workbook mở bằng openpyxl, giữ header/filter/frozen row và không có ô công thức. Đây là kiểm chứng độc lập ngoài thư viện xuất ExcelJS. Chưa tái hiện trực tiếp lỗi Repair trong Microsoft Excel/Cốc Cốc trên Windows của người dùng; cần tải file mới để xác nhận trên máy đó. Không truy cập DB hoặc SMTP của người dùng.

Lượt hồi quy cuối bản dropdown/Excel: **39/39 ca Chromium + MariaDB 10.4**, gồm toàn bộ 34 ca cũ và 5 ca mới (4,5 phút). Frontend lint/build và backend lint đạt. Kiểm tra độc lập ba workbook tải thực: khách hàng 12 hàng/13 cột, lead 7 hàng/15 cột, báo giá 2 hàng/9 cột; tất cả XML hợp lệ và openpyxl đọc được. Số hàng là dữ liệu QA của lượt này, không phải dữ liệu người dùng.

## Dropdown dạng danh sách, dữ liệu thực và mail

Rà 78 điểm dùng bộ chọn, thay trigger input bằng nút mở popup có ô tìm riêng. Hỗ trợ danh sách chuẩn/nhiều lựa chọn, tìm không dấu, Arrow/Enter/Escape, clear, disabled và trạng thái tải/rỗng. Portal có vị trí theo viewport, không bị cắt bởi modal. Bộ chọn người liên hệ khóa trước khi chọn khách hàng, chỉ tải đúng liên hệ của khách đã chọn.

Bộ 39 ca hồi quy cũ đạt sau thay bộ chọn; thêm hai ca rà lần lượt bộ chọn trên tám form và dữ liệu rỗng/bàn phím/clear. Ca rà mới từng phát hiện người liên hệ bật quá sớm và một fixture thiếu quy mô; đã sửa phụ thuộc UI và chuẩn bị dữ liệu thật trước ca kiểm tra. Ca danh mục rỗng không dùng API cấu hình sai để giả lập dữ liệu: chọn khách hàng thật chưa có liên hệ để kiểm tra trạng thái rỗng hợp lệ. Ba ca liên quan đã chạy lại đạt.

Backend đầy đủ **105/105 ca, 12/12 suite trên từng MySQL 8.4 và MariaDB 10.4**. Sau bổ sung đối chiếu mật khẩu/token nhận qua SMTP, chạy lại security-runtime **15/15 ca trên mỗi engine**. SMTP socket thật kiểm tra hai loại thư, login bằng mật khẩu tạm nhận qua thư, reset dùng token trong thư và từ chối dùng lại; verify không gửi mail, recipient bị từ chối không được đánh dấu sent, retry thành công ngay cả khi tác vụ nghiệp vụ bị lỗi SQL. Status API không lộ nội dung/recipient/credentials và chỉ cho Admin.

Nạp dữ liệu mới trên hai engine, chạy lại giữ số lượng và hash mật khẩu; nâng cấp bộ cũ từ script tại commit trước trên MariaDB rồi kiểm tra các API dưới Sales thật. DB QA sau nạp bộ chung và bộ riêng của Sales: 9 user gồm Admin QA có sẵn, 5 khách hàng/5 liên hệ, 4 lead, 3 cơ hội/3 báo giá, 30 mục danh mục/5 khu vực. Đây là số của QA, không phải số liệu DB máy người dùng. Không tự động nạp nghiệp vụ khi khởi động server; người dùng chạy tệp CMD hoặc `data:examples` trong DB họ chọn.

Trong cấu hình checkout chỉ kiểm tra tên/presence biến mail: có SMTP_USER/PASS nhưng thiếu SMTP_HOST; không dùng thông tin đó để gửi mail ngoài. `mail:check` và hướng dẫn cấu hình riêng được bổ sung. Chưa kết nối SMTP/Gmail hoặc đọc Inbox của người dùng. CMD dành cho Windows chưa chạy trên máy Windows trong môi trường Linux; các lệnh Node/npm bên trong đã kiểm tra. Chi tiết: [DROPDOWNS-AND-MAIL.md](DROPDOWNS-AND-MAIL.md).

Hồi quy cuối bản dropdown/dữ liệu/mail đạt **41/41 ca trình duyệt Chromium + MariaDB 10.4** (4,8 phút). Frontend lint/build và backend lint đạt. Bộ SMTP mở rộng 15/15 ca trên cả hai engine; backend đầy đủ 105/105 mỗi engine. ZIP được đóng gói từ source này, kiểm tra manifest/CRC và build lại mã giải nén.

## Một cây tổ chức và kéo chốt cơ hội

Trang tổ chức bỏ hai tab, chỉ một bảng cây; quan hệ khách hàng mẹ/con vẫn sửa trong form khách hàng. Có mở/thu gọn từng nhánh/tất cả, email/ảnh trưởng nhóm, khu vực và tổng nhân sự nhánh. `/groups/:id/members?include_descendants=1` dùng recursive CTE lấy người toàn nhánh không trùng; endpoint mặc định giữ danh sách trực tiếp.

Dữ liệu KT nâng cấp từ checkpoint cũ trên cả MySQL/MariaDB: năm đơn vị theo bốn cấp, nhánh Bắc/Nam cùng cấp, Khối có tám người khớp API nhân sự; thêm ba tài khoản trưởng đơn vị, giữ nguyên tám role/mật khẩu cũ. DB QA gồm Admin có sẵn và 11 tài khoản KT (12 user tổng); các bản ghi khách hàng/lead/cơ hội/báo giá giữ số lượng cũ. Chạy lại không nhân đôi hoặc đổi password hash; quan hệ cha tùy chỉnh được giữ.

Nguyên nhân kéo sang Won/Lost không được là cột đóng đặt `disabled` trong `useDroppable`. Nay nhận drop và mở form kết quả, dùng API close hiện hữu; không đưa chuỗi trạng thái vào API stage số. Cancel không gửi close; thiếu trường/điều kiện không đổi cột; manager chỉ ghi đè khi có lý do; thành công mới lưu/kết thúc drag. Thẻ đã đóng không kéo tiếp.

Bốn ca mục tiêu đạt: một cây mở/thu gọn và xem nhân sự toàn nhánh; quan hệ công ty mẹ/con qua form khách; pointer thật vào Won (thiếu lý do, 422 điều kiện rồi override hợp lệ và lưu số thực); pointer vào Lost (hủy giữ OPEN, lưu reason/competitor, tải lại thấy LOST). Backend đầy đủ đạt 106/106 ca, 12/12 suite trên mỗi engine; frontend/backend lint và build đạt.

Hồi quy cuối bản tổ chức/pipeline: **44/44 ca Chromium + MariaDB 10.4**, **106/106 backend mỗi MySQL 8.4/MariaDB 10.4**, lint/build đạt. Không thao tác DB trên máy người dùng; chỉ nạp dữ liệu cây KT khi người dùng chạy tệp CMD hoặc lệnh data:examples trên DB họ cấu hình.

## Gộp, animation toàn ứng dụng và đăng ký email

Bản này chạy lại 48/48 E2E trên Chromium + MariaDB 10.4 và 109/109 test backend trên mỗi MySQL 8.4 / MariaDB 10.4. Sau khi sửa vòng đời form lead khi tự refresh, 6/6 luồng ảnh hưởng đã qua kiểm tra lại. Tạo/gộp khách hàng rồi reload giữ liên hệ/cơ hội/công ty con; tab/route và đóng modal/drawer có animation.

Đăng ký qua browser xác minh mã 6 số, countdown 60 giây, mật khẩu xác nhận và Sales Rep mặc định; backend thử hai request đồng thời, mã cũ/hết hạn và email đã tồn tại. SMTP TCP cục bộ kiểm tra gửi ngay OTP/reset/invitation không cần vòng worker, trả lỗi khi SMTP từ chối, CLI gửi thư kiểm tra và giữ nguyên mật khẩu SMTP có ký tự đặc biệt khi ghi dotenv. Chạy thêm 3/3 test mail/CLI trên mỗi engine sau lần kiểm tra toàn bộ.

Nâng cấp dữ liệu từ bản trước và chạy lại trên hai engine: thêm Admin KT riêng, giữ mật khẩu/role cũ, 7 vai trò đăng nhập thật, production không trả tài khoản kiểm thử. Xem ảnh [login](images/login-roles-desktop.png), [đăng ký](images/register-email-desktop.png), [360px](images/login-roles-mobile.png).

SMTP môi trường hiện tại thiếu SMTP_HOST. Chưa xác minh hộp thư bên ngoài hoặc chạy CMD trên Windows của người dùng; dùng CAU-HINH-MAIL.cmd để nhập cấu hình tại máy và gửi thư kiểm tra nhận thực tế.

## Sửa mail API sau khi CMD đã gửi được

Đã tái hiện 503 với DB session +07:00 ở mã trước sửa. Sau sửa: 112/112 test backend trên mỗi engine, 13/13 suite; gửi OTP/reset/invitation qua SMTP TCP khi DB UTC+7, gửi bản ghi cũ attempts=0 bị lệch giờ, giữ retry attempts>0, worker bận trả 202 và sau đó chỉ gửi một lần, EAUTH thật có mã lỗi và hướng dẫn restart. Chạy lại 3/3 browser cho quên mật khẩu, đăng ký và login role; không chạy lại toàn bộ 48 browser trong bản vá mail này. Lint/build và build source giải nén được kiểm tra khi đóng gói. Người dùng xác nhận thư CMD đã về hộp thư; chưa trực tiếp xác minh mail API trong hộp thư của họ.


## Bổ sung import và tài liệu Jira

- Khách hàng/lead: preview, execute, nhập lại, cùng tệp và nhập đồng thời; dữ liệu trùng hoàn toàn bị chặn, preview không lưu DB, thay đổi có cùng MST vẫn cập nhật theo quyền.
- Cơ hội: workbook tiếng Việt dùng chung; kiểm tra tiền numeric, tên liên hệ, bộ lọc/scope và trường tùy chỉnh. File tải từ trình duyệt giữ nguyên byte, đọc được bằng SheetJS/openpyxl và XML chuẩn; không chạy Microsoft Excel tại môi trường Linux.
- S4-05: quy tắc/ngưỡng tính lại lead đang có và khi thông tin thay đổi; payload score không ghi đè điểm tự tính. Admin/Director chỉnh qua cấu hình, không thêm sửa tay từng score.
- Cây tổ chức: kiểm tra nút mở rộng và nhãn cùng dòng ở nhiều cấp, mở/thu gọn và nhân sự nhánh; mã cuối bổ sung rút gọn tên dài.
- Tài liệu: đọc đủ 199 issue, 135 Done / 9 In Progress / 55 To Do; kiểm tra XML DOCX/XLSX và 120 dòng nhật ký dự thảo cho 10 thành viên. Không suy ngày làm việc từ Updated, không ghi Sprint 4 To Do thành Done.


## Khóa đăng nhập — yêu cầu điều chỉnh 15 giây

Sau 5 lần sai liên tiếp, API trả 429 với Retry-After và details.code=LOGIN_TEMPORARILY_LOCKED. Giao diện có đếm ngược theo email. Kiểm tra API và trình duyệt thật: mật khẩu đúng trước hạn vẫn bị chặn, refresh không bỏ khóa, hết thời gian mới vào được. Kiểm tra thêm đăng nhập đúng reset số lần, sai sau hết hạn bắt đầu từ 1, 5 yêu cầu đồng thời không lách bộ đếm, rút khóa tạm cũ còn tối đa 15 giây và không tự mở tài khoản bị quản trị viên vô hiệu hóa. Thay đổi này theo yêu cầu người dùng, khác thời gian 15 phút của AC gốc.

Rà riêng Sprint 4: 47/47 kiểm tra API liên quan và ca trình duyệt gộp lead xác nhận lịch sử còn đủ. Phát hiện lead MERGED vẫn còn trong gợi ý trùng; đã ghi báo cáo, chưa sửa trong bản khóa đăng nhập. Hướng dẫn 9 US/31 AC trong reports/Huong_dan_test_Sprint_4.docx ở bộ tài liệu.
