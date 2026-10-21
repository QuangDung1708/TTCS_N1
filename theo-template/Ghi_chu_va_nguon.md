# Ghi chú và nguồn

Bản dự thảo theo đúng template do người dùng cung cấp. Giữ logo, font, màu và cấu trúc A/B/C. Phần B đã được xác nhận cho cả 10 thành viên. Thông tin bìa, kỳ thực tập, lịch Sprint 1–4 và URL Jira đã được người dùng cung cấp; các số liệu/minh chứng còn thiếu vẫn chờ.

## Slide 1

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Thông tin người dùng xác nhận: nhóm TTCS_N1; mentor Triệu Quang Dũng; Đại học CNTT & Truyền thông Thái Nguyên, ngành CNTT, lớp CNTT K23G; đơn vị CodeGym; thực tập 23/09–26/10/2026; báo cáo 21/10/2026. Giữ logo và layout mẫu. Báo cáo này chỉ bao quát Sprint 1–4, không khẳng định toàn bộ kỳ thực tập đã kết thúc.

## Slide 2

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Phần A giữ cấu trúc mẫu: tổng quan, quy trình, Jira, Git, kết quả và đóng góp. Người trình bày dự kiến cần nhóm xác nhận. Không khẳng định các số liệu chưa có nguồn.

## Slide 3

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Phạm vi theo kế hoạch gốc: S1 10 story/42 point, S2 10/43, S3 9/42, S4 9/45. Tổng kế hoạch 38 story/172 point, không phải point đã cam kết hoặc Done thực tế. Mục tiêu ở slide này đối chiếu theo đúng bốn nhóm ở slide A09.

## Slide 4

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Lịch do người dùng xác nhận: mỗi sprint 7 ngày, bắt đầu 23/09/2026. S1:23–29/09; S2:30/09–06/10; S3:07–13/10; S4:14–20/10. Kỳ thực tập tiếp tục tới 26/10, ngoài phạm vi bốn sprint này. Slide chỉ hiển thị bốn sprint đã xác nhận; lịch các cuộc họp còn thiếu. Không lấy Created/Updated làm lịch sprint. Quy tắc Gitflow từng được hướng dẫn, nhưng không có bằng chứng mọi commit đều qua PR/review; cần xác nhận thực tế nhóm đã làm. Nhánh demo độc lập dùng git init không cùng lịch sử develop và không là ví dụ Gitflow tích hợp.

## Slide 5

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
199 issue, 135 Done, 64 chưa Done = 9 In Progress + 55 To Do, tỷ lệ 135/199=67,8%. Đây là toàn bộ tập issue trong export, gồm nhiều loại issue, không phải 38 story chính hay số liệu live. URL board do người dùng cung cấp đã gắn vào footer. Vẫn cần ảnh Backlog/Issues thật; chưa truy cập board hoặc cập nhật export từ URL. Giữ chỗ ảnh của template, không dựng ảnh giả.

## Slide 6

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Cần Velocity Chart thể hiện committed/completed SP cho Sprint 1–4 và Burndown cho 1–2 sprint tiêu biểu, kèm URL/ngày chụp. Export Jira hiện tại không có trường story point, lịch sprint hoặc lịch sử burndown. Không thể tính velocity thực hay SP Done từ số issue. 172 SP chỉ là kế hoạch gốc.

## Slide 7

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Các cột Git chờ thống kê. Kỳ thực tập 23/09–26/10, báo cáo 21/10/2026; khi tính số liệu chỉ lấy đến thời điểm báo cáo, không lấy các ngày sau 21/10. Vẫn cần nhánh/phạm vi và mapping tài khoản GitHub từng người. Không dùng git author/commit count một mình để đánh giá đóng góp. Cần commit (loại merge), PR merged, PR review và +/- dòng trong kỳ, loại tệp sinh tự động/node_modules/ZIP. Tài khoản author Dũng trong các thao tác trợ lý không chứng minh những thành viên khác viết code. Cần ảnh Insights Contributors/Commit graph thật.

## Slide 8

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Các cột Git chờ thống kê. Kỳ thực tập 23/09–26/10, báo cáo 21/10/2026; khi tính số liệu chỉ lấy đến thời điểm báo cáo, không lấy các ngày sau 21/10. Vẫn cần nhánh/phạm vi và mapping tài khoản GitHub từng người. Không dùng git author/commit count một mình để đánh giá đóng góp. Cần commit (loại merge), PR merged, PR review và +/- dòng trong kỳ, loại tệp sinh tự động/node_modules/ZIP. Tài khoản author Dũng trong các thao tác trợ lý không chứng minh những thành viên khác viết code. Cần ảnh Insights Contributors/Commit graph thật.

## Slide 9

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Template yêu cầu PR có trao đổi thực chất, không chỉ LGTM. Cần link PR merged vào develop và ảnh Conversation/Files changed thể hiện review rồi sửa. CI đã ghi nhận Success tại https://github.com/QuangDung1708/TTCS_N1/actions/runs/39185149415, không thay bằng chứng review. Không khai PR trực tiếp push là quy trình review.

## Slide 10

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Ảnh khách hàng đã có trong repository nên không cần yêu cầu người dùng chụp lại ảnh tương tự trừ khi muốn bản mới nhất. Chưa có URL deploy hoặc video demo. Bản demo độc lập N1-279 không thay thế module CRM chính. Snapshot Jira S1:8 Done/2 IP, S2:10 Done, S3:3 Done/6 IP, S4:9 To Do ở cấp story; không khẳng định toàn bộ S1–4 hoàn thành.

## Slide 11

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Giữ bảng Web của template; không đưa công nghệ Game. CRM chính dùng MySQL. Hai demo độc lập dùng JSON, không nhầm với cơ sở dữ liệu CRM. Sơ đồ là shape chỉnh sửa được trong PowerPoint. Phần triển khai còn thiếu môi trường/URL và không tự khẳng định đã dùng Docker/VPS/Cloud.

## Slide 12

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Chỉ đếm 38 story chính S1–4: 21 Done, 8 In Progress, 9 To Do. Không đồng nhất 55,3% story với tỷ lệ SP hoặc nghiệm thu AC. Cần xác nhận nghiệm thu. S2-02 trong backlog là hồ sơ cá nhân, N1-125 trên Jira lại mô tả người liên hệ. Chức năng S4 có code/test không tự chuyển trạng thái To Do sang Done.

## Slide 13

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
121/121 backend và 50/50 browser là kết quả đã ghi nhận tại phiên bản tương ứng, không chứng minh mọi AC đạt hoặc đã chạy lại trên mọi commit sau đó. 100% chỉ là tỷ lệ case pass trong các lượt chạy đã nêu. Cần bug resolved count trong kỳ, coverage report, thời gian tải/API đo thực tế và số người test. Không đưa 11 test demo import vào tổng test của CRM chính. Mục tiêu 360<1,5s/500 hoạt động và phân bổ≤5 phút dưới tải chưa được xác minh đầy đủ.

## Slide 14

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Giữ đúng công thức của template. Với từng tiêu chí, chuẩn hóa phần mỗi người trên tổng của nhóm rồi nhân trọng số. Cần SP đã Done theo cá nhân, PR merged/review, đánh giá chéo, điểm/nhận xét mentor và xác nhận cuối. Không tự đặt 10% mỗi người chỉ vì nhóm có 10 người, không dùng commit count thay toàn bộ công thức. Hai slide cùng một bảng nhóm 10 người, tổng cuối của cả hai phải 100%.

## Slide 15

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Giữ đúng công thức của template. Với từng tiêu chí, chuẩn hóa phần mỗi người trên tổng của nhóm rồi nhân trọng số. Cần SP đã Done theo cá nhân, PR merged/review, đánh giá chéo, điểm/nhận xét mentor và xác nhận cuối. Không tự đặt 10% mỗi người chỉ vì nhóm có 10 người, không dùng commit count thay toàn bộ công thức. Hai slide cùng một bảng nhóm 10 người, tổng cuối của cả hai phải 100%.

## Slide 16

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Người dùng đã xác nhận làm cho cả 10 thành viên, 3 slide/người theo template. Phần cá nhân dự thảo dựa trên assignee Jira, không tự nhận công việc đã trực tiếp làm. Từng người cần xác nhận nội dung, cung cấp trước/sau, PR và tự đánh giá; mentor cần xác nhận tỷ lệ đóng góp.

## Slide 17

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Triệu Quang Dũng: 29 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [6, 5, 8, 47, 210]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 18

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Triệu Quang Dũng theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 19

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Triệu Quang Dũng tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 20

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Lê Minh Danh: 12 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [196, 197, 206, 207]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 21

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Lê Minh Danh theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 22

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Lê Minh Danh tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 23

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đỗ Tuấn Dũng: 11 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [199, 200]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 24

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Đỗ Tuấn Dũng theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 25

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đỗ Tuấn Dũng tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 26

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Trần Việt Anh: 13 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [203, 204, 209]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 27

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Nguyễn Trần Việt Anh theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 28

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Trần Việt Anh tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 29

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Thùy Chang: 10 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [211, 214]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 30

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Nguyễn Thùy Chang theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 31

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Thùy Chang tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 32

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Phạm Xuân Bình: 11 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [219, 220]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 33

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Phạm Xuân Bình theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 34

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Phạm Xuân Bình tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 35

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Hứa Huệ An: 11 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [198, 208, 230]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 36

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Hứa Huệ An theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 37

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Hứa Huệ An tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 38

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Hoàng Lan Anh: 12 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [201, 202, 221]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 39

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Hoàng Lan Anh theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 40

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Hoàng Lan Anh tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 41

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Châu Thùy Dung: 10 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [205, 224]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 42

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Châu Thùy Dung theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 43

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Châu Thùy Dung tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 44

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Ngọc Anh: 10 issue non-Epic Done được gán trong toàn bộ export Jira 18/10, không phải số story point hoặc tất cả công việc được người này trực tiếp thực hiện. Phạm vi nêu theo các ticket [212, 215, 229]; người phụ trách cần xác nhận. Chưa có dữ liệu SP/Git/PR/tỷ lệ đóng góp cá nhân trong kỳ. Các subtasks To Do giữ nguyên, không biến thành kết quả đã hoàn thành.

## Slide 45

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Đề xuất bài toán cho Nguyễn Ngọc Anh theo phạm vi được giao, chưa phải lời xác nhận người này đã trực tiếp giải quyết. Cần mô tả vấn đề, giải pháp, ảnh/log trước-sau cùng kịch bản/cấu hình/bộ dữ liệu, số đo và link PR. Không dùng số case pass chung của hệ thống làm số đo đóng góp cá nhân. Không tự trích lời mentor hoặc tạo bằng chứng giả.

## Slide 46

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Nguyễn Ngọc Anh tự đánh giá theo thang 1–5 của template (1 chưa biết, 3 làm có hướng dẫn, 5 làm độc lập và hướng dẫn người khác). Không suy ra năng lực trước kỳ thực tập từ số ticket. Cần điểm trước/sau, ví dụ minh chứng và nhận xét mentor/code review thật; sau đó chốt 1–2 điểm tiếp tục cải thiện.

## Slide 47

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Phần C tổng kết giá trị, bài học, hướng phát triển và demo. Người trình bày và thời lượng chốt lại theo số thành viên thực sự báo cáo. Phần B 10 người nếu 3 phút/người cần thêm khoảng 30 phút, không gộp toàn bộ báo cáo thành 15–20 phút.

## Slide 48

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Chỉ tổng hợp các giá trị đã nêu ở Phần A. Không tự khẳng định Scrum ổn định, doanh thu tăng hoặc đã có cơ hội việc làm khi chưa có chứng cứ. Nội dung bài học và giá trị cá nhân cần nhóm xác nhận.

## Slide 49

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Bài học dự thảo từ các vấn đề thật đã xử lý trong trao đổi: CI, SMTP/worker, import trùng và nhầm nhánh độc lập/Gitflow. Nhóm xác nhận trước khi nói đây là trải nghiệm chung. CI frontend đã sửa sibling backend path và login IP budgets giữa test, không bỏ kiểm tra khóa tài khoản trong case. Có bằng chứng 50/50 tại bản e370c679.

## Slide 50

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Roadmap sản phẩm là đề xuất, không phải cam kết đã được mentor duyệt. Phần nghề nghiệp hoàn toàn thiếu thông tin từ từng người; không tự suy ra Backend hiện tại đồng nghĩa định hướng nghề nghiệp Backend. Cần câu trả lời của nhóm.

## Slide 51

BẢN DỰ THẢO — Phạm vi Sprint 1–4.
Chuẩn bị tài khoản theo vai trò, DB test, dữ liệu mẫu và video dự phòng 2–3 phút. Demo nên chứng minh A không xem khách B, hồ sơ 360, import có lỗi và lead chấm điểm/phân bổ. Nếu dùng bản mẫu độc lập N1-279 phải nói rõ khác CRM chính. Không đưa .env, SMTP password hoặc dữ liệu khách thật vào ảnh.

## Nguồn

- Template báo cáo tổng kết thực tập trong ZIP do người dùng gửi.
- Jira_N1_cap_nhat_18-10-2026.xlsx: 199 issue, 135 Done, 9 IP, 55 To Do.
- HỆ THỐNG QUẢN LÝ KHÁCH HÀNG.xlsx: phạm vi, AC và SP kế hoạch.
- Repository TTCS_N1 và reports, ảnh UI, log kiểm thử đã ghi nhận.
- Thông tin nhóm/mentor/trường/lịch và URL board: người dùng xác nhận trong trao đổi ngày 21/10/2026.
- Jira board: https://ictu-team-k8abz7ih.atlassian.net/jira/software/projects/N1/boards/3/backlog (URL đã có; chưa thay thế ảnh hoặc export mới).
- Không có story point thực tế, bảng đánh giá chéo, điểm mentor, Git PR metrics. Lịch thực tập và Sprint 1–4 đã được người dùng xác nhận; không suy ra từ file Jira.
