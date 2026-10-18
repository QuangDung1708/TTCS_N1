# Tải frontend và backend Sprint 1–5

[Tải gói source đầy đủ](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [Mở trang tệp trên GitHub](https://github.com/QuangDung1708/TTCS_N1/blob/codex/frontend-sprint-1-5/delivery/TTCS_N1-fullstack.zip) · [SHA-256](TTCS_N1-fullstack.zip.sha256)

Nếu trình duyệt mở trang tệp, chọn **Download raw file**. Gói khoảng 1,8 MiB, chứa hai thư mục `frontend`/`backend`, lockfile, migration, test và tài liệu. Không kèm `.env`, node_modules, coverage, báo cáo trình duyệt hoặc tệp người dùng tải lên. Ứng dụng không seed dữ liệu nghiệp vụ mẫu; fixture QA chỉ chạy trong database kiểm thử có cờ reset rõ ràng.

Giải nén vào thư mục mới và làm theo [hướng dẫn chạy](../frontend/README.md). Cần Node.js 24 LTS và MySQL 8. Cấu hình database hiện có của bạn trong `backend/.env`; giữ bản sao cấu hình và dữ liệu đang có. Dùng **backend trong cùng gói fullstack** với frontend này để khớp các API phân quyền, thông báo và cơ cấu tổ chức mới.

Source ứng dụng: `b3025cc447cd585ce10c2bc790e77060007528cf`. `DELIVERY.json` bên trong ZIP liệt kê commit nguồn và SHA-256 của từng tệp. Gói đã kiểm tra CRC, đối chiếu byte từng tệp với source, và lint/build thành công từ mã giải nén.

Kiểm chứng cục bộ: bản trước **48/48 kiểm thử trình duyệt**; bản vá mail chạy lại **3/3 luồng liên quan**, **112/112 kiểm thử backend trên từng engine MySQL 8.4 và MariaDB 10.4**, lint/build thành công. Xem [kết quả và giới hạn xác minh](../frontend/docs/VALIDATION.md), [đối chiếu 151 AC](../frontend/docs/AC-MATRIX.md), [ảnh desktop](../frontend/docs/images/customers-desktop.png) và [ảnh 360px](../frontend/docs/images/customers-mobile-360.png).

## Bản mới nhất: Excel trùng, mẫu Pipeline, cây tổ chức và tài liệu Jira

[Tải ZIP cập nhật](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-import-excel-organization-fix.zip) · [SHA-256](TTCS_N1-import-excel-organization-fix.zip.sha256) · [Tải tài liệu Jira](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-tai-lieu-Jira.zip).

Gói cập nhật 1.277.072 byte / 95 tệp, gồm các bản sửa trước; source `b3025cc447cd585ce10c2bc790e77060007528cf`. Chép đè vào dự án, giữ `.env`, DB và uploads; khởi động lại backend/frontend, Ctrl+F5. Không đổi schema/dependency, không cần nạp lại dữ liệu hoặc SMTP đã cấu hình.

Chặn dòng khách hàng/lead giống hoàn toàn ở preview và execute, trong cùng tệp, khi nhập lại và đồng thời. Giữ cập nhật có thay đổi theo MST và quyền. Pipeline dùng workbook tiếng Việt chung, tên liên kết thay ID, tiền dạng số, bộ lọc/scope và custom fields. Cây tổ chức căn nút/nhãn theo cấp, rút gọn tên dài. Điểm lead tự tính theo AC S4-05; Admin/Director chỉnh quy tắc/ngưỡng qua nút hoặc bấm điểm.

Kiểm tra **119/119 backend, 14/14 suite trên từng MySQL 8.4 và MariaDB 10.4**. Trình duyệt **48/48 ca**, sau tinh chỉnh tên dài chạy **4/4 ca ảnh hưởng** trên mã cuối. Lint/build đạt; tải XLSX đối chiếu byte, đọc bằng SheetJS/openpyxl và kiểm tra XML; không chạy Microsoft Excel trên Linux. Gói source giải nén build đạt.

ZIP tài liệu có API DOCX/Markdown theo thành viên/Jira, nhật ký XLSX 18 sheet với 120 dòng dự thảo cá nhân theo ngày, bản Word cá nhân Leader và nhóm, đề xuất Sprint Review. Đối chiếu đủ 199 issue; giữ trạng thái S3 chưa nghiệm thu và S4 To Do. Nhật ký ngày là dự thảo cần xác nhận vì export không có Daily Scrum; không thêm Sprint 5 giả. Chi tiết trong [README tài liệu](../reports/README.md).

SHA-256 fullstack: `69235102dc75c593f65982c77fb28bc8cdf7191e75e52952988c7cf2dafc9ef1`.


## Bản trước: mail API khi CMD gửi được — sửa hàng đợi UTC+7

[Tải ZIP cập nhật mail](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-mail-queue-fix.zip) · [SHA-256](TTCS_N1-mail-queue-fix.zip.sha256). Source `6c99a260a2b917d467e9a0e32ccf3184b5f5ce3a`. Gói gồm các bản sửa trước.

**Dừng backend/frontend, chép đè thư mục backend/frontend từ ZIP, giữ nguyên .env đã cấu hình thành công và DB. Khởi động lại cả hai, Ctrl+F5. Không cần nhập lại App Password, không cần nạp lại dữ liệu hoặc chạy migration.** Backend phải mở lại để đọc .env vừa được CMD lưu.

Tái hiện lỗi 503 khi DB dùng UTC+7: DEFAULT CURRENT_TIMESTAMP làm thư bị coi là chưa đến giờ. Bản vá ghi giờ gửi UTC và lấy ngay thư cũ chưa thử gửi, giữ lịch retry sau lỗi. Worker bận trả 202 đang chờ, không báo nhầm SMTP lỗi. EAUTH thật trả mã lỗi và hướng dẫn restart khi CMD đã đổi cấu hình.

Kiểm tra 112/112 backend trên mỗi engine, gồm gửi OTP/reset/invitation với DB UTC+7 qua SMTP TCP, legacy queue, retry, worker bận và lỗi xác thực; 3/3 browser quên mật khẩu/đăng ký/login role, lint/build và build source giải nén. Người dùng xác nhận mail CMD đã về; chưa trực tiếp xác minh hộp thư của họ qua API. Xem [hướng dẫn](../UPDATE-UI-AND-DATA.md).

## Bản trước: gộp khách hàng, animation toàn ứng dụng và đăng ký email

[Tải ZIP cập nhật](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-auth-merge-motion-fix.zip) · [SHA-256](TTCS_N1-auth-merge-motion-fix.zip.sha256). Gói khoảng 1,2 MiB, 89 tệp, gồm các bản sửa trước. Commit source: `1844b8adeaf78ffd721dfe23de4cce6948759785`.

Dừng server, chép đè các thư mục/tệp trong ZIP vào dự án hiện tại. Giữ `.env`, uploads và DB. Chạy `CAP-NHAT-VA-NAP-DU-LIEU.cmd` để cài dependency, bật đăng ký cục bộ và nạp tài khoản test; chạy `CAU-HINH-MAIL.cmd` để cấu hình SMTP, thử xác thực và gửi thư kiểm tra đến email của bạn. Khởi động lại backend/frontend, Ctrl+F5. Không reset DB, không cần migration mới.

Đã sửa xác nhận gộp và kiểm tra liên hệ/cơ hội/công ty con sau reload. Motion dùng chung toàn ứng dụng: route, tab, modal, drawer, menu và loading/success; form chờ đóng xong mới gỡ, giữ state khi nền tự làm mới. Login đổi nền slogan và có bộ chọn đủ 7 User Roles từ tài khoản KT lưu thật; vẫn xác thực mật khẩu qua API, luôn tắt bộ chọn trong production. Đăng ký mã email 6 số, resend 60 giây phía server, mật khẩu xác nhận và role Sales Rep cố định.

Đăng ký/quên mật khẩu/cấp user gửi SMTP ngay, báo lỗi hoặc cảnh báo nếu gửi chưa được. Kiểm tra hiện tại còn thiếu SMTP_HOST; chưa xác minh hộp thư thật của người dùng. Công cụ cấu hình giữ bí mật tại máy, không cần gửi mật khẩu qua chat. Xem [hướng dẫn cập nhật và mail](../UPDATE-UI-AND-DATA.md) và [ảnh login mới](../frontend/docs/images/login-roles-desktop.png).

Đã kiểm tra 48/48 browser, 109/109 backend trên từng engine, 6/6 browser ảnh hưởng ở mã cuối, lint/build và build lại source giải nén. Không chứa `.env`, checkpoint mật khẩu, node_modules hoặc uploads.

## Bản trước: một cây tổ chức và kéo chốt Won/Lost

[Tải ZIP cập nhật](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-organization-pipeline-fix.zip) · [SHA-256](TTCS_N1-organization-pipeline-fix.zip.sha256). Gói khoảng 312 KiB, gồm các bản sửa trước.

Dừng server, chép đè backend/frontend và CMD vào folder dự án, giữ `.env`/uploads/DB. Chạy `CAP-NHAT-VA-NAP-DU-LIEU.cmd` để bổ sung cây KT bốn cấp (hoặc `npm run data:examples` tại backend). Sau đó chạy lại backend/frontend và Ctrl+F5. Không reset DB/migration.

Cơ cấu tổ chức chỉ một cây nhóm/phòng ban: mở/thu gọn, trưởng nhóm/email/ảnh, khu vực, tổng nhân sự và xem toàn nhánh. Bộ KT có năm đơn vị bốn cấp; ba tài khoản trưởng đơn vị mới, giữ role/mật khẩu tám tài khoản cũ. Quan hệ cha đã tùy chỉnh được giữ. Công ty mẹ/con vẫn sửa trong form khách hàng.

Cột Won/Lost đã nhận drag: thả mở form chốt; hủy giữ OPEN, thiếu dữ liệu/điều kiện không đổi trạng thái. Đủ thông tin mới lưu vào API close và khóa kéo tiếp. Quyền/điều kiện/override có lý do giữ nguyên.

Kiểm chứng: **44/44 Chromium + MariaDB**, **106/106 backend mỗi MySQL/MariaDB**, lint/build đạt; nâng cấp/nạp lại cây bốn cấp và tổng nhân sự khớp API trên cả hai engine; mã giải nén build đạt. Không truy cập DB trên máy người dùng. Chi tiết trong UPDATE-UI-AND-DATA.md và [VALIDATION.md](../frontend/docs/VALIDATION.md).

## Bản trước: dropdown, nạp dữ liệu và gửi mail

[Tải ZIP cập nhật](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-dropdown-data-mail-fix.zip) · [SHA-256](TTCS_N1-dropdown-data-mail-fix.zip.sha256). Gói khoảng 299 KiB, gồm các bản sửa trước và tệp `CAP-NHAT-VA-NAP-DU-LIEU.cmd`.

Dừng server, chép đè backend/frontend và CMD vào folder dự án, giữ `.env`/uploads/DB. Chạy CMD để cài dependency **cả hai phía** và nạp dữ liệu vào DB trong `.env`; nhập email tài khoản đang test để nhận bộ dữ liệu theo scope, hoặc để trống nếu dùng Admin. Không reset DB. Sau đó chạy lại backend/frontend và Ctrl+F5. Hướng dẫn: UPDATE-UI-AND-DATA.md trong ZIP.

Rà 78 điểm dùng bộ chọn, đổi trigger thành nút mở danh sách có ô tìm riêng; có dữ liệu liên kết thực và trạng thái rỗng rõ ràng. Liên hệ chỉ tải sau chọn khách hàng. Nạp danh mục, 8 tài khoản KT, nhóm/khu vực, khách hàng/liên hệ, sản phẩm, lead, cơ hội, chiến dịch, báo giá và lý do/đối thủ; chạy lại không nhân đôi/đổi mật khẩu. Có thể bổ sung dữ liệu thuộc tài khoản hiện có, không thay quyền.

Kiểm tra mail bằng `npm run mail:check`. Thiếu `SMTP_HOST` thì SMTP_USER/PASS chưa đủ; bổ sung cấu hình riêng và chạy lại backend. Admin có bảng trạng thái queue/lỗi, mail chạy dù business job lỗi. SMTP local thật đã kiểm tra thư cấp tài khoản/mật khẩu đăng nhập được, token reset dùng đúng một lần, verify không gửi mail và từ chối/retry. Chưa xác minh Gmail/Inbox máy người dùng.

Kiểm chứng: **41/41 ca Chromium + MariaDB**, **105/105 backend mỗi MySQL/MariaDB**, 15/15 ca SMTP/security mở rộng mỗi engine, lint/build đạt. Nạp/rerun/upgrade dữ liệu và quyền đọc qua API Sales đã kiểm tra trên DB QA. CMD Windows chưa chạy trực tiếp trên Windows; các lệnh Node/npm bên trong đã kiểm tra. [Chi tiết](../frontend/docs/DROPDOWNS-AND-MAIL.md).

## Bản trước: dropdown và Excel

[Tải ZIP chép đè backend/frontend](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-dropdown-excel-fix.zip) · [SHA-256](TTCS_N1-dropdown-excel-fix.zip.sha256). Gói khoảng 281 KiB, gồm các bản sửa UI trước đó và hướng dẫn `UPDATE-UI-AND-DATA.md`. Dừng server, chép hai thư mục vào TTCS_N1, giữ .env/uploads/database; chạy `npm ci` tại backend rồi khởi động lại backend/frontend và Ctrl+F5. Không reset DB hay chạy migration cho bản này.

Bộ chọn mở bằng mũi tên và tìm theo tên không dấu/hoa thường, lấy dữ liệu DB theo quyền. Backend khởi tạo danh mục chuẩn một lần, giữ cấu hình sẵn có, không tạo user/khách hàng/lead/cơ hội. Form quy mô ghi rõ khoảng nhân sự và có liên kết mở form doanh nghiệp có tên. XLSX khách hàng/lead/báo giá dùng worksheet đơn giản, tiêu đề/bộ lọc/cố định hàng đầu; mẫu user có sáu cột theo ví dụ. Loading/success và animation thẻ được kiểm tra bằng request lưu thật.

Kiểm chứng: 39/39 ca Chromium + MariaDB, 104/104 backend trên mỗi engine MySQL/MariaDB; lint/build đạt. XML và openpyxl đọc được ba file tải từ trình duyệt, byte khớp API. Chưa kiểm tra trực tiếp Microsoft Excel/Cốc Cốc Windows trên máy người dùng. Tải lại file mới sau khi cập nhật. Chi tiết trong [VALIDATION.md](../frontend/docs/VALIDATION.md).

## Bản sửa theo phản hồi kiểm thử 18/10/2026

[Tải ZIP chép đè backend/frontend](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-usability-fix.zip). Dừng server, chép hai thư mục vào TTCS_N1, giữ .env/uploads/database; chạy `npm ci` ở backend do thêm ExcelJS, sau đó chạy lại backend/frontend và Ctrl+F5. Không cần tạo lại DB/migration. Hướng dẫn đầy đủ ở UPDATE-UI-AND-DATA.md trong ZIP.

Menu avatar, bảng thông báo/nhật ký có phân quyền, hồ sơ/đổi mật khẩu, Admin toàn quyền gồm giá vốn; dữ liệu chọn dùng chung, lựa chọn chiến dịch cho Sales không lộ ngân sách, phân bổ trong form; đổi trạng thái sản phẩm, form danh mục có hướng dẫn/mã tự sinh, cây nhóm và cây công ty riêng; mẫu/xuất Excel có bảng và hướng dẫn; email tài khoản/mật khẩu tạm và reset text/HTML qua SMTP.

Kết quả kiểm thử và phạm vi xác minh: [VALIDATION.md](../frontend/docs/VALIDATION.md). SMTP đã thử qua máy chủ cục bộ thật; chưa xác minh Gmail/hộp thư trên máy người dùng. ZIP không có .env, mật khẩu, node_modules, uploads hay dữ liệu cá nhân.

## Bản cập nhật UI và dữ liệu kiểm thử

[Tải ZIP để chép đè vào folder đang dùng](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-ui-data-fix.zip). Có hai thư mục backend/frontend và hướng dẫn UPDATE-UI-AND-DATA.md. Dừng server, chép hai thư mục vào TTCS_N1, giữ .env/node_modules/uploads/database. Không cần migration hay dependency mới. Chạy backend `npm run data:examples` nếu muốn tạo dữ liệu kiểm thử; sau đó khởi động lại backend/frontend và Ctrl+F5.

Sửa cách mở avatar/chuông bằng nút có trạng thái, menu Hồ sơ/Đổi mật khẩu/Đăng xuất, popup lịch và định dạng ngày Việt Nam, định dạng tiền nhóm nghìn, kiểm tra thứ tự ngày chiến dịch, nhật ký tiếng Việt thay JSON, motion ngắn và reduced-motion. Kiểm chứng: **27/27 ca trình duyệt trên MariaDB 10.4**, lint frontend/backend và frontend build đạt; CLI tạo dữ liệu, đúng vai trò/liên kết/phân quyền và chạy lại không nhân đôi đã kiểm tra trên database QA riêng. Chưa truy cập máy người dùng.

Lệnh data:examples tạo 8 tài khoản, 2 nhóm, 4 khách hàng và liên hệ, 2 sản phẩm, 3 lead, 2 cơ hội và 1 chiến dịch trong MySQL. Đây là ví dụ kiểm thử có tiền tố KT, không phải danh tính đã xác minh. Mật khẩu ngẫu nhiên được ghi vào tệp riêng tư trên máy chạy lệnh, không kèm trong ZIP. Xem [hướng dẫn dữ liệu](../backend/docs/EXAMPLE-DATA.md).

## Bản vá danh sách người phụ trách — sau kiểm thử dashboard

[Tải bản vá một tệp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-directory-fix.zip). Sửa `/api/customers/users-list` trên MariaDB 10.4 do chưa có JSON_ARRAYAGG. Dừng backend, chép đè `backend/src/routes/customerRoutes.js`, chạy lại `npm run dev` và tải lại trình duyệt. Không chạy migration, không tạo lại database hoặc thay `.env`.

Bản sửa lấy vai trò bằng JOIN có cùng scope, trả mỗi người dùng một lần với mảng roles thực từ database. Kiểm chứng sau sửa: **95/95 test backend trên MySQL 8.4**, **95/95 test backend trên MariaDB 10.4**, **23/23 test trình duyệt trên MariaDB 10.4**, lint đạt. 23/23 test trình duyệt MySQL 8.4 cũng đạt ở đầu đợt kiểm thử, trước thay truy vấn directory. Smoke test database mới trên cả hai engine xác nhận bootstrap Admin và dashboard zero, không seed dữ liệu nghiệp vụ. Chưa thao tác database/trình duyệt trên máy người dùng. [Chi tiết](../backend/docs/DIRECTORY-COMPATIBILITY.md).

## Bản vá database tổng hợp trước đó

[Tải bản vá tổng hợp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-database-fix.zip). Gồm bản sửa worker, ánh xạ nhóm cũ và đồng bộ kiểu cột FK theo ID thực tế. Dừng API/worker, giữ bản sao lưu, chép thư mục `backend` của bản vá vào backend đang dùng (5 tệp source). Giữ `.env`, chạy `npm run migrate`; chỉ khi thành công mới `npm run dev`. Không cần npm install lại.

Kiểm chứng: **95/95 test backend MySQL 8.4**, **38/38 test liên quan MariaDB 10.4**, backend lint đạt. Có ca tái hiện lỗi FK `lead_activities` trước bản sửa với INT UNSIGNED/BIGINT UNSIGNED; bảo toàn lịch sử, NULL/default/comment; từ chối thu hẹp cột có dữ liệu hoặc chuyển số âm sang UNSIGNED; kiểm tra engine và bản ghi mồ côi. Bản fullstack phía trên đã cập nhật. Chưa truy cập database người dùng, chưa chạy lại E2E frontend cho bản sửa này. Xem [FOREIGN-KEY-MIGRATION.md](../backend/docs/FOREIGN-KEY-MIGRATION.md).

## Bản vá migration nhóm trùng ID

[Tải bản vá migration](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-migration-fix.zip). Dành cho lỗi `Conflicting legacy group ID 2`. Dừng API/worker, sao lưu database, thay `backend/sql/migrate.js` và thêm `backend/sql/reconcile-legacy-groups.js`. Giữ `.env` và bản vá worker. Chạy `npm run migrate`; chỉ khi thành công mới `npm run dev`. Không xóa bảng hoặc sửa ID bằng tay.

Giữ nhóm hiện tại, tạo ID riêng cho nhóm cũ bị trùng và chuyển thành viên theo FK xác định nguồn. Có checkpoint khi chạy lại, dừng nếu ánh xạ không rõ ràng. Kiểm chứng: **89/89 test backend MySQL 8.4**, **32/32 test liên quan MariaDB 10.4**, lint đạt; chưa truy cập database người dùng. Chi tiết: [GROUP-MIGRATION.md](../backend/docs/GROUP-MIGRATION.md). Gói fullstack phía trên chứa cả bản vá migration và worker.

## Bản vá worker XAMPP / MariaDB 10.4

[Tải bản vá hai tệp](https://github.com/QuangDung1708/TTCS_N1/raw/refs/heads/codex/frontend-sprint-1-5/delivery/TTCS_N1-worker-fix.zip). Dừng backend, giải nén và chép đè `backend/src/core/leads.js`, `backend/src/jobs/worker.js` vào backend hiện tại; chạy lại `npm run dev`. Không thay `.env`, không cần cài npm hoặc migration riêng cho bản vá. Gói fullstack phía trên cũng đã cập nhật.

Đã tái hiện lỗi cú pháp `SKIP LOCKED` trên MariaDB 10.4.34 và sửa worker dùng khóa tương thích. Kiểm chứng bản sửa: **86/86 test backend MySQL 8.4**, **28/28 test liên quan MariaDB 10.4**, backend lint thành công. Gửi SMTP cục bộ đồng thời hai worker không gửi trùng bản ghi; chưa kiểm chứng Gmail ngoài. Frontend giữ nguyên; 23/23 test trình duyệt là kết quả tại mốc frontend trước bản vá này. Chi tiết: [WORKER-COMPATIBILITY.md](../backend/docs/WORKER-COMPATIBILITY.md).

## Gói backend trước khi làm frontend

Gói bên dưới giữ lại mốc bàn giao backend cũ. Khi chạy giao diện mới, dùng gói fullstack phía trên.


Tệp `TTCS_N1-backend.zip` chứa mã backend, migration MySQL, test và tài liệu. Không chứa `.env`, node_modules, uploads hoặc dữ liệu kinh doanh mẫu.

Trên GitHub, mở tệp ZIP rồi chọn **Download raw file** để tải. Giải nén vào thư mục mới, mở terminal trong thư mục `backend`.

Yêu cầu: Node.js >=22.13 và MySQL 8.x (đã kiểm thử MySQL 8.4).

1. Chạy `npm ci`.
2. Nếu chưa có `.env`, tạo từ `.env.example`; cấu hình kết nối MySQL và JWT_SECRET ngẫu nhiên ít nhất 32 ký tự. Không chép đè `.env` hiện có.
3. Sao lưu và thử migration trên bản sao database hiện có trước: `npm run migrate`.
4. Chạy `npm start`.

Database mới không có tài khoản mặc định. Xem `backend/README.md` để tạo quản trị viên đầu tiên bằng thông tin của bạn, và xem `backend/docs/API.md` để dùng API. Các giá trị DB_USER/DB_PASSWORD/DB_NAME phải khớp MySQL trên máy của bạn. SMTP cần được cấu hình riêng nếu muốn nhận email kích hoạt/đặt lại mật khẩu.

Đây là gói backend tại mốc trước khi triển khai frontend.
