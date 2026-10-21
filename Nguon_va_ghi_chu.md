# Ghi chú thuyết trình — Enterprise CRM, Sprint 1–4

26 slide; nội dung chính slide 1–22 (15–20 phút), phụ lục 23–26. Nội dung ghi chú cũng nằm trong Speaker Notes của PowerPoint.

## Slide 01 — Enterprise CRM

Mở đầu: Nhóm trình bày hệ thống Enterprise CRM trong phạm vi bốn sprint đầu. Câu chuyện xuyên suốt là tạo nền tảng truy cập an toàn, chuẩn hóa dữ liệu rồi hỗ trợ đội ngũ tiếp nhận và xử lý lead. Tài liệu tổng hợp yêu cầu, ảnh giao diện và kết quả đã ghi nhận. Trạng thái Jira lấy từ snapshot 18/10/2026, không phải trạng thái live ngày thuyết trình. Thời lượng gợi ý: 15–20 phút nội dung chính, phần phụ lục dùng khi trả lời câu hỏi.

## Slide 02 — Bài toán: thông tin rời rạc, xử lý chậm

Giải thích bài toán bằng ví dụ: cùng một doanh nghiệp được hai nhân viên lưu riêng, người quản lý không biết ai đang phụ trách. Khi lead từ website đến, việc giao cho nhân viên chậm sẽ làm mất cơ hội. Hệ thống được thiết kế để giảm phân mảnh, kiểm soát quyền và tạo trách nhiệm xử lý rõ ràng. Đây là mục tiêu nghiệp vụ, chưa phải số liệu đo mức tăng doanh thu sau triển khai.

## Slide 03 — Lộ trình bốn sprint

Các con số lấy từ sheet Sprint Plan của file HỆ THỐNG QUẢN LÝ KHÁCH HÀNG.xlsx. Cộng bốn sprint là 38 story và 172 point. Point là ước lượng của kế hoạch, không quy đổi thành tỷ lệ hoàn thành và không dùng để khẳng định năng suất thực. Một số mã story giữa backlog và Jira đã thay đổi, vì vậy bài trình bày nhóm theo chức năng; phụ lục chỉ ra chênh lệch cần đối chiếu.

## Slide 04 — Bảy vai trò, ba phạm vi dữ liệu

Có bảy vai trò trong tài liệu yêu cầu: Sales Rep, Team Lead, Director, Marketing, Customer Success, Accountant và Admin. Không khẳng định mọi vai trò vận hành đều có quyền đọc toàn bộ dữ liệu; quyền thực lấy từ ma trận phân quyền. Cần kiểm tra cả module, hành động và phạm vi sở hữu. Quyền được thực thi phía server, không chỉ ẩn menu ở frontend.

## Slide 05 — Kiến trúc hệ thống

Kiến trúc lấy từ repository CRM chính: React 19, Ant Design 6, Node/Express, mysql2 và MySQL; Nodemailer cho mail, ExcelJS cho workbook. Worker xử lý tác vụ nền. Đăng nhập/biểu mẫu công khai là ngoại lệ của nhóm API nội bộ. Các bản mẫu quên mật khẩu và nhập người dùng gần đây là dự án độc lập dùng JSON, không được nhầm với DB MySQL của CRM chính.

## Slide 06 — Sprint 1 — Truy cập an toàn

Trình bày theo ba nhóm chức năng thay vì đọc mười story. Kịch bản cốt lõi là đăng nhập bằng hai nhân viên khác nhau rồi truy cập bản ghi ngoài phạm vi, kể cả thử API trực tiếp. Danh sách, tìm kiếm và xuất Excel cũng phải áp dụng phạm vi. Trạng thái Jira của login và forgot password trong snapshot còn In Progress; chức năng chạy được không tự động thay đổi trạng thái nghiệm thu.

## Slide 07 — Giao diện truy cập theo vai trò

Giới thiệu màn hình đăng nhập đang có trong CRM. Các nút tài khoản theo vai trò là tiện ích test, không thay thế cơ chế xác thực. Ảnh là bằng chứng giao diện, không phải log nghiệm thu từng AC. Đăng ký OTP là mở rộng đã làm sau đó, không dùng để tính thêm story trong kế hoạch Sprint 1. Không đưa mật khẩu SMTP hoặc tài khoản cá nhân lên slide.

## Slide 08 — Phân quyền phải nằm ở backend

Nếu được hỏi RBAC là gì, trả lời đó là phân quyền theo vai trò. Hệ thống còn bổ sung phạm vi dữ liệu để người có cùng chức năng không nhìn thấy dữ liệu của nhau. Ví dụ Sales Rep A và B đều dùng mục khách hàng nhưng danh sách được lọc theo người sở hữu. Truy vấn chi tiết, xuất file và quan hệ liên quan cũng phải kiểm tra cùng phạm vi; không chỉ lọc trên UI.

## Slide 09 — Khôi phục mật khẩu qua email

Phân biệt hai cách kiểm tra mail. Bản mẫu mặc định MAIL_MODE=file chỉ ghi email ra outbox; muốn nhận Gmail phải chọn smtp, seed đúng email nhận rồi restart backend. Trong CRM, mail đi qua hàng đợi và cấu hình SMTP riêng. Một SMTP response thành công chưa chứng minh người nhận thấy mail. Thay đổi khóa login 15 giây là yêu cầu của người dùng để test nhanh, khác AC gốc 15 phút; phải ghi nhận thay đổi yêu cầu trước nghiệm thu, không nói hai cấu hình giống nhau.

## Slide 10 — Sprint 2 — Chuẩn hóa cấu hình

Sprint 2 là nền cấu hình cho các sprint sau: nguồn lead phục vụ Sprint 4, cây nhóm phục vụ quyền TEAM, giai đoạn phục vụ cơ hội và dự báo. Theo snapshot Jira, 10 story chính S2 đều Done. Tuy nhiên N1-125/S2-02 trên Jira đang mô tả liên hệ thay vì hồ sơ cá nhân như backlog gốc, cần đối chiếu nội dung, không suy ra tất cả AC hồ sơ đã nghiệm thu chỉ từ mã Done.

## Slide 11 — Cây tổ chức quyết định phạm vi nhóm

Giải thích vì sao cây tổ chức không chỉ để hiển thị đẹp: nó xác định nhân sự và phạm vi dữ liệu của người quản lý. Bản UI đã được sửa để giữ căn lề, biểu tượng và thao tác theo cấp. Sơ đồ trong slide là hình vẽ minh họa có thể chỉnh sửa bằng PowerPoint; không dùng để tuyên bố đây là cơ cấu nhân sự thật của nhóm dự án.

## Slide 12 — Nhập Excel: kiểm tra trước, ghi sau

Đây là task N1-279 vừa làm độc lập, có subtask N1-287 Backend và N1-288 Frontend. Ảnh test có 2 dòng hợp lệ và 4 dòng lỗi. Xem trước không ghi DB, xác nhận mới lưu; backend kiểm tra lại chống nhập trùng. Bản mẫu dùng JSON, cổng 5057, .xlsx tối đa 2 MB/1.000 dòng; không gửi email và không có auth Admin. CRM chính dùng MySQL, cơ chế import và giới hạn riêng; không đồng nhất hai cấu hình. Demo riêng này minh họa ba AC nhập người dùng của kế hoạch Sprint 2, không tự cập nhật trạng thái Jira mới.

## Slide 13 — Sprint 3 — Một danh mục khách hàng chung

Ảnh là giao diện khách hàng thật từ repository, dữ liệu dùng cho test. Trình bày các thao tác tạo/sửa hồ sơ, thêm người liên hệ và tìm kiếm theo điều kiện. Mã số thuế nếu có cần duy nhất. Mục tiêu không phải chỉ lưu thông tin công ty mà còn duy trì người phụ trách, hoạt động và các quan hệ để hỗ trợ quyết định bán hàng. Sprint 3 có 3 story Done và 6 In Progress trong snapshot.

## Slide 14 — Khách hàng 360: đủ bối cảnh trước cuộc gặp

Khái niệm 360 là tập hợp nhiều đối tượng liên quan quanh một khách hàng. KPI giá trị đã ký cần bám dữ liệu Won hoặc hợp đồng theo định nghĩa hệ thống; giá trị cơ hội mở không phải doanh thu đã ghi nhận. Công ty mẹ có thể tổng hợp giá trị các công ty con nhưng vẫn phải tôn trọng phạm vi dữ liệu. Không tuyên bố đã đạt mốc 1,5 giây/500 hoạt động nếu chưa có benchmark tương ứng cho bản đang review.

## Slide 15 — Làm sạch dữ liệu, giữ nguyên lịch sử

Giải thích sự khác nhau giữa phát hiện gần trùng và nhập trùng hoàn toàn: gần trùng cần xem xét để gộp, còn bản ghi giống hệt khi import cần báo không hợp lệ. Với gộp khách hàng, phải giữ liên hệ, cơ hội, hoạt động và tệp theo triển khai, đồng thời bảo vệ quan hệ mẹ/con và quyền sở hữu. Ví dụ trong slide là sơ đồ nghiệp vụ, không phải một lần gộp dữ liệu thật. Trạng thái parent story gộp trên snapshot còn In Progress.

## Slide 16 — Sprint 4 — Từ nguồn lead đến người phụ trách

Tóm tắt chín US Sprint 4: webform, manual/Excel, chiến dịch, trùng/gộp, chấm điểm, phân bổ, SLA, chuyển đổi và bộ lọc. Webform cần đúng nguồn và chống spam; import phải có nguồn. Chuyển đổi cần thực hiện đồng bộ để không tạo khách hàng nhưng thiếu contact/cơ hội. Tại snapshot 18/10 toàn bộ 46 issue S4, gồm 9 story và 37 subtask, vẫn To Do; không giới thiệu đây là sprint đã Done.

## Slide 17 — Điểm lead là quy tắc, không phải ô nhập tay

Đây là câu hỏi người dùng đã gặp khi không sửa được cột điểm. Theo AC S4-05, người quản lý sửa quy tắc, trọng số và ngưỡng phân loại; điểm của từng lead là kết quả tự tính. Sửa trực tiếp điểm sẽ làm lệch quy tắc và khó giải thích vì sao một lead được ưu tiên. Ví dụ 20+10+15+5=50 chỉ để minh họa, cần dùng giá trị cấu hình thật khi demo.

## Slide 18 — Phân bổ và SLA tạo trách nhiệm xử lý

Không dùng thời gian mặc định trên bản dev để thay thế yêu cầu nghiệp vụ. Tài liệu audit từng ghi mặc định SLA 60 phút trong khi subtask Jira có nhắc 3 ngày; phải thống nhất cấu hình trước demo. SLA phản hồi khác với mục tiêu hoàn tất phân bổ trong 5 phút. Kết quả chức năng có thể pass nhưng chưa chứng minh giới hạn 5 phút dưới tải thực tế.

## Slide 19 — Trạng thái Jira: ảnh chụp ngày 18/10

Số liệu được tính trực tiếp từ file Jira_N1_cap_nhat_18-10-2026.xlsx, chỉ lấy story chính có nhãn S1 đến S4 và nội dung Là... Tất cả 199 issue của file có 135 Done, 9 In Progress, 55 To Do, nhưng đó là tập gồm cả epic/subtask, không dùng thay tỷ lệ 38 story. S4 có code/test đã ghi nhận không làm thay đổi bản export cũ. Cần xuất Jira mới hoặc xác nhận nghiệm thu để cập nhật slide tiến độ trước buổi báo cáo.

## Slide 20 — Kiểm thử có bằng chứng, có phạm vi

Nguồn kiểm thử CRM: login-lock-full-mysql.log và login-lock-full-maria.log báo 121/121, 14 suite; ci-fixtures-full-browser.log báo 50 passed. Frontend workflow run 39185149415 đã Success tại commit e370c679. Bản mẫu N1-279 có 11 node:test và đã kiểm tra Chromium, không cộng vào 121 như cùng một suite. Audit Sprint 4 riêng báo 47/47 nhưng vẫn phát hiện lead MERGED còn được gợi ý trùng. Không dùng test count để khẳng định benchmark hoặc gửi thư đến mailbox thật.

## Slide 21 — Kịch bản demo hệ thống trong 7 phút

Chuẩn bị trước DB test, tài khoản theo vai trò và file Excel chứa cả dòng đúng/sai. Đừng gửi mail tới địa chỉ ví dụ .test. Phần demo ưu tiên luồng đã kiểm tra; với S4 cần thống nhất cấu hình trước, lỗi gợi ý MERGED cần công khai nếu xuất hiện. Nếu dùng bản mẫu N1-279 cổng 5057 phải nói rõ đang chuyển sang demo độc lập, không nói đó là module đã tích hợp CRM. Không làm reset DB trong buổi demo trên dữ liệu thật.

## Slide 22 — Kết quả và hướng hoàn thiện

Kết lại bằng ba giá trị có thể giải thích được, không tuyên bố đã tăng doanh thu khi chưa có dữ liệu vận hành. Việc tiếp theo gồm xác nhận thay đổi login 15 giây, chốt các story còn In Progress/To Do, sửa lead MERGED còn gợi ý trùng, đo tốc độ 360 và thời gian phân bổ. Mời người nghe góp ý vào tiêu chí chấp nhận hoặc luồng sử dụng cụ thể. Các slide sau là phụ lục để trả lời câu hỏi.

## Slide 23 — Phụ lục — Những điểm cần chốt trước review

Dẫn chứng lỗi S4-04 nằm trong reports/Sprint_4_audit_evidence.json: merged_lead_still_suggested=true, dù gộp HTTP 200 và giữ lịch sử A/B. Đây là trạng thái khi audit; chưa có bằng chứng sửa sau đó trong tài liệu dùng làm slide. Không đổi Jira thành Done hoặc ghi hoàn tất sau ngày snapshot nếu chưa có xác nhận. Những điểm này cần rà lại trên phiên bản đem demo, vì code và yêu cầu có thể đã thay đổi.

## Slide 24 — Phụ lục — Nhóm thực hiện

Danh sách nhóm dựa vào Jira và ảnh phân công trong trao đổi. Dùng tên Nguyễn Thùy Chang theo Jira, dù ảnh nhật ký mẫu trước đó có chỗ ghi Trang. Không suy ra mọi công việc của mỗi người đúng theo vai trò trong slide; assignment của từng issue và thực tế nhóm mới là nguồn chốt. Nhóm nên xác nhận lại tên và phần đóng góp trước khi nộp báo cáo.

## Slide 25 — Phụ lục — Câu hỏi thường gặp

Nếu hỏi vì sao chọn Sprint 3 để review: nó có câu chuyện khách hàng đầy đủ, nhưng cần chốt 6 story In Progress trong snapshot. Nếu chỉ chọn theo trạng thái Done đã ghi nhận, Sprint 2 an toàn hơn với 10/10 story chính Done, đồng thời vẫn phải kiểm tra nội dung S2-02 bị lệch giữa hai tài liệu. Nếu hỏi về bảo mật mật khẩu trong file Excel: file nguồn có mật khẩu tạm, cần giữ riêng; server băm khi lưu, không xuất mật khẩu trong báo cáo.

## Slide 26 — Phụ lục — Nguồn và cách đọc số liệu

Nguồn chi tiết được cung cấp trong file Nguon_va_ghi_chu.md cạnh PowerPoint. Không dùng trạng thái Chưa bắt đầu trong backlog gốc như trạng thái Jira hiện tại. Không coi Updated là ngày làm hoặc ngày xong. Code CRM kiểm thử login ở source 0fff42de; CI frontend thành công ở e370c679, workflow 39185149415. Demo import N1-279 nguồn b05296f, bản giao ZIP c7de1ee. Các ảnh được chọn không chứa .env hoặc mật khẩu SMTP. Cần cập nhật số liệu nếu nhóm cung cấp Jira mới.

## Nguồn đối chiếu

- HỆ THỐNG QUẢN LÝ KHÁCH HÀNG.xlsx — Product Backlog, Sprint Plan và User Roles.
- Jira_N1_cap_nhat_18-10-2026.xlsx — Danh sách Jira, snapshot 18/10/2026.
- TTCS_N1/reports/API_N1_Theo_Jira.md; De_xuat_Sprint_Review.md; Huong_dan_test_Sprint_4.md; Sprint_4_audit_evidence.json.
- Log CRM: login-lock-full-mysql.log, login-lock-full-maria.log (121/121, 14 suite); ci-fixtures-full-browser.log (50/50).
- Frontend CI đã ghi nhận Success: https://github.com/QuangDung1708/TTCS_N1/actions/runs/39185149415
- Demo nhập người dùng N1-279: source b05296f, artifacts c7de1ee; 11 test backend/API và kiểm tra Chromium.
- Ảnh: frontend/docs/images/login-roles-desktop.png, customers-desktop.png; ảnh demo import user-import-preview.png.

Không chạy lại toàn bộ CRM khi tạo slide. Chỉ dùng kết quả đã được ghi nhận, không coi slide là chứng nhận mọi AC đã đạt.
