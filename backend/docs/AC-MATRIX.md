# Đối chiếu 151 AC — Sprint 1–5

Nguồn: workbook “HỆ THỐNG QUẢN LÝ KHÁCH HÀNG.xlsx”, sheet Product Backlog và User Roles. Bảng này ghi nhận phạm vi kiểm tra backend. Frontend đã được triển khai riêng; xem [đối chiếu frontend](../../frontend/docs/AC-MATRIX.md) và [kiểm chứng hiện tại](../../frontend/docs/VALIDATION.md). ZIP vượt giới hạn tải 32 MiB nên chưa được so sánh với checkout TTCS_N1 đang sử dụng. Ảnh database chỉ chứng minh tên bảng, không xác nhận kiểu cột hay dữ liệu.

**Cách đọc:** “API có + test liên quan” xác nhận mã đã có và có các kiểm thử nghiệp vụ được dẫn tới; không có nghĩa mỗi câu AC đã được nghiệm thu độc lập trên staging. “Cần UI” là phần phải kiểm tra sau khi làm frontend. Tệp test nằm trong `test/integration/`, trừ `test/rbac.test.js`. Các bước có email ngoài hệ thống, hiệu năng trên máy chủ thật và nghiệm thu PO chưa được xác nhận.

Các trạng thái dưới đây không thay thế báo cáo chạy test. Không đánh dấu toàn bộ 151 AC là đã đạt chỉ vì bộ test backend xanh.

## S1-01

Là người dùng của hệ thống, tôi muốn đăng nhập bằng email công ty và mật khẩu, để truy cập được danh mục khách hàng của mình một cách an toàn.

Mã: `src/routes/authRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js`.

| AC        | Yêu cầu từ workbook                                                              | Trạng thái kiểm chứng                  |
| --------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| S1-01.AC1 | Đăng nhập đúng thì vào được trang chủ tương ứng với vai trò                      | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S1-01.AC2 | Sai thông tin hiển thị thông báo chung, không tiết lộ email có tồn tại hay không | API có + test liên quan                |
| S1-01.AC3 | Khoá tạm 15 phút sau 5 lần sai liên tiếp                                         | API có + test liên quan                |

## S1-02

Là người dùng của hệ thống, tôi muốn duy trì phiên đăng nhập và đăng xuất an toàn, để không mất ghi chú cuộc gặp đang nhập dở khi đang ngồi ở quán cà phê.

Mã: `src/routes/authRoutes.js; core/auth.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js; scoped-support.test.js`.

| AC        | Yêu cầu từ workbook                                        | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------- | ----------------------- |
| S1-02.AC1 | Phiên được gia hạn tự động khi còn hoạt động               | API có + test liên quan |
| S1-02.AC2 | Đăng xuất làm mất hiệu lực phiên ngay lập tức phía server  | API có + test liên quan |
| S1-02.AC3 | Phiên hết hạn đưa về trang đăng nhập kèm thông báo rõ ràng | API có + test liên quan |

## S1-03

Là người dùng của hệ thống, tôi muốn đặt lại mật khẩu khi quên thông qua email, để tự lấy lại quyền truy cập khi đang đi gặp khách.

Mã: `src/routes/authRoutes.js; jobs/worker.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js; scoped-support.test.js; security-runtime.test.js; worker.test.js`.

| AC        | Yêu cầu từ workbook                                       | Trạng thái kiểm chứng                                             |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| S1-03.AC1 | Nhập email nhận được liên kết đặt lại có hiệu lực 30 phút | Có outbox + SMTP TCP test cục bộ; chưa xác nhận hộp thư bên ngoài |
| S1-03.AC2 | Liên kết chỉ dùng được một lần                            | API có + test liên quan                                           |
| S1-03.AC3 | Email không tồn tại vẫn hiển thị cùng một thông báo       | API có + test liên quan                                           |

## S1-04

Là người dùng của hệ thống, tôi muốn đổi mật khẩu khi đang đăng nhập, để chủ động bảo vệ danh mục khách hàng của mình.

Mã: `src/routes/authRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js`.

| AC        | Yêu cầu từ workbook                          | Trạng thái kiểm chứng   |
| --------- | -------------------------------------------- | ----------------------- |
| S1-04.AC1 | Bắt buộc nhập mật khẩu hiện tại              | API có + test liên quan |
| S1-04.AC2 | Mật khẩu mới tối thiểu 8 ký tự, có chữ và số | API có + test liên quan |
| S1-04.AC3 | Đổi xong thu hồi các phiên đăng nhập khác    | API có + test liên quan |

## S1-05

Là Giám đốc kinh doanh, tôi muốn có phân quyền vừa theo vai trò vừa theo dữ liệu sở hữu, để nhân viên chỉ thấy khách của mình, trưởng nhóm thấy toàn nhóm, còn tôi thấy tất cả.

Mã: `src/routes/core/access.js; customer/deal/activity/quoteRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `../rbac.test.js; security-runtime.test.js; scoped-support.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                                                    | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| S1-05.AC1 | Ba phạm vi dữ liệu: của tôi, của nhóm tôi, tất cả — áp dụng cho khách hàng, cơ hội, hoạt động, báo giá | API có + test liên quan |
| S1-05.AC2 | Mọi truy vấn danh sách tự động lọc theo phạm vi, kể cả tìm kiếm và xuất Excel                          | API có + test liên quan |
| S1-05.AC3 | Truy cập bản ghi ngoài phạm vi hiển thị thông báo tiếng Việt rõ ràng                                   | API có + test liên quan |
| S1-05.AC4 | Có kiểm thử tự động chứng minh nhân viên A không đọc được khách hàng của nhân viên B                   | API có + test liên quan |

## S1-06

Là người dùng của hệ thống, tôi muốn thấy menu điều hướng đúng theo quyền của mình, để không bị rối bởi những chức năng mình không được dùng.

Mã: `src/routes/authRoutes.js /auth/me` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js`.

| AC        | Yêu cầu từ workbook                                    | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------ | -------------------------------------- |
| S1-06.AC1 | Mục menu không thuộc quyền thì không hiển thị          | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S1-06.AC2 | Hiển thị tên, vai trò và nhóm kinh doanh đang thuộc về | API có + test liên quan                |
| S1-06.AC3 | Dùng được thuận tiện trên màn hình 360px               | Cần frontend: kiểm tra 360px           |

## S1-07

Là người dùng của hệ thống, tôi muốn nhận thông báo rõ ràng khi truy cập nhầm chỗ hoặc không đủ quyền, để biết mình nên làm gì tiếp thay vì gặp một trang trắng.

Mã: `src/routes/core/http.js; index.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `regressions.test.js`.

| AC        | Yêu cầu từ workbook                                             | Trạng thái kiểm chứng                  |
| --------- | --------------------------------------------------------------- | -------------------------------------- |
| S1-07.AC1 | Trang báo lỗi dùng chung giao diện ứng dụng                     | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S1-07.AC2 | Mỗi trang lỗi có một hành động gợi ý để quay lại luồng làm việc | API hỗ trợ; cần UI/nghiệm thu đầu cuối |

## S1-08

Là Quản trị hệ thống, tôi muốn tạo, sửa và tìm kiếm tài khoản người dùng, để cấp quyền cho nhân viên kinh doanh mới ngay ngày đầu nhận địa bàn.

Mã: `src/routes/userRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js; catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                       | Trạng thái kiểm chứng                                             |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| S1-08.AC1 | Tạo tài khoản gửi email kích hoạt kèm mật khẩu tạm        | Có outbox + SMTP TCP test cục bộ; chưa xác nhận hộp thư bên ngoài |
| S1-08.AC2 | Email trùng bị từ chối kèm thông báo cụ thể               | API có + test liên quan                                           |
| S1-08.AC3 | Tìm theo tên, email, nhóm; lọc theo vai trò và trạng thái | API có + test liên quan                                           |
| S1-08.AC4 | Danh sách phân trang, mặc định 20 dòng                    | API có + test liên quan                                           |

## S1-09

Là Quản trị hệ thống, tôi muốn gán vai trò và gắn người dùng vào nhóm kinh doanh, để cây tổ chức quyết định đúng phạm vi dữ liệu mỗi người nhìn thấy.

Mã: `src/routes/userRoutes.js; core/access.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                         | Trạng thái kiểm chứng   |
| --------- | ----------------------------------------------------------- | ----------------------- |
| S1-09.AC1 | Một người dùng có thể giữ nhiều vai trò cùng lúc            | API có + test liên quan |
| S1-09.AC2 | Người giữ vai trò Trưởng nhóm phải được gán một nhóm cụ thể | API có + test liên quan |
| S1-09.AC3 | Không thể tự thu hồi vai trò quản trị của chính mình        | API có + test liên quan |

## S1-10

Là Quản trị hệ thống, tôi muốn khoá tài khoản và bàn giao dữ liệu khi nhân viên nghỉ, để khách hàng và cơ hội không bị mất chủ khi người phụ trách rời công ty.

Mã: `src/routes/userRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                       | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------- | ----------------------- |
| S1-10.AC1 | Tài khoản bị khoá không đăng nhập được và bị thu hồi phiên đang mở        | API có + test liên quan |
| S1-10.AC2 | Bắt buộc chọn người tiếp nhận toàn bộ khách hàng và cơ hội trước khi khoá | API có + test liên quan |
| S1-10.AC3 | Việc bàn giao được ghi nhật ký, dữ liệu không bị mất chủ sở hữu           | API có + test liên quan |

## S2-01

Là Quản trị hệ thống, tôi muốn nhập danh sách người dùng hàng loạt từ tệp Excel, để tạo tài khoản cho cả khối kinh doanh trong vài phút.

Mã: `src/routes/importRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------ | ----------------------- |
| S2-01.AC1 | Tải được tệp mẫu                                                   | API có + test liên quan |
| S2-01.AC2 | Xem trước và báo lỗi theo từng dòng trước khi nhập                 | API có + test liên quan |
| S2-01.AC3 | Dòng lỗi bị bỏ qua, dòng hợp lệ vẫn được nhập, có báo cáo tổng kết | API có + test liên quan |

## S2-02

Là người dùng của hệ thống, tôi muốn xem và cập nhật hồ sơ cá nhân, để chữ ký email của tôi luôn đúng khi gửi báo giá cho khách.

Mã: `src/routes/userRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `auth.test.js`.

| AC        | Yêu cầu từ workbook                          | Trạng thái kiểm chứng   |
| --------- | -------------------------------------------- | ----------------------- |
| S2-02.AC1 | Sửa được họ tên, số điện thoại, chữ ký email | API có + test liên quan |
| S2-02.AC2 | Không tự đổi được email, nhóm và vai trò     | API có + test liên quan |
| S2-02.AC3 | Kiểm tra định dạng số điện thoại Việt Nam    | API có + test liên quan |

## S2-03

Là người dùng của hệ thống, tôi muốn tải lên ảnh đại diện, để đồng nghiệp nhận ra ai đang phụ trách khách hàng khi xem hồ sơ.

Mã: `src/routes/userRoutes.js; middleware/uploadMiddleware.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                   | Trạng thái kiểm chứng   |
| --------- | ------------------------------------- | ----------------------- |
| S2-03.AC1 | Chấp nhận JPG/PNG tối đa 2MB          | API có + test liên quan |
| S2-03.AC2 | Ảnh được cắt vuông và tạo bản thu nhỏ | API có + test liên quan |

## S2-04

Là Quản trị hệ thống, tôi muốn xem nhật ký thay đổi trên dữ liệu nhạy cảm, để truy được ai đã sửa chiết khấu hoặc chỉ tiêu khi cuối quý số liệu không khớp.

Mã: `src/routes/core/store.js; systemRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js; security-runtime.test.js; scoped-support.test.js`.

| AC        | Yêu cầu từ workbook                                                                        | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------------------------ | ----------------------- |
| S2-04.AC1 | Ghi lại mọi thay đổi trên chiết khấu, chỉ tiêu, quyền sở hữu dữ liệu và vai trò người dùng | API có + test liên quan |
| S2-04.AC2 | Mỗi bản ghi có người thực hiện, thời điểm, giá trị trước và sau                            | API có + test liên quan |
| S2-04.AC3 | Lọc theo người dùng, loại đối tượng, khoảng thời gian                                      | API có + test liên quan |

## S2-05

Là Giám đốc kinh doanh, tôi muốn quản lý danh mục sản phẩm dịch vụ và bảng giá niêm yết, để mọi báo giá đều xuất phát từ một bảng giá chuẩn thay vì giá tự nghĩ.

Mã: `src/routes/catalogRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; leads-deals.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                                                 | Trạng thái kiểm chứng   |
| --------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| S2-05.AC1 | Khai báo mã, tên, loại (sản phẩm một lần hoặc dịch vụ thuê bao), đơn vị tính, giá niêm yết, giá sàn | API có + test liên quan |
| S2-05.AC2 | Giá sàn là ngưỡng để xác định báo giá có cần duyệt chiết khấu hay không                             | API có + test liên quan |
| S2-05.AC3 | Giá vốn chỉ Giám đốc kinh doanh xem và sửa được                                                     | API có + test liên quan |
| S2-05.AC4 | Sản phẩm đã xuất hiện trong báo giá thì không xoá được, chỉ ngừng kinh doanh                        | API có + test liên quan |

## S2-06

Là Giám đốc kinh doanh, tôi muốn khai báo cơ cấu tổ chức kinh doanh, để phạm vi dữ liệu của trưởng nhóm bám đúng cây tổ chức thật.

Mã: `src/routes/organizationRoutes.js; core/access.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js; ../rbac.test.js`.

| AC        | Yêu cầu từ workbook                                                 | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------- | ----------------------- |
| S2-06.AC1 | Nhóm kinh doanh có cấu trúc cây, mỗi nhóm có một trưởng nhóm        | API có + test liên quan |
| S2-06.AC2 | Mỗi nhân viên thuộc đúng một nhóm tại một thời điểm                 | API có + test liên quan |
| S2-06.AC3 | Cây tổ chức này quyết định phạm vi dữ liệu mà Trưởng nhóm nhìn thấy | API có + test liên quan |
| S2-06.AC4 | Khai báo khu vực địa lý và gán khu vực cho nhóm                     | API có + test liên quan |

## S2-07

Là Giám đốc kinh doanh, tôi muốn khai báo các danh mục dùng chung của bán hàng, để cả khối gọi tên nguồn lead và ngành nghề giống nhau để báo cáo gộp được.

Mã: `src/routes/catalogRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                                    | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------- | ----------------------- |
| S2-07.AC1 | Ngành nghề khách hàng, quy mô doanh nghiệp, nguồn lead, loại hoạt động | API có + test liên quan |
| S2-07.AC2 | Giá trị đang được tham chiếu thì không xoá được                        | API có + test liên quan |
| S2-07.AC3 | Sắp xếp được thứ tự hiển thị                                           | API có + test liên quan |

## S2-08

Là Quản trị hệ thống, tôi muốn khai báo trường tuỳ chỉnh cho khách hàng và cơ hội, để đưa được những cột mà nhân viên đang tự thêm trong Excel vào hệ thống.

Mã: `src/routes/catalogRoutes.js; core/customFields.js; importRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; catalog-organization.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                 | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------------------- | -------------------------------------- |
| S2-08.AC1 | Thêm trường kiểu văn bản, số, ngày, danh sách chọn                  | API có + test liên quan                |
| S2-08.AC2 | Đặt được trường là bắt buộc hay không                               | API có + test liên quan                |
| S2-08.AC3 | Trường tuỳ chỉnh xuất hiện trong biểu mẫu, bộ lọc và bản xuất Excel | API hỗ trợ; cần UI/nghiệm thu đầu cuối |

## S2-09

Là Giám đốc kinh doanh, tôi muốn cấu hình các giai đoạn pipeline và xác suất thắng, để con số dự báo doanh số có cơ sở thay vì dựa vào cảm nhận.

Mã: `src/routes/catalogRoutes.js; core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js; leads-deals.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                                                         | Trạng thái kiểm chứng   |
| --------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- |
| S2-09.AC1 | Khai báo chuỗi giai đoạn, ví dụ Tiếp cận → Xác định nhu cầu → Đề xuất giải pháp → Báo giá → Đàm phán → Chốt | API có + test liên quan |
| S2-09.AC2 | Mỗi giai đoạn có xác suất thắng mặc định dùng để tính dự báo                                                | API có + test liên quan |
| S2-09.AC3 | Khai báo điều kiện bắt buộc để rời một giai đoạn, ví dụ phải có ít nhất một cuộc gặp                        | API có + test liên quan |
| S2-09.AC4 | Thay đổi cấu hình không làm hỏng cơ hội đang chạy                                                           | API có + test liên quan |

## S2-10

Là Giám đốc kinh doanh, tôi muốn khai báo danh mục lý do thắng thua và đối thủ, để năm sau không thua lại đúng chỗ đã thua năm nay.

Mã: `src/routes/catalogRoutes.js; core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js; leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                    | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------ | ----------------------- |
| S2-10.AC1 | Danh sách lý do thắng và lý do thua khai báo riêng     | API có + test liên quan |
| S2-10.AC2 | Danh sách đối thủ cạnh tranh                           | API có + test liên quan |
| S2-10.AC3 | Đây là dữ liệu bắt buộc khi đóng một cơ hội ở Sprint 5 | API có + test liên quan |

## S3-01

Là Nhân viên kinh doanh, tôi muốn quản lý hồ sơ khách hàng doanh nghiệp, để có một danh sách khách chuẩn thay vì file Excel riêng của từng người.

Mã: `src/routes/core/customers.js; customerRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; ../rbac.test.js`.

| AC        | Yêu cầu từ workbook                                                                  | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------------------ | ----------------------- |
| S3-01.AC1 | Khai báo tên công ty, mã số thuế, ngành nghề, quy mô, website, địa chỉ, người sở hữu | API có + test liên quan |
| S3-01.AC2 | Mã số thuế nếu có thì phải là duy nhất                                               | API có + test liên quan |
| S3-01.AC3 | Khách hàng có trạng thái: Tiềm năng, Đang giao dịch, Khách hàng, Ngừng hợp tác       | API có + test liên quan |
| S3-01.AC4 | Nhân viên chỉ thấy khách hàng mình sở hữu; trưởng nhóm thấy toàn nhóm                | API có + test liên quan |

## S3-02

Là Nhân viên kinh doanh, tôi muốn quản lý người liên hệ và vai trò của họ trong quyết định mua, để biết phải thuyết phục ai và ai là người có thể cản thương vụ.

Mã: `src/routes/core/customers.js; contactRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                                                      | Trạng thái kiểm chứng   |
| --------- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| S3-02.AC1 | Mỗi khách hàng có nhiều người liên hệ, mỗi người có chức danh, email, số điện thoại                      | API có + test liên quan |
| S3-02.AC2 | Đánh dấu vai trò trong quyết định mua: người quyết định, người ảnh hưởng, người dùng cuối, người cản trở | API có + test liên quan |
| S3-02.AC3 | Đánh dấu một người là đầu mối chính                                                                      | API có + test liên quan |
| S3-02.AC4 | Một người liên hệ chuyển sang công ty khác thì gắn lại được sang khách hàng mới, giữ nguyên lịch sử      | API có + test liên quan |

## S3-03

Là Nhân viên kinh doanh, tôi muốn xem trang 360 của một khách hàng, để nắm toàn bộ bối cảnh trước cuộc gặp mà không phải mở năm chỗ khác nhau.

Mã: `src/routes/customerRoutes.js /:id/360` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                                                                          | Trạng thái kiểm chứng                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| S3-03.AC1 | Một trang gom: thông tin công ty, danh sách người liên hệ, cơ hội đang mở và đã đóng, dòng thời gian hoạt động, tệp đính kèm | API hỗ trợ; cần UI/nghiệm thu đầu cuối                            |
| S3-03.AC2 | Hiển thị tổng giá trị đã ký và giá trị cơ hội đang mở                                                                        | API có + test liên quan                                           |
| S3-03.AC3 | Tải xong dưới 1,5 giây với 500 hoạt động                                                                                     | Đạt trong test API cục bộ với 500 hoạt động; chưa đo trên staging |

## S3-04

Là Trưởng nhóm kinh doanh, tôi muốn được cảnh báo và gộp khách hàng trùng, để hai nhân viên không cùng chào một công ty mà không biết nhau.

Mã: `src/routes/customerRoutes.js; core/duplicates.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                                       | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------------------------- | -------------------------------------- |
| S3-04.AC1 | Phát hiện trùng theo mã số thuế, tên công ty gần giống và website         | API có + test liên quan                |
| S3-04.AC2 | Hiển thị so sánh cạnh nhau trước khi gộp                                  | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S3-04.AC3 | Gộp giữ lại toàn bộ người liên hệ, cơ hội và hoạt động của cả hai bản ghi | API có + test liên quan                |
| S3-04.AC4 | Chỉ Trưởng nhóm trở lên được thực hiện gộp                                | API có + test liên quan                |

## S3-05

Là Nhân viên kinh doanh, tôi muốn khai báo quan hệ công ty mẹ và công ty con, để nhìn được tổng giá trị của cả tập đoàn chứ không chỉ từng pháp nhân.

Mã: `src/routes/core/customers.js; customerRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js`.

| AC        | Yêu cầu từ workbook                                                 | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------- | ----------------------- |
| S3-05.AC1 | Gắn một khách hàng làm công ty con của khách hàng khác              | API có + test liên quan |
| S3-05.AC2 | Trang công ty mẹ hiển thị tổng giá trị hợp đồng của cả nhóm công ty | API có + test liên quan |

## S3-06

Là Nhân viên kinh doanh, tôi muốn nhập danh sách khách hàng hàng loạt từ Excel, để đưa danh mục khách đang có vào hệ thống mà không gõ lại.

Mã: `src/routes/importRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js`.

| AC        | Yêu cầu từ workbook                                                             | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| S3-06.AC1 | Tải được tệp mẫu, xem trước và báo lỗi theo từng dòng                           | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S3-06.AC2 | Bản ghi trùng được đánh dấu rõ trong bản xem trước để chọn bỏ qua hoặc cập nhật | API hỗ trợ; cần UI/nghiệm thu đầu cuối |

## S3-07

Là Nhân viên kinh doanh, tôi muốn tìm kiếm và lọc khách hàng theo nhiều điều kiện, để dựng nhanh danh sách khách cần gọi trong tuần.

Mã: `src/routes/customerRoutes.js; importRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                            | Trạng thái kiểm chứng   |
| --------- | -------------------------------------------------------------- | ----------------------- |
| S3-07.AC1 | Lọc theo trạng thái, ngành nghề, quy mô, khu vực, người sở hữu | API có + test liên quan |
| S3-07.AC2 | Tìm theo tên, mã số thuế, số điện thoại người liên hệ          | API có + test liên quan |
| S3-07.AC3 | Lưu lại được bộ lọc hay dùng                                   | API có + test liên quan |

## S3-08

Là Chăm sóc khách hàng, tôi muốn ghi nhận yêu cầu hỗ trợ sau bán và gắn cờ khách có rủi ro rời bỏ, để giữ được khách hiện có thay vì chỉ chạy theo khách mới.

Mã: `src/routes/customerRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js`.

| AC        | Yêu cầu từ workbook                                                              | Trạng thái kiểm chứng                  |
| --------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| S3-08.AC1 | Ghi nhận yêu cầu hỗ trợ với mức độ ưu tiên, người xử lý và trạng thái            | API có + test liên quan                |
| S3-08.AC2 | Khách có nhiều yêu cầu chưa xử lý được gắn cờ rủi ro tự động                     | API có + test liên quan                |
| S3-08.AC3 | Cờ rủi ro hiển thị trên trang 360 và cảnh báo cho nhân viên kinh doanh phụ trách | API hỗ trợ; cần UI/nghiệm thu đầu cuối |

## S3-09

Là Chăm sóc khách hàng, tôi muốn xem danh sách khách hàng cần chăm sóc định kỳ, để không để khách đã ký hợp đồng bị bỏ quên tới lúc gia hạn.

Mã: `src/routes/customerRoutes.js; systemRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `customers.test.js; catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                                 | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------- | ----------------------- |
| S3-09.AC1 | Danh sách khách chưa có tương tác nào trong N ngày, N cấu hình được | API có + test liên quan |
| S3-09.AC2 | Sắp xếp theo giá trị hợp đồng giảm dần                              | API có + test liên quan |
| S3-09.AC3 | Đánh dấu đã liên hệ ngay trên danh sách                             | API có + test liên quan |

## S4-01

Là Nhân viên Marketing, tôi muốn thu thập lead từ biểu mẫu nhúng trên website, để mọi lead vào thẳng hệ thống thay vì nằm trong hộp thư chung.

Mã: `src/routes/leadRoutes.js /public/lead-forms` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                     | Trạng thái kiểm chứng   |
| --------- | ----------------------------------------------------------------------- | ----------------------- |
| S4-01.AC1 | Sinh mã nhúng cho một biểu mẫu, dán được vào website bất kỳ             | API có + test liên quan |
| S4-01.AC2 | Biểu mẫu gồm họ tên, email, số điện thoại, công ty, nhu cầu quan tâm    | API có + test liên quan |
| S4-01.AC3 | Có chống spam và giới hạn tần suất theo địa chỉ IP                      | API có + test liên quan |
| S4-01.AC4 | Gửi thành công tạo lead ở trạng thái Mới và gắn đúng nguồn của biểu mẫu | API có + test liên quan |

## S4-02

Là Nhân viên Marketing, tôi muốn tạo lead thủ công và nhập lead hàng loạt từ Excel, để đưa danh sách thu được từ hội thảo vào hệ thống ngay hôm sau.

Mã: `src/routes/core/leads.js; importRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                            | Trạng thái kiểm chứng                  |
| --------- | -------------------------------------------------------------- | -------------------------------------- |
| S4-02.AC1 | Nhập tay một lead từ sự kiện hoặc danh thiếp                   | API có + test liên quan                |
| S4-02.AC2 | Nhập hàng loạt có tệp mẫu, xem trước và báo lỗi theo từng dòng | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S4-02.AC3 | Mọi lead nhập vào đều bắt buộc có nguồn                        | API có + test liên quan                |

## S4-03

Là Nhân viên Marketing, tôi muốn theo dõi lead theo từng chiến dịch, để đo được chiến dịch nào thực sự ra doanh thu chứ không chỉ ra nhiều lead.

Mã: `src/routes/campaignRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------ | ----------------------- |
| S4-03.AC1 | Khai báo chiến dịch với ngân sách, thời gian chạy, kênh            | API có + test liên quan |
| S4-03.AC2 | Lead và cơ hội giữ liên kết tới chiến dịch đã sinh ra chúng        | API có + test liên quan |
| S4-03.AC3 | Xem được số lead, số cơ hội và giá trị đã chốt của từng chiến dịch | API có + test liên quan |

## S4-04

Là Nhân viên Marketing, tôi muốn được cảnh báo và gộp lead trùng, để không để hai nhân viên cùng gọi một người trong một buổi sáng.

Mã: `src/routes/leadRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                    | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------- | ----------------------- |
| S4-04.AC1 | Phát hiện trùng theo email, số điện thoại và tên công ty               | API có + test liên quan |
| S4-04.AC2 | Lead trùng với khách hàng đã có được gợi ý gắn thẳng vào khách hàng đó | API có + test liên quan |
| S4-04.AC3 | Gộp giữ nguyên lịch sử của cả hai bản ghi                              | API có + test liên quan |

## S4-05

Là Giám đốc kinh doanh, tôi muốn cấu hình chấm điểm lead theo tiêu chí khai báo được, để nhân viên gọi những lead có khả năng nhất trước.

Mã: `src/routes/core/leads.js; leadRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                                           | Trạng thái kiểm chứng   |
| --------- | --------------------------------------------------------------------------------------------- | ----------------------- |
| S4-05.AC1 | Khai báo tiêu chí và số điểm: ngành nghề phù hợp, quy mô doanh nghiệp, nguồn, mức độ quan tâm | API có + test liên quan |
| S4-05.AC2 | Điểm được tính lại tự động khi thông tin lead thay đổi                                        | API có + test liên quan |
| S4-05.AC3 | Phân loại Nóng, Ấm, Lạnh theo ngưỡng điểm khai báo được                                       | API có + test liên quan |
| S4-05.AC4 | Điểm chỉ để sắp xếp ưu tiên, không tự động loại lead                                          | API có + test liên quan |

## S4-06

Là Giám đốc kinh doanh, tôi muốn cấu hình quy tắc phân bổ lead tự động, để lead tới tay người phụ trách trong vài phút thay vì chờ họp giao ban.

Mã: `src/routes/core/leads.js; jobs/worker.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; worker.test.js`.

| AC        | Yêu cầu từ workbook                                                   | Trạng thái kiểm chứng                                              |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| S4-06.AC1 | Phân bổ theo khu vực, theo ngành nghề, hoặc xoay vòng đều trong nhóm  | API có + test liên quan                                            |
| S4-06.AC2 | Nhiều quy tắc xếp theo thứ tự ưu tiên, quy tắc đầu tiên khớp sẽ thắng | API có + test liên quan                                            |
| S4-06.AC3 | Lead không khớp quy tắc nào rơi vào hàng chờ để trưởng nhóm phân tay  | API có + test liên quan                                            |
| S4-06.AC4 | Phân bổ chạy nền, hoàn tất trong vòng 5 phút kể từ khi lead vào       | Có worker 30 giây + test scheduler thật; chưa kiểm thử tải staging |

## S4-07

Là Nhân viên kinh doanh, tôi muốn nhận hoặc từ chối lead được phân, có ràng buộc SLA phản hồi, để lead không nằm im ba ngày rồi nguội hẳn.

Mã: `src/routes/leadRoutes.js; jobs/worker.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                          | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------------- | ----------------------- |
| S4-07.AC1 | Nhân viên nhận lead thì lead chuyển sang Đang chăm sóc                       | API có + test liên quan |
| S4-07.AC2 | Từ chối bắt buộc nhập lý do, lead quay lại hàng chờ phân bổ                  | API có + test liên quan |
| S4-07.AC3 | Quá SLA phản hồi mà chưa liên hệ thì lead được gắn cờ và báo cho trưởng nhóm | API có + test liên quan |

## S4-08

Là Nhân viên kinh doanh, tôi muốn chuyển một lead đủ điều kiện thành khách hàng và cơ hội, để không phải nhập lại thông tin đã hỏi khách ba lần.

Mã: `src/routes/leadRoutes.js; core/customers.js; core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                                   | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------------------- | ----------------------- |
| S4-08.AC1 | Một thao tác sinh đồng thời khách hàng doanh nghiệp, người liên hệ và cơ hội bán hàng | API có + test liên quan |
| S4-08.AC2 | Dữ liệu lead được chuyển sang, không phải nhập lại                                    | API có + test liên quan |
| S4-08.AC3 | Lead chuyển sang trạng thái Đã chuyển đổi và không sửa được nữa                       | API có + test liên quan |
| S4-08.AC4 | Toàn bộ hoạt động đã ghi trên lead được giữ lại trên khách hàng mới                   | API có + test liên quan |

## S4-09

Là Nhân viên kinh doanh, tôi muốn xem danh sách lead với bộ lọc và bộ lọc lưu sẵn, để mở máy buổi sáng là biết ngay hôm nay cần gọi ai.

Mã: `src/routes/leadRoutes.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                                                   | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------------------------------------- | -------------------------------------- |
| S4-09.AC1 | Lọc theo trạng thái, nguồn, phân loại nóng ấm lạnh, người phụ trách, khoảng thời gian | API có + test liên quan                |
| S4-09.AC2 | Lead quá SLA hiển thị nổi bật                                                         | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S4-09.AC3 | Lưu và đặt tên cho bộ lọc hay dùng                                                    | API có + test liên quan                |

## S5-01

Là Nhân viên kinh doanh, tôi muốn tạo và quản lý một cơ hội bán hàng, để thương vụ nằm trong hệ thống thay vì trong trí nhớ của tôi.

Mã: `src/routes/core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                                                        | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------------------------------------------- | ----------------------- |
| S5-01.AC1 | Khai báo tên cơ hội, khách hàng, người liên hệ chính, giai đoạn, giá trị dự kiến, ngày dự kiến chốt, nguồn | API có + test liên quan |
| S5-01.AC2 | Xác suất thắng lấy mặc định theo giai đoạn, sửa tay được kèm ghi chú                                       | API có + test liên quan |
| S5-01.AC3 | Một khách hàng có thể có nhiều cơ hội song song                                                            | API có + test liên quan |
| S5-01.AC4 | Ngày dự kiến chốt không được ở quá khứ khi tạo mới                                                         | API có + test liên quan |

## S5-02

Là Nhân viên kinh doanh, tôi muốn điều hành các cơ hội trên bảng pipeline dạng kanban, để nhìn một màn hình là biết thương vụ nào đang tắc.

Mã: `src/routes/dealRoutes.js /kanban` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                                        | Trạng thái kiểm chứng                  |
| --------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| S5-02.AC1 | Mỗi cột là một giai đoạn, hiển thị số cơ hội và tổng giá trị của cột                       | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S5-02.AC2 | Kéo thả để chuyển giai đoạn                                                                | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S5-02.AC3 | Thẻ cơ hội hiển thị tên khách, giá trị, ngày dự kiến chốt và cảnh báo nếu đình trệ         | API hỗ trợ; cần UI/nghiệm thu đầu cuối |
| S5-02.AC4 | Lọc theo người sở hữu, nhóm, khoảng ngày chốt; nhân viên mặc định chỉ thấy cơ hội của mình | API có + test liên quan                |

## S5-03

Là Nhân viên kinh doanh, tôi muốn thêm sản phẩm dịch vụ vào cơ hội để ra giá trị hợp đồng, để giá trị cơ hội là con số có căn cứ chứ không phải ước lượng.

Mã: `src/routes/dealRoutes.js /:id/items` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; regressions.test.js`.

| AC        | Yêu cầu từ workbook                                                                            | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| S5-03.AC1 | Chọn sản phẩm từ danh mục, nhập số lượng và đơn giá, đơn giá mặc định lấy từ bảng giá niêm yết | API có + test liên quan |
| S5-03.AC2 | Giá trị cơ hội được tính lại tự động từ các dòng sản phẩm                                      | API có + test liên quan |
| S5-03.AC3 | Với dịch vụ thuê bao, khai báo được số kỳ và giá trị hợp đồng theo năm                         | API có + test liên quan |

## S5-04

Là Giám đốc kinh doanh, tôi muốn có điều kiện bắt buộc khi cơ hội rời một giai đoạn, để pipeline phản ánh thực tế thay vì bị đẩy giai đoạn cho đẹp báo cáo.

Mã: `src/routes/core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; scoped-support.test.js`.

| AC        | Yêu cầu từ workbook                                                                                      | Trạng thái kiểm chứng   |
| --------- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| S5-04.AC1 | Không cho chuyển giai đoạn nếu chưa thoả điều kiện đã cấu hình, ví dụ chưa có cuộc gặp nào được ghi nhận | API có + test liên quan |
| S5-04.AC2 | Thông báo nêu rõ còn thiếu điều kiện gì                                                                  | API có + test liên quan |
| S5-04.AC3 | Trưởng nhóm trở lên có thể ghi đè kèm lý do                                                              | API có + test liên quan |

## S5-05

Là Nhân viên kinh doanh, tôi muốn đóng một cơ hội với kết quả thắng hoặc thua, để công ty học được từ cả thương vụ thắng lẫn thua.

Mã: `src/routes/core/deals.js` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                          | Trạng thái kiểm chứng   |
| --------- | ---------------------------------------------------------------------------- | ----------------------- |
| S5-05.AC1 | Đóng Thắng bắt buộc nhập giá trị chốt thực tế và ngày ký                     | API có + test liên quan |
| S5-05.AC2 | Đóng Thua bắt buộc chọn lý do thua và đối thủ thắng thầu nếu có              | API có + test liên quan |
| S5-05.AC3 | Cơ hội đã đóng không sửa được, chỉ Trưởng nhóm trở lên mở lại được kèm lý do | API có + test liên quan |
| S5-05.AC4 | Cơ hội thắng được tính vào chỉ tiêu của người sở hữu                         | API có + test liên quan |

## S5-06

Là Giám đốc kinh doanh, tôi muốn xem dự báo doanh số tính theo trọng số xác suất, để trả lời được câu hỏi tháng này về bao nhiêu bằng số liệu.

Mã: `src/routes/dealRoutes.js /forecast; systemRoutes.js /targets` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; catalog-organization.test.js`.

| AC        | Yêu cầu từ workbook                                                   | Trạng thái kiểm chứng   |
| --------- | --------------------------------------------------------------------- | ----------------------- |
| S5-06.AC1 | Dự báo bằng tổng của giá trị cơ hội nhân xác suất thắng của giai đoạn | API có + test liên quan |
| S5-06.AC2 | Nhóm theo kỳ dự kiến chốt: tháng này, tháng sau, quý này              | API có + test liên quan |
| S5-06.AC3 | So sánh dự báo với chỉ tiêu và với số đã chốt thực tế                 | API có + test liên quan |
| S5-06.AC4 | Xem được theo từng nhân viên và từng nhóm                             | API có + test liên quan |

## S5-07

Là Trưởng nhóm kinh doanh, tôi muốn được cảnh báo khi cơ hội đình trệ, để can thiệp sớm thay vì phát hiện khi thương vụ đã nguội.

Mã: `src/routes/jobs/worker.js; dealRoutes.js /flagged` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js`.

| AC        | Yêu cầu từ workbook                                                                    | Trạng thái kiểm chứng                               |
| --------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| S5-07.AC1 | Cơ hội không có hoạt động nào trong N ngày được gắn cờ, N cấu hình theo từng giai đoạn | API có + test liên quan                             |
| S5-07.AC2 | Cơ hội quá ngày dự kiến chốt mà chưa đóng cũng được gắn cờ                             | API có + test liên quan                             |
| S5-07.AC3 | Danh sách cơ hội có cờ hiển thị riêng cho trưởng nhóm                                  | API có + test liên quan                             |
| S5-07.AC4 | Tác vụ đánh giá chạy mỗi ngày một lần                                                  | Có daily job lưu mốc UTC trong MySQL + test tính cờ |

## S5-08

Là Trưởng nhóm kinh doanh, tôi muốn phân bổ lại cơ hội cho người khác trong nhóm, để thương vụ không đứng yên khi người phụ trách nghỉ dài hoặc quá tải.

Mã: `src/routes/dealRoutes.js /reassign` (các đường `core/`, `jobs/` tương đối với `src/`). Test liên quan: `leads-deals.test.js; security-runtime.test.js`.

| AC        | Yêu cầu từ workbook                                                       | Trạng thái kiểm chứng   |
| --------- | ------------------------------------------------------------------------- | ----------------------- |
| S5-08.AC1 | Chuyển quyền sở hữu một hoặc nhiều cơ hội cùng lúc                        | API có + test liên quan |
| S5-08.AC2 | Người nhận thấy ngay cơ hội trong danh sách của mình cùng toàn bộ lịch sử | API có + test liên quan |
| S5-08.AC3 | Mỗi lần chuyển được ghi nhật ký kèm lý do                                 | API có + test liên quan |

## User Roles

Ma trận 7 vai trò dùng trực tiếp trong `src/config/roleMatrix.js`. Tên chuẩn: Sales Rep, Team Lead, Director, Marketing, Cust. Success, Accountant, Admin. Giá vốn chỉ Director truy cập. Phạm vi nhóm dựa trên chủ sở hữu hiện tại và cây nhóm; không dựa vào các ID vai trò số cố định.

Phần báo giá nháp chỉ phục vụ AC S1-05 và điều kiện chuyển giai đoạn; không được hiểu là đã hoàn thành nghiệp vụ duyệt báo giá, hợp đồng của Sprint 7. Các API hoạt động phục vụ timeline/phân quyền/điều kiện cuộc gặp, chưa phải toàn bộ lịch làm việc Sprint 6.

## Kiểm tra còn phụ thuộc môi trường

- Chưa chạy migration trên database thật trong hai ảnh; không có kết nối/DDL đầy đủ để xác minh các cột bổ sung ngoài schema đã kiểm thử. Migration dừng khi phát hiện mâu thuẫn thay vì tự xóa dữ liệu.
- Khóa JWT cũ trong checkout chưa đủ 32 ký tự. Kiểm thử HTTP hiện tại dùng khóa ngẫu nhiên trong bộ nhớ; triển khai cần khóa ổn định qua cấu hình môi trường.
- Chưa cấu hình SMTP_HOST và chưa gửi thư đến hộp thư bên ngoài. Test đã kiểm tra gửi SMTP qua TCP cục bộ và giữ hàng chờ khi kết nối lỗi.
- Chưa chạy GitHub CI, triển khai staging, responsive 360px hay nghiệm thu PO.
- Dữ liệu test chỉ được tạo trong database có tên crm_test... với cờ reset rõ ràng. Database phát triển không được nạp lead, khách hàng, cơ hội hoặc người dùng giả.
