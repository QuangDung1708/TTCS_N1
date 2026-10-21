# Những thông tin và screenshot cần bổ sung

Bản slide giữ template ICTU/CodeGym; không dựng ảnh Jira/Git hoặc tự điền các tỷ lệ chưa có nguồn. Slide đánh số theo bản dự thảo 51 trang, gồm khung cá nhân cho 10 thành viên.

## Gửi trước 5 nhóm dữ liệu sau

1. Thông tin bìa và lịch: tên nhóm, mentor, đơn vị, trường/ngành/lớp, kỳ thực tập, ngày báo cáo, ngày Sprint 0–4.
2. Jira: URL board, ảnh Backlog, Velocity, Burndown; SP cam kết/hoàn thành thực tế từng sprint. Export mới nếu muốn thay snapshot 18/10.
3. Git: ảnh Contributors/Commit graph; link + ảnh PR có trao đổi review; thống kê từng người và mapping account theo kỳ.
4. Sản phẩm/chất lượng: URL deploy, video 2–3 phút; số bug, coverage, hiệu năng và người test nếu đã đo.
5. Cá nhân/đóng góp: trước–sau, ticket/PR, tự đánh giá và nhận xét thật, nghề nghiệp; dữ liệu theo công thức 40/30/20/10 và xác nhận mentor.

## Đã có, không bắt buộc gửi lại

- Logo ICTU/CodeGym, bố cục, font và màu template.
- Tên 10 thành viên và vai trò đang có trong tài liệu; cần xác nhận tên chính thức.
- Ảnh giao diện khách hàng/login trong repository; ảnh mới là tùy chọn.
- Jira export ngày 18/10, số issue và story theo trạng thái.
- Log các lượt test CRM 121/121 backend và 50/50 browser; không thay báo cáo coverage/hiệu năng.
- Kiến trúc và stack CRM.

## Checklist chi tiết

### INF-01 — Slide 1, 3: Thông tin chung
- Cần: Tên nhóm chính thức, mentor, đơn vị/phòng ban, trường, ngành, lớp
- Cách lấy: Ghi chính xác tên; logo ICTU/CodeGym không thay xác nhận thông tin.
- Hiện trạng: Cần xác nhận

### INF-02 — Slide 1, 4: Ngày và lịch
- Cần: Ngày bắt đầu/kết thúc thực tập; ngày báo cáo; lịch Sprint 0–4
- Cách lấy: Dùng lịch đã được nhóm/mentor thống nhất. Không suy ra từ Created/Updated.
- Hiện trạng: Chưa có

### INF-03 — Slide 4, 9, 16, 47: Quy trình thực tế
- Cần: Độ dài sprint, lịch Daily/review/retro/mentor; kênh chat/thiết kế; quy tắc review/commit; người trình bày
- Cách lấy: Chỉ ghi những gì thực sự áp dụng; không biến hướng dẫn Gitflow thành quy trình đã làm.
- Hiện trạng: Cần xác nhận

### JIRA-01 — Slide 5: Screenshot
- Cần: Ảnh Product Backlog hoặc Issues filter của toàn dự án
- Cách lấy: Jira → Backlog/Issues; rõ epic, story, trạng thái, bộ lọc/phạm vi; kèm link board và ngày chụp.
- Hiện trạng: Chưa có

### JIRA-02 — Slide 5, 12: Dữ liệu
- Cần: Export Jira mới nhất + URL board
- Cách lấy: Nếu chỉ có snapshot 18/10 thì giữ số liệu 199/135/64; không giả trạng thái live.
- Hiện trạng: Đã có bản 18/10; cần bản mới nếu cập nhật

### JIRA-03 — Slide 6: Screenshot + dữ liệu
- Cần: Velocity Chart; SP cam kết và SP hoàn thành của Sprint 1–4
- Cách lấy: Jira Board → Reports → Velocity Chart; rõ tên sprint, committed/completed; gửi URL/ngày chụp.
- Hiện trạng: Chưa có

### JIRA-04 — Slide 6: Screenshot
- Cần: Burndown của 1–2 sprint tiêu biểu
- Cách lấy: Jira Board → Reports → Burndown; rõ sprint, thời gian, trục và đường thực tế. Nếu chưa có thì ghi rõ.
- Hiện trạng: Chưa có

### GIT-01 — Slide 7–8: Screenshot
- Cần: Git Contributors hoặc Commit graph trong kỳ thực tập
- Cách lấy: GitHub → Insights → Contributors; đúng repo, khoảng thời gian và nhánh cần thống kê; có tên tài khoản.
- Hiện trạng: Chưa có

### GIT-02 — Slide 7–8, 17–46: Dữ liệu
- Cần: Mapping thành viên ↔ tài khoản Git; commit non-merge, PR merged, PR reviewed, +/- dòng theo kỳ
- Cách lấy: Cần khoảng thời gian/nhánh/phạm vi. Loại node_modules, tệp sinh tự động, ZIP khi tính dòng code.
- Hiện trạng: Chưa chốt

### GIT-03 — Slide 9: Screenshot + link
- Cần: PR có code review thực chất
- Cách lấy: Gửi URL/số PR + ảnh Conversation/Files changed thấy người góp ý và commit sửa sau góp ý; không chỉ LGTM.
- Hiện trạng: Chưa có

### APP-01 — Slide 10, 51: Link
- Cần: URL deploy/build + video demo 2–3 phút
- Cách lấy: Mở được ngoài máy cá nhân; xác nhận local/staging/production, tài khoản demo nếu có. Không gửi mật khẩu thật vào file công khai.
- Hiện trạng: Chưa có

### APP-02 — Slide 10: Screenshot
- Cần: Ảnh giao diện hệ thống mới nhất nếu muốn thay ảnh hiện có
- Cách lấy: Ảnh khách hàng/login trong repo đã có; chỉ gửi thêm nếu cần phản ánh phiên bản mới hoặc luồng khác.
- Hiện trạng: Đã có ảnh; bổ sung tùy chọn

### QA-01 — Slide 13: Dữ liệu / ảnh
- Cần: Số bug đã xử lý, coverage, hiệu năng 360/API, số người test
- Cách lấy: Log 121/121 và 50/50 đã có; chỉ cần bằng chứng các chỉ số khác. Chưa đo thì ghi Chưa đo.
- Hiện trạng: Một phần

### QA-02 — Slide 12–13: Xác nhận
- Cần: Danh sách AC đã nghiệm thu / còn mở và các thay đổi yêu cầu
- Cách lấy: Login test 15 giây khác backlog 15 phút; Jira S4 snapshot To Do. Cần chốt trước báo cáo.
- Hiện trạng: Chưa chốt

### CON-01 — Slide 14–15: Dữ liệu
- Cần: SP Done từng người; PR/review; đánh giá chéo; điểm mentor
- Cách lấy: Mỗi tiêu chí quy về % trong nhóm; công thức 40/30/20/10 theo template. Không chia đều hoặc đoán.
- Hiện trạng: Chưa có

### CON-02 — Slide 14–15: Xác nhận mentor
- Cần: Tỉ lệ đóng góp cuối cùng + người/ngày xác nhận
- Cách lấy: Tổng cả nhóm phải 100%. Mentor xác nhận đúng số liệu cuối.
- Hiện trạng: Chưa có

### PER-01 — Slide 17–46: Xác nhận cá nhân
- Cần: Mỗi người: việc làm chính/hỗ trợ, ticket, commit/PR và kết quả
- Cách lấy: Slide dự thảo hiện chỉ dựa trên assignee Jira. Cần xác nhận ai trực tiếp thực hiện.
- Hiện trạng: Chưa xác nhận

### PER-02 — Slide 18,21,24,27,30,33,36,39,42,45: Screenshot / số liệu
- Cần: Mỗi người: minh chứng TRƯỚC và SAU cho một bài toán kỹ thuật
- Cách lấy: Cùng kịch bản, dữ liệu, cấu hình; ảnh UI hoặc request/response/log/benchmark. Cần số đo nếu tuyên bố cải thiện.
- Hiện trạng: Chưa có

### PER-03 — Slide 19,22,25,28,31,34,37,40,43,46: Tự đánh giá
- Cần: Mỗi người: điểm trước/sau 1–5, minh chứng, nhận xét mentor/review thật
- Cách lấy: Ghi nguồn/người nhận xét; không tự tạo lời khen hoặc điểm đánh giá.
- Hiện trạng: Chưa có

### PER-04 — Slide 50: Thông tin cá nhân
- Cần: Mỗi người: vị trí mong muốn và kế hoạch 6–12 tháng
- Cách lấy: 1–2 câu/người, mục tiêu kỹ năng và mốc thực hiện.
- Hiện trạng: Chưa có

### SCOPE-01 — Slide Phần B: Phạm vi
- Cần: Xác nhận làm Phần B cho 10 thành viên hay chỉ Triệu Quang Dũng
- Cách lấy: Bản hiện tại chuẩn bị đủ khung cho 10 người, ba slide/người; có thể rút lại khi bạn xác nhận.
- Hiện trạng: Đang chờ trả lời

## Cách gửi ảnh

- Chụp trực tiếp màn hình thật; không crop mất tên sprint, trục biểu đồ, nhánh hoặc trạng thái PR.
- Kèm URL và ngày chụp; với Git thống nhất khoảng thời gian và nhánh.
- Nếu không có chart/báo cáo thì ghi “chưa có”, giữ trạng thái chưa đủ số liệu.
- Che token, mật khẩu, .env, email cá nhân không cần thiết và dữ liệu khách thật.
- Ảnh trước/sau phải cùng kịch bản. Không dùng ảnh sau làm ảnh trước hoặc dựng biểu đồ hiệu năng.
- Có thể điền workbook Danh_sach_can_bo_sung.xlsx rồi gửi lại kèm các ảnh.
