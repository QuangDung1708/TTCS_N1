# Đề xuất Sprint Review

Nguồn: Jira_N1_cap_nhat_18-10-2026.xlsx / Danh sách Jira, ảnh chụp trạng thái ngày 18/10/2026. File không chứa lịch sử chuyển trạng thái, nhật ký theo ngày, trường Parent hoặc lịch Sprint. Created/Updated là thời điểm tạo/cập nhật issue, không chứng minh ngày thực hiện hay hoàn tất. Các nhóm S3/S4 của subtasks được đối chiếu theo nội dung, không phải quan hệ Parent lấy từ Jira. Nhật ký là DỰ THẢO CẦN XÁC NHẬN, không phải bản ghi công việc đã xác thực.

## Lựa chọn đề xuất: Sprint 3, sau khi chốt nghiệm thu
Sprint 3 cho câu chuyện demo liền mạch và sát nghiệp vụ nhất: tạo doanh nghiệp → thêm người liên hệ → hồ sơ 360 → công ty mẹ/con → kiểm tra và gộp trùng → nhập Excel → lọc và chăm sóc. Đây là đề xuất về giá trị demo; chưa phải kết luận toàn bộ Sprint 3 Done.
## So sánh có căn cứ
Sprint 2: 10 story chính trong nhóm S2 của file đang Done (N1-115,125,126,127,118,119,120,121,122,123). Phù hợp nhất nếu phải review ngay dựa trên trạng thái Done hiện tại; cần rà lại tên S2-02/N1-125 đang trùng chủ đề liên hệ với S3-02.
Sprint 3: N1-188,189,193 Done; N1-187,190,191,192,194,195 In Progress. Có thể chọn làm buổi review có giá trị cao nếu nghiệm thu được các story còn lại; không tự đổi trạng thái từ tài liệu.
Sprint 4: N1-231..276, 46 issue đều To Do. Chưa đủ bằng chứng để trình bày là sprint đã hoàn tất. Sprint 5 không có trong file.
## Kịch bản 15 phút cho Sprint 3
Phút 0–2: nêu mục tiêu, phạm vi và bảng trạng thái story. Tạo khách hàng và đổi vai trò để chứng minh quyền OWN/TEAM/ALL (N1-187,196..198).
Phút 2–4: thêm liên hệ chính, vai trò mua hàng và chuyển công ty có lịch sử (N1-188,199..202).
Phút 4–6: mở 360, đối chiếu KPI cơ hội/doanh thu Won và dữ liệu nhánh công ty mẹ/con; chỉ tính dữ liệu được phép xem (N1-189,191,203..205,209,210).
Phút 6–9: so sánh/gộp hai hồ sơ trùng và chứng minh liên hệ, cơ hội, hoạt động, tệp còn nguyên; chặn trường hợp gộp gây vòng mẹ/con (N1-190,206..208).
Phút 9–11: tải mẫu Excel, nhập tệp có dòng hợp lệ, trùng hoàn toàn và sai định dạng; kiểm tra preview không ghi DB và execute không nhập dòng trùng (N1-192,211..213).
Phút 11–13: tìm kiếm/lưu bộ lọc; hiển thị khách nguy cấp từ ticket chưa xử lý và danh sách quá N ngày chưa chăm sóc (N1-193..195,214..221). Không nói ticket đã phân công cho cá nhân khi Jira chưa ghi.
Phút 13–15: đối chiếu test, xin phản hồi theo từng AC; ghi lỗi còn mở và quyết định chấp nhận/tồn đọng. Chỉ cập nhật Jira khi nhóm thực sự nghiệm thu.
## Điều kiện trước buổi review
Đối chiếu AC-MATRIX.md với yêu cầu gốc của nhóm; chạy DB test riêng, không dùng dữ liệu khách thật; chuẩn bị seed theo vai trò, lưu bằng chứng request/response và ảnh trước/sau. Chốt parent story In Progress hoặc công khai chưa hoàn thành. Những lỗi sửa sau snapshot 18/10 ghi riêng là sửa bổ sung, không giả ngày hoàn tất vào Jira.
## Câu chốt cho báo cáo
“Nhóm đề xuất Sprint 3 làm nội dung review trọng tâm do thể hiện trọn luồng quản lý khách hàng. Tại bản Jira ngày 18/10, Sprint 3 còn 6 story In Progress; nội dung nghiệm thu chỉ được xác nhận sau khi kiểm tra AC. Nếu yêu cầu chọn sprint đã Done theo dữ liệu hiện có, chọn Sprint 2.”
