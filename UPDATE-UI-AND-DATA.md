# Cập nhật gộp khách hàng, animation toàn ứng dụng và đăng ký email — 18/10/2026

## Sửa mail API khi CMD đã gửi được — bổ sung mới nhất

Nếu thư kiểm tra từ CMD đã tới hộp thư, **không cần nhập lại App Password**. Bản vá sửa việc hàng đợi dùng DEFAULT CURRENT_TIMESTAMP theo giờ MySQL trong khi worker so giờ UTC: khi DB ở UTC+7 thư mới bị coi là chưa đến giờ gửi và API báo 503. Ghi giờ UTC rõ ràng; thư cũ chưa thử gửi được lấy ngay, vẫn giữ thời gian chờ của thư đã lỗi cần thử lại.

Khi worker đang bận, API đợi ngắn rồi trả 202 với trạng thái đang chờ, không báo nhầm SMTP lỗi. Lỗi xác thực thật trả mã EAUTH và hướng dẫn khởi động lại backend để đọc .env vừa được CMD cập nhật. Không trả mật khẩu hoặc chi tiết xác thực.

**Cập nhật:** dừng backend/frontend bằng Ctrl+C, chép đè backend/frontend từ ZIP vào dự án đang dùng và giữ nguyên backend/.env, uploads, DB. Mở lại backend/frontend, Ctrl+F5, rồi thử quên mật khẩu/đăng ký bằng email của bạn. Không cần chạy lại CMD nạp dữ liệu, không cần nhập lại cấu hình mail, không cần migration hoặc reset DB. Backend đang chạy không tự đọc lại .env khi CMD lưu thay đổi.

## Bản bổ sung mới nhất

- Gộp khách hàng xác nhận ngay trong form, không bị phụ thuộc popup lồng nhau. Chuyển liên hệ, cơ hội, hoạt động, tệp và công ty con sang hồ sơ giữ lại rồi làm mới danh sách.
- Hiệu ứng dùng chung cho toàn ứng dụng: chuyển trang, đổi tab/pipeline-list, mở/đóng modal và drawer, menu tài khoản/thông báo, loading và thông báo thành công. Chờ hiệu ứng đóng hoàn tất rồi mới bỏ nội dung khỏi trang. Tôn trọng tùy chọn Giảm chuyển động của hệ điều hành.
- Login có hình mạng kết nối làm nền slogan và nút chọn đủ 7 User Roles bên dưới nút đăng nhập. Đây là các tài khoản KT lưu thật trong DB, mật khẩu ngẫu nhiên được nạp từ checkpoint riêng tư. Bấm vai trò chỉ điền form, vẫn phải đăng nhập qua API. Bổ sung một Admin kiểm thử riêng, giữ Admin hiện có.
- Đăng ký gồm họ tên, email, mã 6 số gửi qua SMTP, mật khẩu và xác nhận. Máy chủ chặn email đã có, giới hạn gửi lại theo từng email 60 giây kể cả mở nhiều tab, mã hết hạn sau 10 phút và chỉ dùng một lần. Vai trò luôn là Sales Rep; client không thể chọn Admin. Mật khẩu ít nhất 8 ký tự, có chữ và số, xác nhận phải khớp.
- Đăng ký, quên mật khẩu và tạo user mới gửi SMTP ngay sau khi lưu, không cần chờ vòng worker 30 giây. SMTP thiếu/lỗi trả thông báo rõ ràng; tạo user thành công nhưng mail lỗi sẽ báo riêng, không yêu cầu tạo lại. Thư chưa gửi vẫn được giữ để worker thử lại. Thư chứa mã/liên kết cũ chưa gửi được loại bỏ khi phát hành mã/liên kết mới.

## Cây tổ chức và pipeline đã bổ sung trước đó

- Cơ cấu tổ chức chỉ còn **một cây nhóm/phòng ban**, có mở/thu gọn từng nhánh hoặc toàn bộ; hiển thị trưởng nhóm, email/ảnh, khu vực, tổng nhân sự của nhánh và mô tả. Bấm số nhân sự sẽ xem cả nhóm con, không trùng người.
- Quan hệ công ty mẹ/con của khách hàng vẫn sửa tại **Khách hàng & liên hệ → Sửa khách hàng → Công ty mẹ**; không còn tab cây công ty thứ hai trong cơ cấu tổ chức.
- Chạy tệp CMD bên dưới hoặc `npm run data:examples` để bổ sung dữ liệu cây KT bốn cấp: Khối Kinh doanh Toàn quốc → Kinh doanh Miền Bắc → Phòng Kinh doanh Thái Nguyên → Tổ Bán hàng Sông Công; Miền Nam là nhánh cùng cấp với Miền Bắc. Thêm ba tài khoản trưởng đơn vị riêng, giữ vai trò/mật khẩu của tám tài khoản cũ. Chỉ ghép nhóm KT Bắc/Nam vào khối khi chúng chưa có cha; giữ quan hệ cha đã tùy chỉnh.
- Kéo thẻ cơ hội sang cột **Chốt thành công / Chưa thành công (Lost)** sẽ mở form chốt. Thắng cần giá trị thực tế/ngày ký/lý do; thua cần lý do và có thể chọn đối thủ. Hủy không thay trạng thái. Chỉ lưu đủ thông tin và đáp ứng điều kiện giai đoạn mới chuyển cột; ghi đè vẫn theo quyền và bắt buộc lý do. Cơ hội đã đóng không kéo tiếp, phải mở lại theo quyền.

## Cách cập nhật bản mới và nạp dữ liệu

1. Dừng backend/frontend. Chép đè `backend`, `frontend` và hai tệp `CAP-NHAT-VA-NAP-DU-LIEU.cmd`, `CAU-HINH-MAIL.cmd` từ ZIP vào đúng folder dự án hiện tại. Giữ `backend/.env`, uploads và DB.
2. Chạy `CAP-NHAT-VA-NAP-DU-LIEU.cmd`. Tệp này chạy `npm ci` **cả backend lẫn frontend**, bật `ALLOW_SELF_REGISTRATION=true` và `ENABLE_TEST_ACCOUNTS=true` cho bản chạy cục bộ, rồi nạp dữ liệu qua API vào DB cấu hình trong `.env`. Giữ các mục DB/JWT/SMTP trong `.env`. Không tạo lại DB, không xóa dữ liệu. Cần DB đã migration và có Admin hiện đang dùng.
3. Khi được hỏi email, nhập email tài khoản đang test nếu không dùng Admin. Lệnh thêm riêng một bộ khách hàng/liên hệ/cơ hội/báo giá cho tài khoản đó; nếu là Sales còn có lead được phân công. Không đổi vai trò, nhóm hoặc mật khẩu tài khoản hiện có. Admin có thể bỏ trống để dùng bộ chung.
4. Đọc số lượng bản ghi và kết quả SMTP ở cuối cửa sổ. Khởi động lại backend/frontend, nhấn Ctrl+F5. Bộ chọn nay là **nút mở danh sách**; gõ tìm trong ô tìm kiếm bên trong danh sách. Không biến giá trị đã chọn thành ô nhập.

Nếu chạy terminal thay tệp CMD: `npm ci` trong mỗi thư mục backend/frontend, rồi tại backend chạy `npm run auth:enable` và `npm run data:examples`. Trên PowerShell, có thể đặt `$env:CRM_EXAMPLE_OWNER_EMAIL='email-tai-khoan-dang-test'` trước lệnh nạp; bỏ biến nếu dùng Admin. Mật khẩu 12 tài khoản KT (gồm 1 Admin riêng và 3 trưởng đơn vị) nằm trong tệp riêng tư mà lệnh in đường dẫn, không nằm trong ZIP. Dữ liệu là bản ghi kiểm thử lưu thật trong DB, không phải danh tính/khách hàng đã xác minh.

## Gửi email thật

1. Chạy **`CAU-HINH-MAIL.cmd`** tại thư mục gốc, hoặc trong backend chạy **`npm run mail:configure`**. Công cụ hỏi SMTP host/cổng/email và mật khẩu ứng dụng; mật khẩu được ẩn khi nhập. Với Gmail dùng `smtp.gmail.com`, cổng `587`, bật xác minh 2 bước và tạo App Password. Không dùng mật khẩu đăng nhập Gmail.
2. Công cụ thử kết nối và xác thực SMTP trước; chỉ khi thành công mới cập nhật các khóa SMTP trong `.env`, giữ các mục khác. Khởi động lại backend.
3. Nhập email của bạn trong cửa sổ CMD để gửi thư kiểm tra, hoặc chạy `npm run mail:send-test -- email-cua-ban` trong backend. Kiểm tra Inbox và Spam. Công cụ chỉ xác nhận SMTP đã nhận thư, không tự khẳng định thư tới Inbox.
4. Sau đó thử đăng ký / quên mật khẩu / tạo user bằng địa chỉ email bạn kiểm soát. Admin xem trạng thái và hướng dẫn xử lý EAUTH, ETIMEDOUT, ESOCKET, EENVELOPE trong Quản trị người dùng.

Ở lần kiểm tra cloud trước, cấu hình tại cloud còn thiếu **SMTP_HOST**; điều này không phản ánh cấu hình đã lưu thành công trên máy bạn. Không thể xác nhận hộp thư thật tại máy bạn khi chưa có cấu hình SMTP của bạn. Không gửi App Password lên chat hoặc Git.


`npm run mail:check` tại backend kiểm tra cấu hình, kết nối và xác thực SMTP thật, **không gửi thư**. Thiếu `SMTP_HOST` thì chỉ có `SMTP_USER`/`SMTP_PASS` chưa đủ. Không dùng thông tin gửi thư của dự án khác hoặc thông tin có sẵn trong source.

Ví dụ nếu bạn dùng Gmail, chỉnh các mục tương ứng trong `.env` của bạn:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
SMTP_FROM="Enterprise CRM <your_email@gmail.com>"
FRONTEND_URL=http://localhost:5173
RUN_WORKER=true
```

Thay email/App Password bằng cấu hình riêng tại máy bạn; không gửi bí mật lên chat/Git. Nếu dùng nhà cung cấp khác, dùng host/cổng/TLS của nhà cung cấp đó. `FRONTEND_URL` phải trùng địa chỉ frontend đang mở. Khởi động lại backend sau khi chỉnh.

Admin vào Quản trị người dùng sẽ thấy SMTP thiếu mục nào, số thư đang chờ, số được SMTP nhận và mã lỗi gần nhất; có nút làm mới. SMTP nhận thư chưa đồng nghĩa thư đã tới Inbox. Khi test tạo user/quên mật khẩu, dùng email do bạn kiểm soát, kiểm tra cả Spam. Yêu cầu mới gửi SMTP ngay; worker kiểm tra thư cần thử lại khoảng 30 giây. `RUN_WORKER=false` chỉ tắt vòng thử lại đi kèm, có thể chạy `npm run worker` riêng. Lỗi tác vụ lead/báo cáo không chặn mail nữa.

Tạo user gửi thông tin tài khoản/mật khẩu tạm qua SMTP; quên mật khẩu gửi liên kết dùng một lần trong 30 phút. Khi SMTP hoạt động, phản hồi quên mật khẩu luôn chung để không lộ email có tồn tại hay không; lỗi cấu hình/gửi SMTP được báo thay vì khẳng định đã gửi. Đã kiểm thử hai luồng qua socket SMTP cục bộ thật, SMTP từ chối/tiếp nhận và retry; chưa truy cập hộp thư hoặc cấu hình SMTP trên máy bạn.

## Hướng dẫn cập nhật thủ công trước đó

Dừng hai terminal backend/frontend bằng Ctrl+C. Giải nén ZIP bản vá, chép hai thư mục `backend` và `frontend` vào folder `TTCS_N1` đang dùng, đồng ý thay tệp trùng. Giữ file `backend/.env`, uploads và database đang đăng nhập được. ZIP không chứa thông tin riêng tư đó.

Bản ZIP mới sửa dropdown và Excel, đồng thời gồm các bản sửa UI trước đó. Chạy `npm ci` để bảo đảm dependency ExcelJS đã có. Chạy trong terminal backend:

```powershell
npm ci
npm run dev
```

Trong terminal frontend:

```powershell
npm ci
npm run dev
```

Tải lại bằng Ctrl+F5. Không cần tạo lại DB hay chạy migration cho bản này. Không chạy lại SQL tạo database cũ. Giữ nguyên cấu hình DB/JWT/SMTP của bạn.

## Dropdown, dữ liệu chọn và Excel — bản bổ sung

- Mọi bộ chọn có mũi tên mở danh sách bằng chuột/bàn phím và tìm theo tên, không phân biệt hoa/thường hay dấu tiếng Việt. Ngành nghề, quy mô, khu vực, nguồn, chiến dịch, khách hàng, liên hệ và người phụ trách lấy từ DB theo quyền đang đăng nhập. Form hiển thị trạng thái tải và cho thử lại nếu API lỗi.
- Lần chạy backend đầu tiên sau cập nhật sẽ bổ sung danh mục chuẩn: ngành nghề, khoảng nhân sự, nguồn lead, loại hoạt động và ba miền. Đây là các bản ghi danh mục lưu trong DB; không tạo user/khách hàng/lead/cơ hội. Giữ các mục có sẵn, chỉ khởi tạo một lần; khởi động lại không phục hồi mục bạn chủ động xóa. Có thể chạy riêng `npm run data:catalogs` trong backend. `INIT_REFERENCE_CATALOGS=false` tắt khởi tạo tự động.
- Khách hàng, lead và cơ hội chọn được các dữ liệu liên kết rồi lưu thật. Khu vực trong lead là danh sách lấy từ DB. Khi danh mục được thêm mới, mở lại form để tải danh sách cập nhật.
- “Thêm mức quy mô doanh nghiệp” là thêm khoảng nhân sự dùng chung, ví dụ “51–200 nhân sự”. Trong form có liên kết mở **Thêm khách hàng/doanh nghiệp**, nơi nhập tên doanh nghiệp thực tế.
- Xuất Excel khách hàng, lead và báo giá nháp dùng worksheet đơn giản: tiêu đề tiếng Việt, cột có độ rộng rõ, đường viền, bộ lọc, cố định hàng đầu; không còn bảng XML/comment/VML phức tạp. File rỗng vẫn có tiêu đề. Số tiền là số; điện thoại/MST là văn bản để giữ số 0 đầu.
- **Tải lại file Excel mới sau khi cập nhật**, không dùng lại file cũ đã bị Excel sửa. Mẫu người dùng có đúng sáu cột: Tên, Email, Mật khẩu tạm thời, Vai trò (RBAC), Nhóm kinh doanh, Số điện thoại. Nhập nhóm đúng tên đã tồn tại; mật khẩu để trống sẽ tự sinh, nếu nhập phải đạt quy tắc mật khẩu. Không xuất mật khẩu/hash của tài khoản có sẵn.
- Thao tác lưu/xuất có icon loading và thông báo hoàn tất/lỗi; chuyển thẻ và mở/đóng form có animation, tôn trọng cài đặt giảm chuyển động.

## Các điểm cần test

- Bấm avatar: menu Hồ sơ cá nhân / Đổi mật khẩu / Đăng xuất. Hồ sơ sửa tên, điện thoại, ảnh JPG/PNG tối đa 2 MB và chữ ký. Email, nhóm và vai trò chỉ xem trong hồ sơ; Admin quản lý tài khoản ở màn hình Quản trị người dùng.
- Bấm chuông: thông báo riêng của tài khoản. Admin/Director còn có nhật ký thao tác nhạy cảm bằng văn bản và nút xem toàn bộ nhật ký. Vai trò không có quyền nhật ký không nhận dữ liệu nhật ký từ API.
- Admin có toàn quyền các module, gồm giá vốn. Các vai trò khác giữ quyền theo User Roles. Nhật ký là lịch sử chỉ đọc cho mọi vai trò, Admin vẫn thực hiện các thao tác nghiệp vụ để tạo nhật ký mới.
- Thêm nguồn lead/ngành nghề/quy mô/loại hoạt động: tên và hướng dẫn phù hợp từng loại, mã có thể bỏ trống để hệ thống tạo duy nhất. Danh mục dùng chung được làm mới khi mở form hoặc sau khi lưu dữ liệu.
- Sales chọn được tên chiến dịch trong lead/cơ hội. API chọn chiến dịch chỉ trả mã và tên, không mở quyền xem ngân sách/báo cáo chiến dịch.
- Form lead có người phụ trách cho vai trò được phân bổ. Đổi người phụ trách cập nhật nhóm, thời hạn SLA và thông báo cùng giao dịch lưu; không được phân bổ vượt phạm vi nhóm. Form khách hàng có người phụ trách và công ty mẹ.
- Ngừng kinh doanh sản phẩm: bấm biểu tượng cấm → Xác nhận → trạng thái đổi và còn đúng sau F5; có thể kinh doanh trở lại. Báo giá cũ giữ nguyên.
- Cơ cấu tổ chức là một cây nhóm/phòng ban; bộ chọn cha loại chính nó và nhánh con. Công ty mẹ/con của khách hàng chỉnh tại form khách hàng.
- Mẫu Excel/xuất khách hàng và lead: có bảng, bộ lọc, cố định tiêu đề, độ rộng cột, hướng dẫn và danh mục mã cho mẫu nhập. Tiêu đề tiếng Việt; vẫn đọc được file cũ dùng `company_name`, `source_id`… Trường tùy chỉnh giữ mã trường. Nhập vẫn phải xem trước và xử lý trùng trước khi lưu.
- Tiền có dấu chấm nhóm nghìn, lịch lưu ngày thực, kiểm tra ngày kết thúc không trước ngày bắt đầu. Giữ animation và chế độ giảm chuyển động.

## Email tạo tài khoản và quên mật khẩu

Tạo người dùng bằng màn hình Admin hoặc Nhập Excel: hệ thống dùng mật khẩu tạm hợp lệ đã nhập hoặc tự sinh ngẫu nhiên nếu để trống, lưu hash và đưa email đăng nhập/mật khẩu tạm/liên kết đặt mật khẩu vào hàng đợi SMTP. Tài khoản phải đổi mật khẩu lần đầu. Không dùng mật khẩu chung mặc định.

Quên mật khẩu tại màn hình đăng nhập: nhập email của tài khoản đang hoạt động. Email chứa liên kết đặt mật khẩu có hiệu lực 30 phút, chỉ dùng một lần. Phản hồi UI giống nhau dù email có tồn tại hay không.

Để thư được gửi thật, `backend/.env` cần `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; `FRONTEND_URL` phải trỏ tới địa chỉ frontend bạn đang mở. Với Gmail: host `smtp.gmail.com`, port `465`, secure `true`, mật khẩu ứng dụng trong `SMTP_PASS`. Giữ worker chạy (mặc định đi kèm backend; không đặt `RUN_WORKER=false`). Worker kiểm tra khoảng 30 giây, gửi lỗi sẽ thử lại. Dòng “đã gửi yêu cầu” trên UI không chứng minh thư đã đến hộp thư.

Đã kiểm thử qua máy chủ SMTP cục bộ thật; chưa truy cập Gmail/SMTP hay hộp thư trên máy bạn. Không gửi App Password vào chat. Khi thử mail thật, dùng email bạn kiểm soát.

## Dữ liệu kiểm thử đã có

Với bản mới, chạy `npm run data:examples` để bổ sung dữ liệu chọn và dữ liệu liên kết vào DB đang dùng; tệp CMD phía trên đã thực hiện bước này. Tài khoản, dữ liệu liên kết và mật khẩu riêng nằm ở đường dẫn lệnh in ra; xem `backend/docs/EXAMPLE-DATA.md`. Dữ liệu KT là ví dụ kiểm thử, không phải khách hàng hay danh tính đã xác minh.

## Giới hạn tài khoản kiểm thử

Bộ chọn tài khoản chỉ dùng cục bộ, chỉ đọc tài khoản được tạo bởi `data:examples`, kiểm tra mật khẩu còn khớp DB, luôn tắt trong `NODE_ENV=production`. Đặt `ENABLE_TEST_ACCOUNTS=false` để tắt; không triển khai ứng dụng development ra Internet. `ALLOW_SELF_REGISTRATION=false` tắt đăng ký nếu cần. Production chỉ cho đăng ký khi đặt rõ `ALLOW_SELF_REGISTRATION=true`. ZIP không chứa `.env`, checkpoint mật khẩu, uploads hoặc DB.
