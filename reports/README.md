# Tài liệu bàn giao nhóm N1 — 18/10/2026

- `API_N1_Theo_Jira.docx`: API theo luồng nghiệp vụ S3/S4, ví dụ request, response, quyền, lỗi, phân công từng thành viên và danh sách route từ mã nguồn. Bản Markdown đi kèm để dễ chỉnh sửa.
- `Nhat_ky_Sprint_3_tro_di.xlsx`: 18 sheet; 12 bảng ngày 07–18/10 cho đủ 10 thành viên (120 dòng dự thảo), nhật ký riêng Leader, tổng hợp nhóm, kế hoạch Sprint 4 và đối chiếu Jira. Giữ bốn cột theo mẫu.
- `Nhat_ky_ca_nhan_va_nhom.docx`: phần cá nhân Triệu Quang Dũng và tổng hợp nhóm theo ngày, thuận tiện sao chép vào internship.
- `De_xuat_Sprint_Review.docx`: đề xuất Sprint 3 theo giá trị demo, điều kiện nghiệm thu, so sánh Sprint 2/4 và kịch bản 15 phút.
- `jira_evidence.json`: dữ liệu đối chiếu 199 issue, bỏ ID tài khoản Atlassian; có SHA-256 của file nguồn.

Nhật ký theo ngày là **dự thảo cần thành viên xác nhận**. File Jira không chứa Daily Scrum hoặc lịch sử chuyển trạng thái; ngày Updated không chứng minh ngày thực hiện/hoàn tất. Không ghi Sprint 4 To Do thành đã làm, không tự thêm Sprint 5. Các ngày cuối tuần cũng chỉ là ô dự thảo theo lịch, cần bỏ hoặc sửa theo lịch làm việc thực tế.

Giữ Nguyễn Thùy Chang theo Jira (ảnh mẫu ghi Trang), và ghi N1-216/217 chưa phân công. Task UI/BE theo đúng Assignee, kể cả khi khác nhóm BE/FE trong ảnh.

Tạo lại: `python reports/generate_reports.py /duong-dan/Jira_N1_cap_nhat_18-10-2026.xlsx` (cần `openpyxl`, `python-docx`). Script chỉ đọc tệp, không ghi vào Jira.


## Bổ sung: test Sprint 4

`Huong_dan_test_Sprint_4.docx` và bản Markdown: hướng dẫn từng bước cả 9 US, bảng rà 31 AC, test bằng vai trò phù hợp và kết quả mong đợi. `Sprint_4_audit_evidence.json` ghi 47/47 backend, ca trình duyệt gộp và phát hiện lead MERGED vẫn còn trong gợi ý trùng. Đợt này rà soát/tài liệu, chưa sửa mã ứng dụng. Thời gian phân bổ dưới tải lớn, website triển khai và cấu hình SLA 3 ngày cần xác nhận riêng.


API doc được bổ sung hợp đồng khóa đăng nhập 15 giây theo yêu cầu mới; đây là thay đổi S1 riêng sau đợt rà Sprint 4. Thời gian 15 giây thay AC gốc 15 phút, không phải trạng thái Jira đã được tự cập nhật.
