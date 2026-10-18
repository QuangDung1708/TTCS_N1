# HỆ THỐNG QUẢN LÝ KHÁCH HÀNG (CRM)

> Bản triển khai Sprint 1–5: xem [hướng dẫn chạy frontend và backend](frontend/README.md), [đối chiếu AC](frontend/docs/AC-MATRIX.md), và [kết quả kiểm thử](frontend/docs/VALIDATION.md). Gói tải về và checksum nằm trong [delivery](delivery/README.md).

> Cập nhật gộp khách hàng, animation toàn ứng dụng, đăng ký email và mail thật: [hướng dẫn chép đè và nạp DB hiện tại](UPDATE-UI-AND-DATA.md). Có tệp Windows `CAP-NHAT-VA-NAP-DU-LIEU.cmd`; cấu hình SMTP và gửi thư kiểm tra bằng `CAU-HINH-MAIL.cmd`.

> Dự án thực tập tốt nghiệp / môn học - Nhóm 4  
> Mô hình triển khai: Scrum (8 Sprints × 1 tuần)

---

## 1. Giới thiệu dự án (Product Overview)
Hệ thống CRM hỗ trợ doanh nghiệp số hóa toàn diện quy trình kinh doanh, xóa bỏ việc quản lý phân tán qua bảng tính cá nhân, tin nhắn hoặc ghi nhớ thủ công. 

### Bài toán giải quyết:
- Tránh thất thoát cơ hội và thất lạc dữ liệu khách hàng khi nhân sự biến động.
- Minh bạch hóa luồng duyệt chiết khấu, dự báo doanh thu dựa trên xác suất và trọng số thực tế.
- Tự động hóa tiếp nhận, chấm điểm và phân bổ lead từ các kênh tiếp thị.

---

## 2. Các vai trò trong hệ thống (User Roles)
Hệ thống hỗ trợ 7 nhóm người dùng với cơ chế phân quyền dữ liệu (Data-ownership):
- **Sales Rep (Nhân viên kinh doanh):** Quản lý khách hàng, theo dõi cơ hội, tạo báo giá và ghi nhận tương tác.
- **Team Lead (Trưởng nhóm kinh doanh):** Giám sát pipeline nhóm, phân bổ lead, phê duyệt chiết khấu trong hạn mức.
- **Director (Giám đốc kinh doanh):** Xem toàn bộ dữ liệu, duyệt vượt hạn mức, theo dõi dự báo doanh số và chỉ tiêu.
- **Marketing:** Thu thập, quản lý chiến dịch và chuyển giao lead vào hệ thống.
- **Customer Success:** Chăm sóc khách hàng sau bán, giám sát mức độ gắn kết và rủi ro rời bỏ.
- **Accountant (Kế toán):** Đối soát hợp đồng, theo dõi hiệu lực và đợt gia hạn thanh toán.
- **Admin (Quản trị hệ thống):** Quản lý tài khoản, cấu hình tham số bán hàng và danh mục dùng chung.

---

## 3. Các phân hệ chức năng chính (Epics)
- **EP-01:** Quản trị tài khoản, Phân quyền & Hồ sơ cá nhân
- **EP-02:** Danh mục sản phẩm/dịch vụ & Cấu hình quy trình bán hàng
- **EP-03:** Quản lý Khách hàng 360° & Người liên hệ
- **EP-04:** Quản lý Lead & Phân bổ tự động
- **EP-05:** Cơ hội bán hàng & Pipeline Kanban
- **EP-06:** Lịch làm việc, Hoạt động & Dòng thời gian tương tác
- **EP-07:** Quản lý Báo giá & Luồng duyệt Hợp đồng
- **EP-08:** Quản trị Chỉ tiêu & Dashboard báo cáo kinh doanh
- **EP-09:** Trung tâm Thông báo & Quy tắc tự động hóa

---

## 4. Công nghệ sử dụng (Tech Stack)
- **Frontend:** React 19, Vite 8, Ant Design 6, dnd-kit
- **Backend:** Node.js 24, Express 5, mysql2
- **Database:** MySQL 8 (đã kiểm thử trên MySQL 8.4)
- **Quản lý dự án & Quy trình:** Jira Software (Scrum framework), Git / GitHub

---

## 5. Thành viên nhóm & Phân công vai trò (Team Members)

| STT | Họ và Tên | Vai trò | Trách nhiệm chính | Nguồn lực |
| :-: | :--- | :--- | :--- | :-: |
| 1 | Triệu Quang Dũng | Product Owner | Quản lý Product Backlog, xác định thứ tự ưu tiên các công việc, đại diện cho khách hàng và các bên liên quan. | 10 giờ/tuần |
| 1 | Triệu Quang Dũng | Scrum Master kiêm Leader | Huấn luyện nhóm về Agile và Scrum, loại bỏ các trở ngại (impediments), đảm bảo quy trình được tuân thủ, và đưa ra quyết định kỹ thuật cuối cùng khi cần. | 40 giờ/tuần |
| 2 | Lê Minh Danh | Developer BE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 3 | Nguyễn Trần Việt Anh | Developer BE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 4 | Đỗ Tuấn Dũng | Developer BE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 5 | Nguyễn Thùy Chang | Developer BE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 6 | Phạm Xuân Bính | Developer BE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 7 | Nguyễn Ngọc Anh | Developer FE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 8 | Chẩu Thùy Dung | Developer FE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 9 | Hoàng Lan Anh | Developer FE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |
| 10 | Hứa Huệ An | Developer FE | Viết code, thực hiện Unit Test, tham gia Code Review, và đảm bảo chất lượng sản phẩm. | 40 giờ/tuần |

---

## 6. Hướng dẫn cài đặt & chạy dự án

Xem [frontend/README.md](frontend/README.md) để chạy trên Windows/macOS/Linux, build và kiểm thử trình duyệt. Cấu hình MySQL, migration không nạp dữ liệu mẫu, tài khoản Admin và SMTP được mô tả trong [backend/README.md](backend/README.md).

Bản cập nhật UI và dữ liệu kiểm thử: xem `UPDATE-UI-AND-DATA.md`; hướng dẫn tài khoản ở `backend/docs/EXAMPLE-DATA.md`.
