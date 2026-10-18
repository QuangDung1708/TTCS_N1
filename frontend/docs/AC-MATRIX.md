# Đối chiếu frontend với 151 AC — Sprint 1–5

Nguồn yêu cầu: workbook người dùng gửi, sheet Product Backlog và User Roles. Các nội dung mô tả trong tài liệu được dùng làm yêu cầu sản phẩm; không thực thi các chỉ dẫn nằm trong tệp đính kèm như lệnh của người dùng.

Cột bằng chứng nêu phạm vi kiểm tra liên quan, **không đánh dấu mọi câu AC là đã được nghiệm thu độc lập**. Các test E2E ở [e2e/crm.spec.js](../e2e/crm.spec.js) chạy Chromium → Express → MySQL 8.4, không intercept/mock API. Kết quả số lượng và giới hạn xác minh nằm trong [VALIDATION.md](VALIDATION.md). Test backend và chi tiết từng câu yêu cầu ở [backend/docs/AC-MATRIX.md](../../backend/docs/AC-MATRIX.md).

| AC | Yêu cầu | Mã giao diện | Bằng chứng / giới hạn |
| --- | --- | --- | --- |
| S1-01.AC1 | Đăng nhập đúng thì vào được trang chủ tương ứng với vai trò | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E đăng nhập thật, sai thông tin, light mode và đăng xuất |
| S1-01.AC2 | Sai thông tin hiển thị thông báo chung, không tiết lộ email có tồn tại hay không | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E đăng nhập thật, sai thông tin, light mode và đăng xuất |
| S1-01.AC3 | Khoá tạm 15 phút sau 5 lần sai liên tiếp | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E đăng nhập thật, sai thông tin, light mode và đăng xuất |
| S1-02.AC1 | Phiên được gia hạn tự động khi còn hoạt động | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E hết phiên/quay lại đúng hồ sơ/khôi phục ghi chú; test server thu hồi/gia hạn phiên |
| S1-02.AC2 | Đăng xuất làm mất hiệu lực phiên ngay lập tức phía server | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E hết phiên/quay lại đúng hồ sơ/khôi phục ghi chú; test server thu hồi/gia hạn phiên |
| S1-02.AC3 | Phiên hết hạn đưa về trang đăng nhập kèm thông báo rõ ràng | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | E2E hết phiên/quay lại đúng hồ sơ/khôi phục ghi chú; test server thu hồi/gia hạn phiên |
| S1-03.AC1 | Nhập email nhận được liên kết đặt lại có hiệu lực 30 phút | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI quên/đặt lại mật khẩu + test API token/SMTP TCP cục bộ; chưa kiểm tra hộp thư ngoài. |
| S1-03.AC2 | Liên kết chỉ dùng được một lần | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI quên/đặt lại mật khẩu + test API token/SMTP TCP cục bộ; chưa kiểm tra hộp thư ngoài. |
| S1-03.AC3 | Email không tồn tại vẫn hiển thị cùng một thông báo | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI quên/đặt lại mật khẩu + test API token/SMTP TCP cục bộ; chưa kiểm tra hộp thư ngoài. |
| S1-04.AC1 | Bắt buộc nhập mật khẩu hiện tại | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI kiểm tra mật khẩu hiện tại/mới/nhập lại; backend test thu hồi phiên khác. Chưa có E2E đổi mật khẩu riêng. |
| S1-04.AC2 | Mật khẩu mới tối thiểu 8 ký tự, có chữ và số | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI kiểm tra mật khẩu hiện tại/mới/nhập lại; backend test thu hồi phiên khác. Chưa có E2E đổi mật khẩu riêng. |
| S1-04.AC3 | Đổi xong thu hồi các phiên đăng nhập khác | [src/screens/AuthScreens.jsx](../src/screens/AuthScreens.jsx); [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx) | UI kiểm tra mật khẩu hiện tại/mới/nhập lại; backend test thu hồi phiên khác. Chưa có E2E đổi mật khẩu riêng. |
| S1-05.AC1 | Ba phạm vi dữ liệu: của tôi, của nhóm tôi, tất cả — áp dụng cho khách hàng, cơ hội, hoạt động, báo giá | [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx); [src/App.jsx](../src/App.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Quotes.jsx](../src/screens/Quotes.jsx) | E2E 7 vai trò và đa vai trò; test backend đọc/ghi/export ngoài phạm vi |
| S1-05.AC2 | Mọi truy vấn danh sách tự động lọc theo phạm vi, kể cả tìm kiếm và xuất Excel | [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx); [src/App.jsx](../src/App.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Quotes.jsx](../src/screens/Quotes.jsx) | E2E 7 vai trò và đa vai trò; test backend đọc/ghi/export ngoài phạm vi |
| S1-05.AC3 | Truy cập bản ghi ngoài phạm vi hiển thị thông báo tiếng Việt rõ ràng | [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx); [src/App.jsx](../src/App.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Quotes.jsx](../src/screens/Quotes.jsx) | E2E 7 vai trò và đa vai trò; test backend đọc/ghi/export ngoài phạm vi |
| S1-05.AC4 | Có kiểm thử tự động chứng minh nhân viên A không đọc được khách hàng của nhân viên B | [src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx); [src/App.jsx](../src/App.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Quotes.jsx](../src/screens/Quotes.jsx) | E2E 7 vai trò và đa vai trò; test backend đọc/ghi/export ngoài phạm vi |
| S1-06.AC1 | Mục menu không thuộc quyền thì không hiển thị | [src/App.jsx](../src/App.jsx); [src/index.css](../src/index.css) | E2E menu 7 vai trò và viewport 360px |
| S1-06.AC2 | Hiển thị tên, vai trò và nhóm kinh doanh đang thuộc về | [src/App.jsx](../src/App.jsx); [src/index.css](../src/index.css) | E2E menu 7 vai trò và viewport 360px |
| S1-06.AC3 | Dùng được thuận tiện trên màn hình 360px | [src/App.jsx](../src/App.jsx); [src/index.css](../src/index.css) | E2E menu 7 vai trò và viewport 360px |
| S1-07.AC1 | Trang báo lỗi dùng chung giao diện ứng dụng | [src/App.jsx](../src/App.jsx); [src/ui/common.jsx](../src/ui/common.jsx) | E2E route bị từ chối trong layout; nút quay về có trong UI |
| S1-07.AC2 | Mỗi trang lỗi có một hành động gợi ý để quay lại luồng làm việc | [src/App.jsx](../src/App.jsx); [src/ui/common.jsx](../src/ui/common.jsx) | E2E route bị từ chối trong layout; nút quay về có trong UI |
| S1-08.AC1 | Tạo tài khoản gửi email kích hoạt kèm mật khẩu tạm | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E tạo/sửa tài khoản; backend kiểm tra trùng email |
| S1-08.AC2 | Email trùng bị từ chối kèm thông báo cụ thể | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E tạo/sửa tài khoản; backend kiểm tra trùng email |
| S1-08.AC3 | Tìm theo tên, email, nhóm; lọc theo vai trò và trạng thái | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E tạo/sửa tài khoản; backend kiểm tra trùng email |
| S1-08.AC4 | Danh sách phân trang, mặc định 20 dòng | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E tạo/sửa tài khoản; backend kiểm tra trùng email |
| S1-09.AC1 | Một người dùng có thể giữ nhiều vai trò cùng lúc | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E nhiều vai trò và quyền đọc/ghi tách biệt |
| S1-09.AC2 | Người giữ vai trò Trưởng nhóm phải được gán một nhóm cụ thể | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E nhiều vai trò và quyền đọc/ghi tách biệt |
| S1-09.AC3 | Không thể tự thu hồi vai trò quản trị của chính mình | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E nhiều vai trò và quyền đọc/ghi tách biệt |
| S1-10.AC1 | Tài khoản bị khoá không đăng nhập được và bị thu hồi phiên đang mở | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E khóa kèm người nhận; backend kiểm tra bàn giao toàn bộ/thu hồi phiên |
| S1-10.AC2 | Bắt buộc chọn người tiếp nhận toàn bộ khách hàng và cơ hội trước khi khoá | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E khóa kèm người nhận; backend kiểm tra bàn giao toàn bộ/thu hồi phiên |
| S1-10.AC3 | Việc bàn giao được ghi nhật ký, dữ liệu không bị mất chủ sở hữu | [src/screens/Users.jsx](../src/screens/Users.jsx) | E2E khóa kèm người nhận; backend kiểm tra bàn giao toàn bộ/thu hồi phiên |
| S2-01.AC1 | Tải được tệp mẫu | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Users.jsx](../src/screens/Users.jsx) | UI nhập Excel người dùng dùng chung; backend kiểm tra từng dòng; E2E cùng bộ nhập trên khách hàng |
| S2-01.AC2 | Xem trước và báo lỗi theo từng dòng trước khi nhập | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Users.jsx](../src/screens/Users.jsx) | UI nhập Excel người dùng dùng chung; backend kiểm tra từng dòng; E2E cùng bộ nhập trên khách hàng |
| S2-01.AC3 | Dòng lỗi bị bỏ qua, dòng hợp lệ vẫn được nhập, có báo cáo tổng kết | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Users.jsx](../src/screens/Users.jsx) | UI nhập Excel người dùng dùng chung; backend kiểm tra từng dòng; E2E cùng bộ nhập trên khách hàng |
| S2-02.AC1 | Sửa được họ tên, số điện thoại, chữ ký email | [src/ui/Profile.jsx](../src/ui/Profile.jsx) | E2E chỉnh hồ sơ, chữ ký, số điện thoại không hợp lệ |
| S2-02.AC2 | Không tự đổi được email, nhóm và vai trò | [src/ui/Profile.jsx](../src/ui/Profile.jsx) | E2E chỉnh hồ sơ, chữ ký, số điện thoại không hợp lệ |
| S2-02.AC3 | Kiểm tra định dạng số điện thoại Việt Nam | [src/ui/Profile.jsx](../src/ui/Profile.jsx) | E2E chỉnh hồ sơ, chữ ký, số điện thoại không hợp lệ |
| S2-03.AC1 | Chấp nhận JPG/PNG tối đa 2MB | [src/ui/Profile.jsx](../src/ui/Profile.jsx) | E2E ảnh PNG thật; backend test giới hạn/resize/thumbnail |
| S2-03.AC2 | Ảnh được cắt vuông và tạo bản thu nhỏ | [src/ui/Profile.jsx](../src/ui/Profile.jsx) | E2E ảnh PNG thật; backend test giới hạn/resize/thumbnail |
| S2-04.AC1 | Ghi lại mọi thay đổi trên chiết khấu, chỉ tiêu, quyền sở hữu dữ liệu và vai trò người dùng | [src/screens/Audit.jsx](../src/screens/Audit.jsx) | E2E audit vai trò và lọc; backend kiểm tra before/after, che giá vốn |
| S2-04.AC2 | Mỗi bản ghi có người thực hiện, thời điểm, giá trị trước và sau | [src/screens/Audit.jsx](../src/screens/Audit.jsx) | E2E audit vai trò và lọc; backend kiểm tra before/after, che giá vốn |
| S2-04.AC3 | Lọc theo người dùng, loại đối tượng, khoảng thời gian | [src/screens/Audit.jsx](../src/screens/Audit.jsx) | E2E audit vai trò và lọc; backend kiểm tra before/after, che giá vốn |
| S2-05.AC1 | Khai báo mã, tên, loại (sản phẩm một lần hoặc dịch vụ thuê bao), đơn vị tính, giá niêm yết, giá sàn | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | E2E cột/nút theo 7 vai trò; backend test giá/loại/trạng thái/tham chiếu |
| S2-05.AC2 | Giá sàn là ngưỡng để xác định báo giá có cần duyệt chiết khấu hay không | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | E2E cột/nút theo 7 vai trò; backend test giá/loại/trạng thái/tham chiếu |
| S2-05.AC3 | Giá vốn chỉ Giám đốc kinh doanh xem và sửa được | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | E2E cột/nút theo 7 vai trò; backend test giá/loại/trạng thái/tham chiếu |
| S2-05.AC4 | Sản phẩm đã xuất hiện trong báo giá thì không xoá được, chỉ ngừng kinh doanh | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | E2E cột/nút theo 7 vai trò; backend test giá/loại/trạng thái/tham chiếu |
| S2-06.AC1 | Nhóm kinh doanh có cấu trúc cây, mỗi nhóm có một trưởng nhóm | [src/screens/Organization.jsx](../src/screens/Organization.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-06.AC2 | Mỗi nhân viên thuộc đúng một nhóm tại một thời điểm | [src/screens/Organization.jsx](../src/screens/Organization.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-06.AC3 | Cây tổ chức này quyết định phạm vi dữ liệu mà Trưởng nhóm nhìn thấy | [src/screens/Organization.jsx](../src/screens/Organization.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-06.AC4 | Khai báo khu vực địa lý và gán khu vực cho nhóm | [src/screens/Organization.jsx](../src/screens/Organization.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-07.AC1 | Ngành nghề khách hàng, quy mô doanh nghiệp, nguồn lead, loại hoạt động | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-07.AC2 | Giá trị đang được tham chiếu thì không xoá được | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-07.AC3 | Sắp xếp được thứ tự hiển thị | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-08.AC1 | Thêm trường kiểu văn bản, số, ngày, danh sách chọn | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/ui/common.jsx](../src/ui/common.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E bắt buộc nhập, lọc/lưu bộ lọc/xuất trường tùy chỉnh; backend test 4 kiểu |
| S2-08.AC2 | Đặt được trường là bắt buộc hay không | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/ui/common.jsx](../src/ui/common.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E bắt buộc nhập, lọc/lưu bộ lọc/xuất trường tùy chỉnh; backend test 4 kiểu |
| S2-08.AC3 | Trường tuỳ chỉnh xuất hiện trong biểu mẫu, bộ lọc và bản xuất Excel | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/ui/common.jsx](../src/ui/common.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E bắt buộc nhập, lọc/lưu bộ lọc/xuất trường tùy chỉnh; backend test 4 kiểu |
| S2-09.AC1 | Khai báo chuỗi giai đoạn, ví dụ Tiếp cận → Xác định nhu cầu → Đề xuất giải pháp → Báo giá → Đàm phán → Chốt | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-09.AC2 | Mỗi giai đoạn có xác suất thắng mặc định dùng để tính dự báo | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-09.AC3 | Khai báo điều kiện bắt buộc để rời một giai đoạn, ví dụ phải có ít nhất một cuộc gặp | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-09.AC4 | Thay đổi cấu hình không làm hỏng cơ hội đang chạy | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-10.AC1 | Danh sách lý do thắng và lý do thua khai báo riêng | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-10.AC2 | Danh sách đối thủ cạnh tranh | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S2-10.AC3 | Đây là dữ liệu bắt buộc khi đóng một cơ hội ở Sprint 5 | [src/screens/Catalogs.jsx](../src/screens/Catalogs.jsx); [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-01.AC1 | Khai báo tên công ty, mã số thuế, ngành nghề, quy mô, website, địa chỉ, người sở hữu | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tạo/tải lại, phạm vi Sales/Team Lead; backend test MST duy nhất |
| S3-01.AC2 | Mã số thuế nếu có thì phải là duy nhất | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tạo/tải lại, phạm vi Sales/Team Lead; backend test MST duy nhất |
| S3-01.AC3 | Khách hàng có trạng thái: Tiềm năng, Đang giao dịch, Khách hàng, Ngừng hợp tác | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tạo/tải lại, phạm vi Sales/Team Lead; backend test MST duy nhất |
| S3-01.AC4 | Nhân viên chỉ thấy khách hàng mình sở hữu; trưởng nhóm thấy toàn nhóm | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tạo/tải lại, phạm vi Sales/Team Lead; backend test MST duy nhất |
| S3-02.AC1 | Mỗi khách hàng có nhiều người liên hệ, mỗi người có chức danh, email, số điện thoại | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E thêm liên hệ thật; UI có đầu mối chính/chuyển công ty; backend test các ràng buộc |
| S3-02.AC2 | Đánh dấu vai trò trong quyết định mua: người quyết định, người ảnh hưởng, người dùng cuối, người cản trở | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E thêm liên hệ thật; UI có đầu mối chính/chuyển công ty; backend test các ràng buộc |
| S3-02.AC3 | Đánh dấu một người là đầu mối chính | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E thêm liên hệ thật; UI có đầu mối chính/chuyển công ty; backend test các ràng buộc |
| S3-02.AC4 | Một người liên hệ chuyển sang công ty khác thì gắn lại được sang khách hàng mới, giữ nguyên lịch sử | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E thêm liên hệ thật; UI có đầu mối chính/chuyển công ty; backend test các ràng buộc |
| S3-03.AC1 | Một trang gom: thông tin công ty, danh sách người liên hệ, cơ hội đang mở và đã đóng, dòng thời gian hoạt động, tệp đính kèm | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E hồ sơ, ghi chú và tệp tải lên/xuống; backend test tổng tiền/500 hoạt động |
| S3-03.AC2 | Hiển thị tổng giá trị đã ký và giá trị cơ hội đang mở | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E hồ sơ, ghi chú và tệp tải lên/xuống; backend test tổng tiền/500 hoạt động |
| S3-03.AC3 | Tải xong dưới 1,5 giây với 500 hoạt động | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Backend đo <1,5 giây với 500 hoạt động tại máy kiểm thử; chưa xác nhận thời gian UI trên staging. |
| S3-04.AC1 | Phát hiện trùng theo mã số thuế, tên công ty gần giống và website | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-04.AC2 | Hiển thị so sánh cạnh nhau trước khi gộp | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-04.AC3 | Gộp giữ lại toàn bộ người liên hệ, cơ hội và hoạt động của cả hai bản ghi | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-04.AC4 | Chỉ Trưởng nhóm trở lên được thực hiện gộp | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-05.AC1 | Gắn một khách hàng làm công ty con của khách hàng khác | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-05.AC2 | Trang công ty mẹ hiển thị tổng giá trị hợp đồng của cả nhóm công ty | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-06.AC1 | Tải được tệp mẫu, xem trước và báo lỗi theo từng dòng | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tải mẫu, preview dòng trùng/lỗi, nhập hợp lệ và kết quả |
| S3-06.AC2 | Bản ghi trùng được đánh dấu rõ trong bản xem trước để chọn bỏ qua hoặc cập nhật | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E tải mẫu, preview dòng trùng/lỗi, nhập hợp lệ và kết quả |
| S3-07.AC1 | Lọc theo trạng thái, ngành nghề, quy mô, khu vực, người sở hữu | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E trường tùy chỉnh, saved filter, export; backend kiểm tra phạm vi tìm kiếm |
| S3-07.AC2 | Tìm theo tên, mã số thuế, số điện thoại người liên hệ | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E trường tùy chỉnh, saved filter, export; backend kiểm tra phạm vi tìm kiếm |
| S3-07.AC3 | Lưu lại được bộ lọc hay dùng | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E trường tùy chỉnh, saved filter, export; backend kiểm tra phạm vi tìm kiếm |
| S3-08.AC1 | Ghi nhận yêu cầu hỗ trợ với mức độ ưu tiên, người xử lý và trạng thái | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E hai yêu cầu hỗ trợ tạo cờ rủi ro thật; backend kiểm tra thông báo |
| S3-08.AC2 | Khách có nhiều yêu cầu chưa xử lý được gắn cờ rủi ro tự động | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E hai yêu cầu hỗ trợ tạo cờ rủi ro thật; backend kiểm tra thông báo |
| S3-08.AC3 | Cờ rủi ro hiển thị trên trang 360 và cảnh báo cho nhân viên kinh doanh phụ trách | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | E2E hai yêu cầu hỗ trợ tạo cờ rủi ro thật; backend kiểm tra thông báo |
| S3-09.AC1 | Danh sách khách chưa có tương tác nào trong N ngày, N cấu hình được | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-09.AC2 | Sắp xếp theo giá trị hợp đồng giảm dần | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S3-09.AC3 | Đánh dấu đã liên hệ ngay trên danh sách | [src/screens/Customers.jsx](../src/screens/Customers.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-01.AC1 | Sinh mã nhúng cho một biểu mẫu, dán được vào website bất kỳ | [src/screens/PublicLeadForm.jsx](../src/screens/PublicLeadForm.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E biểu mẫu Ant Design công khai tạo lead có nguồn trong MySQL; backend test chữ ký/chống spam |
| S4-01.AC2 | Biểu mẫu gồm họ tên, email, số điện thoại, công ty, nhu cầu quan tâm | [src/screens/PublicLeadForm.jsx](../src/screens/PublicLeadForm.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E biểu mẫu Ant Design công khai tạo lead có nguồn trong MySQL; backend test chữ ký/chống spam |
| S4-01.AC3 | Có chống spam và giới hạn tần suất theo địa chỉ IP | [src/screens/PublicLeadForm.jsx](../src/screens/PublicLeadForm.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E biểu mẫu Ant Design công khai tạo lead có nguồn trong MySQL; backend test chữ ký/chống spam |
| S4-01.AC4 | Gửi thành công tạo lead ở trạng thái Mới và gắn đúng nguồn của biểu mẫu | [src/screens/PublicLeadForm.jsx](../src/screens/PublicLeadForm.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E biểu mẫu Ant Design công khai tạo lead có nguồn trong MySQL; backend test chữ ký/chống spam |
| S4-02.AC1 | Nhập tay một lead từ sự kiện hoặc danh thiếp | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhập lead thủ công; UI Excel dùng chung, backend test import lead |
| S4-02.AC2 | Nhập hàng loạt có tệp mẫu, xem trước và báo lỗi theo từng dòng | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhập lead thủ công; UI Excel dùng chung, backend test import lead |
| S4-02.AC3 | Mọi lead nhập vào đều bắt buộc có nguồn | [src/ui/ExcelImport.jsx](../src/ui/ExcelImport.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhập lead thủ công; UI Excel dùng chung, backend test import lead |
| S4-03.AC1 | Khai báo chiến dịch với ngân sách, thời gian chạy, kênh | [src/screens/Campaigns.jsx](../src/screens/Campaigns.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-03.AC2 | Lead và cơ hội giữ liên kết tới chiến dịch đã sinh ra chúng | [src/screens/Campaigns.jsx](../src/screens/Campaigns.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-03.AC3 | Xem được số lead, số cơ hội và giá trị đã chốt của từng chiến dịch | [src/screens/Campaigns.jsx](../src/screens/Campaigns.jsx); [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-04.AC1 | Phát hiện trùng theo email, số điện thoại và tên công ty | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-04.AC2 | Lead trùng với khách hàng đã có được gợi ý gắn thẳng vào khách hàng đó | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-04.AC3 | Gộp giữ nguyên lịch sử của cả hai bản ghi | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-05.AC1 | Khai báo tiêu chí và số điểm: ngành nghề phù hợp, quy mô doanh nghiệp, nguồn, mức độ quan tâm | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E cấu hình theo tên nguồn từ API, tạo lead tự tính điểm/phân loại Nóng; test backend kiểm tra các tiêu chí/ngưỡng. |
| S4-05.AC2 | Điểm được tính lại tự động khi thông tin lead thay đổi | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E cấu hình theo tên nguồn từ API, tạo lead tự tính điểm/phân loại Nóng; test backend kiểm tra các tiêu chí/ngưỡng. |
| S4-05.AC3 | Phân loại Nóng, Ấm, Lạnh theo ngưỡng điểm khai báo được | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E cấu hình theo tên nguồn từ API, tạo lead tự tính điểm/phân loại Nóng; test backend kiểm tra các tiêu chí/ngưỡng. |
| S4-05.AC4 | Điểm chỉ để sắp xếp ưu tiên, không tự động loại lead | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E cấu hình theo tên nguồn từ API, tạo lead tự tính điểm/phân loại Nóng; test backend kiểm tra các tiêu chí/ngưỡng. |
| S4-06.AC1 | Phân bổ theo khu vực, theo ngành nghề, hoặc xoay vòng đều trong nhóm | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-06.AC2 | Nhiều quy tắc xếp theo thứ tự ưu tiên, quy tắc đầu tiên khớp sẽ thắng | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-06.AC3 | Lead không khớp quy tắc nào rơi vào hàng chờ để trưởng nhóm phân tay | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-06.AC4 | Phân bổ chạy nền, hoàn tất trong vòng 5 phút kể từ khi lead vào | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Worker 30 giây đã có test scheduler thật; chưa đo tải staging. |
| S4-07.AC1 | Nhân viên nhận lead thì lead chuyển sang Đang chăm sóc | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhận lead; UI từ chối có lý do, backend test SLA/từ chối |
| S4-07.AC2 | Từ chối bắt buộc nhập lý do, lead quay lại hàng chờ phân bổ | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhận lead; UI từ chối có lý do, backend test SLA/từ chối |
| S4-07.AC3 | Quá SLA phản hồi mà chưa liên hệ thì lead được gắn cờ và báo cho trưởng nhóm | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E nhận lead; UI từ chối có lý do, backend test SLA/từ chối |
| S4-08.AC1 | Một thao tác sinh đồng thời khách hàng doanh nghiệp, người liên hệ và cơ hội bán hàng | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E tạo lead/nhận/ghi chú/chuyển đổi/giữ lịch sử/khóa sửa |
| S4-08.AC2 | Dữ liệu lead được chuyển sang, không phải nhập lại | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E tạo lead/nhận/ghi chú/chuyển đổi/giữ lịch sử/khóa sửa |
| S4-08.AC3 | Lead chuyển sang trạng thái Đã chuyển đổi và không sửa được nữa | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E tạo lead/nhận/ghi chú/chuyển đổi/giữ lịch sử/khóa sửa |
| S4-08.AC4 | Toàn bộ hoạt động đã ghi trên lead được giữ lại trên khách hàng mới | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | E2E tạo lead/nhận/ghi chú/chuyển đổi/giữ lịch sử/khóa sửa |
| S4-09.AC1 | Lọc theo trạng thái, nguồn, phân loại nóng ấm lạnh, người phụ trách, khoảng thời gian | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-09.AC2 | Lead quá SLA hiển thị nổi bật | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S4-09.AC3 | Lưu và đặt tên cho bộ lọc hay dùng | [src/screens/Leads.jsx](../src/screens/Leads.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S5-01.AC1 | Khai báo tên cơ hội, khách hàng, người liên hệ chính, giai đoạn, giá trị dự kiến, ngày dự kiến chốt, nguồn | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E tạo cơ hội qua API thật trong drag/override; UI đầy đủ biểu mẫu, backend test các trường |
| S5-01.AC2 | Xác suất thắng lấy mặc định theo giai đoạn, sửa tay được kèm ghi chú | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E tạo cơ hội qua API thật trong drag/override; UI đầy đủ biểu mẫu, backend test các trường |
| S5-01.AC3 | Một khách hàng có thể có nhiều cơ hội song song | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E tạo cơ hội qua API thật trong drag/override; UI đầy đủ biểu mẫu, backend test các trường |
| S5-01.AC4 | Ngày dự kiến chốt không được ở quá khứ khi tạo mới | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E tạo cơ hội qua API thật trong drag/override; UI đầy đủ biểu mẫu, backend test các trường |
| S5-02.AC1 | Mỗi cột là một giai đoạn, hiển thị số cơ hội và tổng giá trị của cột | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E kéo thả bằng con trỏ, lưu stage trong MySQL; nút thay thế được kiểm tra |
| S5-02.AC2 | Kéo thả để chuyển giai đoạn | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E kéo thả bằng con trỏ, lưu stage trong MySQL; nút thay thế được kiểm tra |
| S5-02.AC3 | Thẻ cơ hội hiển thị tên khách, giá trị, ngày dự kiến chốt và cảnh báo nếu đình trệ | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E kéo thả bằng con trỏ, lưu stage trong MySQL; nút thay thế được kiểm tra |
| S5-02.AC4 | Lọc theo người sở hữu, nhóm, khoảng ngày chốt; nhân viên mặc định chỉ thấy cơ hội của mình | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E kéo thả bằng con trỏ, lưu stage trong MySQL; nút thay thế được kiểm tra |
| S5-03.AC1 | Chọn sản phẩm từ danh mục, nhập số lượng và đơn giá, đơn giá mặc định lấy từ bảng giá niêm yết | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn thuê bao/giá mặc định/SL/số kỳ/tổng tiền |
| S5-03.AC2 | Giá trị cơ hội được tính lại tự động từ các dòng sản phẩm | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn thuê bao/giá mặc định/SL/số kỳ/tổng tiền |
| S5-03.AC3 | Với dịch vụ thuê bao, khai báo được số kỳ và giá trị hợp đồng theo năm | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn thuê bao/giá mặc định/SL/số kỳ/tổng tiền |
| S5-04.AC1 | Không cho chuyển giai đoạn nếu chưa thoả điều kiện đã cấu hình, ví dụ chưa có cuộc gặp nào được ghi nhận | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chặn thiếu cuộc gặp, ghi nhận cuộc gặp, ghi đè bắt buộc lý do |
| S5-04.AC2 | Thông báo nêu rõ còn thiếu điều kiện gì | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chặn thiếu cuộc gặp, ghi nhận cuộc gặp, ghi đè bắt buộc lý do |
| S5-04.AC3 | Trưởng nhóm trở lên có thể ghi đè kèm lý do | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chặn thiếu cuộc gặp, ghi nhận cuộc gặp, ghi đè bắt buộc lý do |
| S5-05.AC1 | Đóng Thắng bắt buộc nhập giá trị chốt thực tế và ngày ký | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chốt thắng/khóa sửa theo vai trò; backend test thua/mở lại/ghi nhận doanh số |
| S5-05.AC2 | Đóng Thua bắt buộc chọn lý do thua và đối thủ thắng thầu nếu có | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chốt thắng/khóa sửa theo vai trò; backend test thua/mở lại/ghi nhận doanh số |
| S5-05.AC3 | Cơ hội đã đóng không sửa được, chỉ Trưởng nhóm trở lên mở lại được kèm lý do | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chốt thắng/khóa sửa theo vai trò; backend test thua/mở lại/ghi nhận doanh số |
| S5-05.AC4 | Cơ hội thắng được tính vào chỉ tiêu của người sở hữu | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chốt thắng/khóa sửa theo vai trò; backend test thua/mở lại/ghi nhận doanh số |
| S5-06.AC1 | Dự báo bằng tổng của giá trị cơ hội nhân xác suất thắng của giai đoạn | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E dự báo/giá trị thực đã chốt; backend test kỳ/nhóm/người/chỉ tiêu |
| S5-06.AC2 | Nhóm theo kỳ dự kiến chốt: tháng này, tháng sau, quý này | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E dự báo/giá trị thực đã chốt; backend test kỳ/nhóm/người/chỉ tiêu |
| S5-06.AC3 | So sánh dự báo với chỉ tiêu và với số đã chốt thực tế | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E dự báo/giá trị thực đã chốt; backend test kỳ/nhóm/người/chỉ tiêu |
| S5-06.AC4 | Xem được theo từng nhân viên và từng nhóm | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E dự báo/giá trị thực đã chốt; backend test kỳ/nhóm/người/chỉ tiêu |
| S5-07.AC1 | Cơ hội không có hoạt động nào trong N ngày được gắn cờ, N cấu hình theo từng giai đoạn | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S5-07.AC2 | Cơ hội quá ngày dự kiến chốt mà chưa đóng cũng được gắn cờ | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S5-07.AC3 | Danh sách cơ hội có cờ hiển thị riêng cho trưởng nhóm | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S5-07.AC4 | Tác vụ đánh giá chạy mỗi ngày một lần | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | Đã có UI nối API thật; test backend liên quan. Luồng UI chuyên biệt chưa có E2E độc lập. |
| S5-08.AC1 | Chuyển quyền sở hữu một hoặc nhiều cơ hội cùng lúc | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn nhiều dòng và phân bổ; backend test giao dịch/audit/phạm vi |
| S5-08.AC2 | Người nhận thấy ngay cơ hội trong danh sách của mình cùng toàn bộ lịch sử | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn nhiều dòng và phân bổ; backend test giao dịch/audit/phạm vi |
| S5-08.AC3 | Mỗi lần chuyển được ghi nhật ký kèm lý do | [src/screens/Pipeline.jsx](../src/screens/Pipeline.jsx) | E2E chọn nhiều dòng và phân bổ; backend test giao dịch/audit/phạm vi |

## Quy tắc User Roles

Ma trận đọc từ API đang áp dụng trên server. UI không tự khai báo một bản ma trận khác. `AuthProvider.can` hợp nhất grants theo thao tác và kiểm tra bản ghi theo chủ sở hữu/cây nhóm do server cung cấp. API vẫn quyết định quyền cuối cùng.

| Vai trò | Kiểm soát chính trên UI |
| --- | --- |
| Admin | Toàn quyền tất cả module, tài khoản, danh mục, cấu hình, giá vốn và nhật ký. |
| Director | Toàn bộ dữ liệu kinh doanh, giá vốn, cấu hình, nhật ký; chỉ xem tài khoản, không tạo/sửa/khóa. |
| Team Lead | Dữ liệu thuộc cây nhóm; phân bổ, override có lý do; danh mục chỉ xem. |
| Sales Rep | Khách hàng/lead/cơ hội của mình; thao tác ghi theo bản ghi; danh mục chỉ xem. |
| Marketing | Lead, chiến dịch, biểu mẫu; cơ hội chỉ xem, không có nút tạo/chuyển đổi thành cơ hội khi chưa được cấp quyền ghi. |
| Cust. Success | Khách hàng được giao, chăm sóc/hỗ trợ; không có lead; cơ hội/báo giá theo quyền xem. |
| Accountant | Khách hàng/cơ hội chỉ xem; không có lead hoặc trình ghi hoạt động; báo giá theo grants. |

Theo yêu cầu ngày 18/10/2026: Admin có toàn quyền, gồm giá vốn/biên lợi nhuận và audit; Director cũng được quản lý giá vốn. Đa vai trò: quyền đọc rộng không tự mở rộng quyền sửa. Biểu mẫu website công khai chỉ nhận dữ liệu có chữ ký và nguồn xác định trên server.

## Phụ thuộc triển khai

Chưa áp dụng migration vào MySQL thật trong ảnh của người dùng; chưa xác minh mailbox SMTP ngoài, hiệu năng staging, tương thích mọi dữ liệu cũ trong ZIP hoặc nghiệm thu PO. ZIP gốc vượt giới hạn tải công cụ nên phạm vi sửa là checkout TTCS_N1 trên nhánh đang làm. Các giới hạn này không được chuyển thành nhãn “đã đạt” chỉ vì build/test xanh.

## Bổ sung theo phản hồi ngày 18/10/2026

- S2-02/03: menu tài khoản mở bằng pointer/keyboard; hồ sơ tên/điện thoại/chữ ký và upload ảnh; email/nhóm/vai trò chỉ xem trong hồ sơ. Chỉnh quyền tài khoản ở Quản trị người dùng.
- S2-05/07: xác nhận đổi trạng thái sản phẩm bằng Modal, mã danh mục tự sinh nếu bỏ trống, form có tên/hướng dẫn riêng từng loại.
- S2-06/S3-05: bộ chọn cây nhóm và công ty mẹ/con loại nhánh gây vòng lặp; API vẫn kiểm tra độc lập. Hai cây tách thành hai thẻ rõ ràng.
- S3-01/S4-02: người phụ trách trong form lead/khách; phân bổ lead cập nhật cùng giao dịch và giữ kiểm tra scope. API chiến dịch dạng lựa chọn không trả ngân sách/báo cáo.
- S2-01/S3-06: ExcelJS tạo bảng có bộ lọc, dòng tiêu đề cố định, độ rộng cột, trang hướng dẫn và danh mục; nhập tiêu đề tiếng Việt lẫn kỹ thuật cũ; hỗ trợ trường tùy chỉnh đã cấu hình.
- S1-03/08: mail text/HTML, tài khoản/mật khẩu tạm/liên kết đặt mật khẩu; quên mật khẩu gửi token 30 phút một lần; kiểm thử SMTP cục bộ và reset qua API/UI.

Các ca bổ sung nằm tại `backend/test/integration/usability.test.js`, kiểm thử SMTP tại `security-runtime.test.js`, kiểm thử pointer và dữ liệu lưu thật tại `frontend/e2e/crm.spec.js`. Kết quả thực chạy được ghi tại VALIDATION.md.

## Dropdown, Excel và phản hồi thao tác — bổ sung

S3-01/S4-02/S5-01: kiểm thử pointer mở từng bộ chọn, gõ tên không dấu, chọn ngành nghề/quy mô/khu vực/nguồn/chiến dịch/khách hàng/liên hệ/giai đoạn/người phụ trách rồi kiểm tra bản ghi qua API thật. `LinkedSelect` dùng chung cho các màn hình; không chặn mũi tên bằng handler click tùy biến.

S2-01/S3-06 và báo giá: worksheet đơn giản thay structured table/comment, kiểm tra XML và đọc bằng openpyxl độc lập; byte tải bằng trình duyệt khớp payload API. Mẫu user sáu cột theo ảnh, hỗ trợ mật khẩu tạm tùy chọn và tên nhóm có sẵn, giữ mẫu cũ. Không xuất hash hoặc mật khẩu hiện tại.

Danh mục tham chiếu được lưu DB một lần, giữ cấu hình sẵn có; khởi động lại không hoàn nguyên thao tác xóa. Form quy mô nêu rõ khoảng nhân sự và dẫn tới form tạo doanh nghiệp có tên. Loading/success được kiểm tra trên request lưu thật; chuyển thẻ có animation và reduced-motion. Các ca nằm trong `e2e/dropdowns-excel.spec.js` và `backend/test/integration/usability.test.js`.

## Rà toàn bộ dropdown và SMTP theo phản hồi tiếp theo

78 điểm dùng bộ chọn trong source hiện tại được rà và dùng chung `LinkedSelect`: trigger là nút chỉ chọn, tìm trong popup, không nhập giá trị tự do. Bộ chọn cha thụt cấp, lọc nhánh bị cấm; bảng cây không thay đổi. Các bộ chọn liên hệ phụ thuộc khách hàng. Danh sách rỗng hiển thị trạng thái, không tạo dữ liệu dự phòng trong UI. Chi tiết nguồn dữ liệu theo màn hình tại [DROPDOWNS-AND-MAIL.md](DROPDOWNS-AND-MAIL.md).

S3-01/S4-02/S5-01: CLI nạp danh mục và bản ghi liên kết thật; tùy chọn email để tạo dữ liệu thuộc tài khoản đang test, không mở rộng quyền. Có ca nâng cấp checkpoint cũ, chạy lại giữ số lượng/hash mật khẩu, đối chiếu API dưới vai trò Sales.

S1-03/S1-08: kiểm tra SMTP config/verify, Admin thấy queue/mã lỗi; không trả recipient/body/secret qua status API. Thư tạo tài khoản chứa mật khẩu tạm đăng nhập được và yêu cầu đổi lần đầu. Token lấy từ thư SMTP reset dùng được đúng một lần. Worker gửi mail dù business job lỗi; từ chối recipient giữ pending và retry thành công. Kiểm thử máy chủ SMTP cục bộ thật, chưa xác minh hộp thư người dùng.
