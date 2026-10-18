# API N1 — bàn giao theo Jira

Nguồn: Jira_N1_cap_nhat_18-10-2026.xlsx / Danh sách Jira, ảnh chụp trạng thái ngày 18/10/2026. File không chứa lịch sử chuyển trạng thái, nhật ký theo ngày, trường Parent hoặc lịch Sprint. Created/Updated là thời điểm tạo/cập nhật issue, không chứng minh ngày thực hiện hay hoàn tất. Các nhóm S3/S4 của subtasks được đối chiếu theo nội dung, không phải quan hệ Parent lấy từ Jira. Nhật ký là DỰ THẢO CẦN XÁC NHẬN, không phải bản ghi công việc đã xác thực.

## Quy ước tích hợp
Base path `/api`. Gửi `Authorization: Bearer <token>` cho route nội bộ, `Content-Type: application/json` khi gửi JSON. Các ID ví dụ là minh họa; lấy ID thật từ DB test/danh mục. Không gửi thư cho email ví dụ `.test`.
Scope và quyền đọc/ghi lấy từ role matrix; Admin toàn quyền. Các vai trò khác cần kiểm tra cả module và phạm vi OWN/TEAM/ALL. Ẩn nút ở frontend không thay kiểm tra backend.
Lỗi chung: `{success:false,message,details?}`; 400 dữ liệu không hợp lệ; 401 thiếu/sai token; 403 thiếu quyền; 404 không tìm thấy/không thuộc phạm vi; 409 xung đột; 413 tệp quá lớn; 422 điều kiện nghiệp vụ; 429 giới hạn yêu cầu; 500 lỗi máy chủ. Endpoint có thể dùng tập mã con; xem test và route tương ứng.
Danh sách thường có `{data,total?,scope?}`; POST create thường trả 201 và id. Một số API cũ dùng contactId hoặc cấu trúc riêng; frontend phải theo endpoint, không giả định toàn bộ response giống nhau.
XLSX: client tải bằng arraybuffer/blob, không parse JSON. Import dùng multipart `file` hoặc JSON `{rows:[...]}`, tối đa 1.000 dòng, tệp 5 MB. Dòng trùng hoàn toàn không có lựa chọn ép nhập/cập nhật; cùng MST nhưng thay thông tin có thể chọn update theo quyền và xem trước lại.
Điểm lead tính tự động theo AC S4-05; thay quy tắc/ngưỡng bằng quyền Admin/Director. 0 điểm là hợp lệ khi chưa có tiêu chí khớp. Không thêm ô ghi đè score trái AC.

## Xác thực và thư thật
Đối chiếu: N1-3, N1-4; đối chiếu mã hiện hành.

### POST /api/auth/login
200: token và thông tin người dùng; 401 nếu sai thông tin. Sau 5 lần sai liên tiếp: 429, Retry-After và details {code: LOGIN_TEMPORARILY_LOCKED, retry_after: số giây}. Khóa 15 giây theo yêu cầu điều chỉnh 18/10/2026; nhập đúng trong thời gian khóa vẫn bị chặn, hết hạn bắt đầu lại bộ đếm nếu tiếp tục nhập sai.
```json
{
  "email": "user@example.test",
  "password": "YourPassword9!"
}
```

### POST /api/auth/forgot-password
Yêu cầu email khôi phục; không đồng nhất SMTP chấp nhận với thư đã đến hộp thư.
```json
{
  "email": "user@example.test"
}
```

### POST /api/auth/send-register-otp
OTP email; giới hạn gửi lại 60 giây. Email đã có không được đăng ký mới.
```json
{
  "email": "new@example.test"
}
```

### POST /api/auth/register
Vai trò cố định Sales Rep; xác minh OTP và mật khẩu theo cấu hình backend. Mã OTP dùng trường otp_code; xác nhận mật khẩu dùng confirm_password.
```json
{
  "full_name": "Người dùng mới",
  "email": "new@example.test",
  "otp_code": "123456",
  "password": "YourPassword9!",
  "confirm_password": "YourPassword9!"
}
```

## Khách hàng: CRUD và phân quyền
Đối chiếu: S3-01 / N1-187; N1-196,197,198.

### GET /api/customers?search=Minh&status=Tiềm%20năng
200: {success,scope,total,data}; bộ lọc industry, company_size, region, owner_id, custom_fields.

### POST /api/customers
201: id. Tên bắt buộc; MST nếu nhập phải hợp lệ và duy nhất; owner phải trong phạm vi cho phép.
```json
{
  "company_name": "Công ty Minh An",
  "tax_code": "0123456789",
  "email": "sales@example.test",
  "phone": "0912345678",
  "status": "Tiềm năng"
}
```

### PUT /api/customers/:id
200: cập nhật hồ sơ được quyền sửa; không tạo chu kỳ cây công ty.
```json
{
  "company_name": "Công ty Minh An",
  "parent_id": null
}
```

### DELETE /api/customers/:id
Kiểm tra quyền và dữ liệu liên quan; không xóa cưỡng bức dữ liệu đang được tham chiếu.

## Người liên hệ
Đối chiếu: S3-02 / N1-188; N1-199..202.

### GET /api/contacts/customer/:customerId
Danh sách liên hệ của khách hàng trong phạm vi được phép.

### POST /api/contacts/customer/:customerId
201: contactId; kiểm tra khách hàng và vai trò mua hàng hợp lệ.
```json
{
  "full_name": "Nguyễn An",
  "email": "an@example.test",
  "phone": "0912345678",
  "decision_role": "Người dùng cuối",
  "is_primary": true
}
```

### PUT /api/contacts/:id/transfer
Chuyển liên hệ, kiểm tra quyền cả hai hồ sơ và ghi lịch sử.
```json
{
  "targetCustomerId": 2,
  "transferReason": "Chuyển công tác"
}
```

### PUT /api/contacts/:id
Cập nhật và bảo đảm quy tắc liên hệ chính.
```json
{
  "full_name": "Nguyễn An",
  "is_primary": true
}
```

## Hồ sơ 360 và công ty mẹ/con
Đối chiếu: S3-03,05 / N1-189,191; N1-203..205,209,210.

### GET /api/customers/:id/360
Tổng hợp hồ sơ, liên hệ, cơ hội, hoạt động, tệp và cây mẹ/con; dữ liệu và doanh thu tuân thủ scope.

### PUT /api/customers/:id
Liên kết công ty mẹ; không tự liên kết hoặc tạo vòng. Chỉ định ID thực tế được phép truy cập.
```json
{
  "parent_id": 1
}
```

## Trùng và gộp khách hàng
Đối chiếu: S3-04 / N1-190; N1-206..208.

### GET /api/customers/detect-duplicates
Gợi ý cặp trùng theo chuẩn hóa tên/MST/website. Đây là gợi ý so sánh, khác quy tắc chặn dòng import giống hoàn toàn.

### POST /api/customers/merge
Giữ target, chuyển dữ liệu liên quan từ source trong transaction; cần quyền quản lý và quyền sửa cả hai hồ sơ. Không gộp mẹ vào con.
```json
{
  "target_id": 1,
  "source_id": 2
}
```

## Excel khách hàng và lead
Đối chiếu: S3-06 / N1-192,211..213; S4-02 / N1-232,244..248.

### GET /api/customers/import/template
XLSX binary: Dữ liệu, Hướng dẫn, Danh mục. Lead thay customers bằng leads.

### POST /api/customers/import/preview
200: {data:[{row,valid,duplicate,duplicate_blocked,error,data}],valid,invalid}; hoặc multipart field file. Xem trước rollback toàn bộ, không ghi dữ liệu thật.
```json
{
  "rows": [
    {
      "company_name": "Công ty nhập",
      "email": "import@example.test"
    }
  ]
}
```

### POST /api/customers/import/execute
200: {data:[{row,success,id|message,duplicate_blocked}],imported,skipped}; mỗi dòng transaction riêng, lỗi một dòng không hủy dòng hợp lệ khác.
```json
{
  "rows": [
    {
      "company_name": "Công ty nhập",
      "email": "import@example.test"
    }
  ]
}
```

### GET /api/leads/export
XLSX mẫu tiếng Việt. File xuất nhập lại phải nhận diện dòng đã có, không tạo thêm bản sao.

### POST /api/leads/import/preview
Giống cơ chế customers; nguồn lead bắt buộc. Trùng hoàn toàn trong DB hoặc dòng trước của tệp bị đánh dấu không hợp lệ.
```json
{
  "rows": [
    {
      "full_name": "Người liên hệ",
      "company_name": "Công ty nhập",
      "email": "lead@example.test",
      "source_id": 1
    }
  ]
}
```

### POST /api/leads/import/execute
Thực thi kiểm tra lại ở backend, kể cả gọi trực tiếp không qua preview. Không tin cờ valid do client gửi.
```json
{
  "rows": [
    {
      "full_name": "Người liên hệ",
      "company_name": "Công ty nhập",
      "email": "lead@example.test",
      "source_id": 1
    }
  ]
}
```

## Tìm kiếm, CSKH và chăm sóc
Đối chiếu: S3-07..09 / N1-193..195; N1-214..221.

### GET /api/customers/care-list?days=30
Khách quá N ngày chưa được liên hệ; ưu tiên doanh thu hợp đồng; giới hạn days 1..3650.

### PUT /api/customers/:id/contacted
Ghi nhận đã liên hệ và cập nhật thời gian chăm sóc.
```json
{}
```

### POST /api/customers/tickets
Tạo ticket theo schema endpoint; từ 2 ticket chưa giải quyết hiển thị nguy cấp. N1-216,217 chưa có assignee.
```json
{
  "customer_id": 1,
  "title": "Yêu cầu hỗ trợ",
  "priority": "Cao",
  "status": "Mới"
}
```

### GET /api/customers/saved-filters
Bộ lọc của người dùng; POST để lưu, DELETE /:id để xóa. UI có thể lưu cục bộ theo luồng hiện hành.

## Form công khai, lead và campaign
Đối chiếu: S4-01..03 / N1-231..233; N1-240..252.

### POST /api/leads/forms
Quản lý tạo form; key sinh bởi hệ thống. GET /api/public/lead-forms/:key/meta để lấy cấu hình.
```json
{
  "name": "Form website",
  "source_id": 1
}
```

### POST /api/public/lead-forms/:key
Không Bearer; kiểm tra form, nguồn mặc định và chống spam/IP. Không đưa token quản trị vào mã nhúng.
```json
{
  "full_name": "Khách mới",
  "company_name": "Công ty mới",
  "email": "new-lead@example.test"
}
```

### POST /api/leads
201: {id}; cần email hoặc điện thoại. Không tự đặt score/temperature bằng payload.
```json
{
  "full_name": "Lead mới",
  "company_name": "Doanh nghiệp mới",
  "email": "lead@example.test",
  "source_id": 1
}
```

### GET /api/campaigns
Danh sách và thống kê chiến dịch theo quyền; Sales lấy tên bằng /api/campaigns/options.

### POST /api/campaigns
Tạo chiến dịch; ngân sách và ngày phải hợp lệ.
```json
{
  "name": "Chiến dịch Q4",
  "budget": 10000000,
  "channel": "Website",
  "start_date": "2026-10-18",
  "end_date": "2026-11-18"
}
```

## Trùng, chấm điểm và phân bổ lead
Đối chiếu: S4-04..06 / N1-234..236; N1-253..264.

### GET /api/leads/duplicates
Gợi ý lead trùng; POST /api/leads/merge với target_id,source_id,reason để gộp theo quyền.

### GET /api/leads/scoring-rules
Admin/Director: {data,thresholds:{warm,hot}}.

### PUT /api/leads/scoring-rules
Admin/Director; tối đa 100 quy tắc; field industry/company_size/source_id/interest_level; points -1000..1000, hot>warm. Tính lại lead đang hoạt động trong transaction.
```json
{
  "warm": 30,
  "hot": 70,
  "rules": [
    {
      "field_name": "source_id",
      "match_value": "1",
      "points": 50
    }
  ]
}
```

### PUT /api/leads/assignment-rules
Đặt danh sách quy tắc; lấy cấu trúc hiện tại bằng GET cùng URL trước khi sửa. Mảng rỗng xóa quy tắc, chỉ dùng có chủ đích trên DB test.
```json
{
  "rules": []
}
```

### POST /api/leads/:id/assign
Nhân viên tiếp nhận phải active và có Sales Rep; kiểm tra scope. Worker phân vòng theo rule/group.
```json
{
  "owner_id": 4,
  "reason": "Phân theo khu vực",
  "sla_minutes": 60
}
```

## Phản hồi, chuyển đổi và lọc lead
Đối chiếu: S4-07..09 / N1-237..239; N1-265..276.

### POST /api/leads/:id/accept
Chỉ nhân viên đang được phân lead ASSIGNED được nhận; chuyển sang CARING.
```json
{}
```

### POST /api/leads/:id/reject
Bắt buộc lý do; trả về hàng chờ theo quy trình.
```json
{
  "reason": "Khách thuộc khu vực khác"
}
```

### POST /api/leads/:id/convert
Một transaction tạo/chọn customer, tạo contact/deal, chuyển lịch sử và đánh dấu lead CONVERTED; rollback nếu bất kỳ bước nào lỗi.
```json
{
  "deal": {
    "title": "Triển khai CRM",
    "stage_id": 1,
    "amount": 5000000,
    "expected_close_date": "2026-12-01"
  }
}
```

### GET /api/leads?temperature=HOT&source_id=1
Lọc theo source/campaign/owner/status/temperature/SLA và ngày theo leadRoutes.list; dữ liệu có scope, không tự loại lead điểm thấp.

## Cây tổ chức và báo cáo cơ hội
Đối chiếu: Mã hiện hành; cây tổ chức liên quan S2, Pipeline không có Sprint 5 trong file Jira mới.

### GET /api/organization/tree
Một cây phân cấp: children, leader, region, member_count trực tiếp; UI tổng hợp total_members của nhánh.

### POST /api/organization/groups
Quyền CATEGORY write; kiểm tra trưởng nhóm/nhóm cha; không tạo chu kỳ.
```json
{
  "name": "Nhóm kinh doanh",
  "leader_id": 3,
  "parent_id": null,
  "region_id": null
}
```

### GET /api/groups/:id/members?include_descendants=1
Nhân sự toàn nhánh để đối chiếu quy mô; không cộng trùng một người trong cùng danh sách.

### GET /api/deals/export?status=OPEN
XLSX tiếng Việt, scope và bộ lọc giống danh sách; tên liên hệ/owner/nguồn/chiến dịch/giai đoạn, số tiền numeric, ngày ký/dự kiến, lý do thắng/thua.

## Trách nhiệm theo thành viên
Danh sách BE/FE theo ảnh nhóm; task cụ thể theo Assignee của Jira. Việc FE/BE hỗ trợ nhau không được đổi assignee trong báo cáo.

### Triệu Quang Dũng (Leader)
Sprint 3: N1-210 — Thêm tab Công ty con trong Drawer 360° và hiển thị thẻ Doanh thu Tập đoàn [Done]
Carry-over import user: N1-223 — [System] Thống nhất API Contract cho luồng Import và Báo cáo lỗi [To Do]
Sprint 4 (tất cả To Do): N1-243 — [Test] Viết kịch bản kiểm thử: test chặn spam IP, submit form hợp lệ/không hợp lệ [To Do]; N1-252 — [Test] Viết kịch bản kiểm thử: tạo chiến dịch, luồng link lead vào chiến dịch [To Do]; N1-260 — [Test] Viết kịch bản kiểm thử: đổi thông tin lead, check điểm nhảy đúng rules cài đặt [To Do]; N1-268 — [Test] Viết kịch bản kiểm thử: thao tác từ chối ko nhập lý do, test cờ cảnh báo SLA 3 ngày [To Do]; N1-276 — [Test] Viết kịch bản kiểm thử: lọc multi-select, gọi lại bộ lọc đã lưu [To Do]

### Lê Minh Danh (BE)
Sprint 3: N1-196 — Tạo migration bảng customers, validate MST duy nhất và viết API CRUD [Done]; N1-197 — Phân quyền RBAC xem khách hàng theo Owner ID và Team Lead [Done]; N1-206 — Viết thuật toán chuẩn hóa tên tiếng Việt, quét trùng theo MST, tên và website [Done]; N1-207 — API gộp khách hàng (Merge), chuyển toàn bộ Deals, Contacts sang bản ghi giữ lại [Done]
Carry-over import user: Không có issue được giao đích danh trong phạm vi này.
Sprint 4 (tất cả To Do): N1-240 — [BE] Xây dựng API nhận webhook từ form nhúng và check spam/giới hạn tần suất IP [To Do]; N1-241 — [BE] Xây dựng logic tự động gán nguồn và trạng thái 'Mới' cho lead [To Do]; N1-253 — [BE] Xây dựng API detect lead trùng theo email, sđt, tên công ty [To Do]; N1-262 — [BE] Xây dựng logic chạy ngầm phân bổ trong vòng 5 phút và thả vào hàng chờ nếu rớt rule [To Do]; N1-270 — [BE] Viết script chuyển toàn bộ lịch sử hoạt động (activities) sang khách hàng mới [To Do]

### Đỗ Tuấn Dũng (BE)
Sprint 3: N1-199 — Thiết kế bảng contacts, API CRUD và logic đổi đầu mối chính [Done]; N1-200 — API luân chuyển liên hệ sang công ty mới và lưu bảng contact_histories [Done]
Carry-over import user: Không có issue được giao đích danh trong phạm vi này.
Sprint 4 (tất cả To Do): N1-245 — [BE] Xây dựng API đọc, kiểm tra và thực thi import lead từ file Excel mẫu [To Do]; N1-254 — [BE] Xây dựng logic thực thi gộp 2 lead và giữ nguyên lịch sử hoạt động [To Do]; N1-265 — [BE] Xây dựng API thao tác Nhận/Từ chối lead (yêu cầu lý do) và đẩy lại hàng chờ [To Do]; N1-269 — [BE] Xây dựng API Convert sử dụng SQL Transaction (tạo Customer, Contact, Deal đồng thời) [To Do]

### Nguyễn Trần Việt Anh (BE)
Sprint 3: N1-203 — Viết API tổng hợp Hồ sơ 360°, tính KPI tổng Won và Deal mở [Done]; N1-204 — Tối ưu index bảng deals & customer_activities, đảm bảo query dưới 1.5s [Done]; N1-209 — Truy vấn đệ quy/phân cấp Mẹ - Con, tính tổng doanh số toàn tập đoàn [Done]
Carry-over import user: N1-226 — [BE-Logic] Parse Excel, Validate cơ bản & Kiểm tra trùng lặp DB [To Do]
Sprint 4 (tất cả To Do): N1-248 — [Test] Viết kịch bản kiểm thử: file Excel rỗng, sai định dạng, thiếu trường nguồn [To Do]; N1-256 — [Test] Viết kịch bản kiểm thử: gộp 2 lead, gộp lead vào khách hàng có sẵn [To Do]; N1-264 — [Test] Viết kịch bản kiểm thử: đẩy 20 lead, test thuật toán tự chia đều vòng lặp [To Do]; N1-272 — [Test] Viết kịch bản kiểm thử: rollback data khi API lỗi giữa chừng, check mất data liên hệ [To Do]

### Nguyễn Thùy Chang (BE)
Sprint 3: N1-211 — Tạo API tải file Excel mẫu và đọc parse file Excel tải lên [Done]; N1-213 — Dựng modal import, nút tải template và bảng Preview dữ liệu có đánh dấu lỗi [Done]; N1-214 — Viết dynamic query cho bộ lọc đa tiêu chí (ngành, quy mô, owner, MST, SĐT) [Done]
Carry-over import user: N1-228 — [BE-Route] Setup API, Multer & Bulk Insert Database [To Do]
Sprint 4 (tất cả To Do): N1-244 — [BE] Xây dựng API thêm mới lead thủ công (bắt buộc truyền nguồn) [To Do]; N1-258 — [BE] Xây dựng logic Trigger tự động tính lại điểm và phân loại Nóng/Ấm/Lạnh khi data thay đổi [To Do]; N1-261 — [BE] Thiết kế bảng cấu hình rules phân bổ (theo khu vực, ngành nghề, xoay vòng) [To Do]; N1-266 — [BE] Xây dựng cronjob check SLA: bắt lead nằm im 3 ngày không liên hệ để cảnh báo [To Do]

### Phạm Xuân Bình (BE)
Sprint 3: N1-219 — API lọc khách hàng chưa tương tác sau N ngày, sort theo tổng giá trị Won [Done]; N1-220 — API cập nhật nhanh last_interaction_at = NOW() khi bấm chăm sóc [Done]
Carry-over import user: Không có issue được giao đích danh trong phạm vi này.
Sprint 4 (tất cả To Do): N1-249 — [BE] Thiết kế bảng campaigns và xây dựng API CRUD chiến dịch [To Do]; N1-250 — [BE] Xây dựng logic thống kê số lead, số cơ hội và doanh thu chốt theo ID chiến dịch [To Do]; N1-257 — [BE] Thiết kế bảng lưu cấu hình tiêu chí chấm điểm và mức điểm tương ứng [To Do]; N1-273 — [BE] Nâng cấp API get danh sách lead: hỗ trợ lọc động Nóng/Ấm/Lạnh, SLA, Nguồn [To Do]

### Hứa Huệ An (FE)
Sprint 3: N1-198 — Dựng màn hình danh sách khách hàng, Form thêm/sửa modal và bộ Tag trạng thái [Done]; N1-208 — Dựng giao diện đối chiếu 2 cột dữ liệu trước khi gộp và modal xác nhận [Done]
Carry-over import user: N1-230 — [FE-UI] Xây dựng Khu vực Kéo thả Upload & File Validation [To Do]
Sprint 4 (tất cả To Do): N1-242 — [FE] Dựng component mã nhúng HTML/JS biểu mẫu thu thập lead (Họ tên, SĐT, Email...) [To Do]; N1-255 — [FE] Dựng giao diện popup gợi ý gắn lead trùng và Modal so sánh gộp lead [To Do]

### Hoàng Lan Anh (FE)
Sprint 3: N1-201 — Dựng bảng người liên hệ, chọn 4 vai trò mua hàng và nút đổi đầu mối [Done]; N1-202 — Modal xác nhận luân chuyển nhân sự sang khách hàng khác [Done]; N1-221 — Dựng Tab Chăm sóc định kỳ, ô cấu hình số ngày N và nút xác nhận đã liên hệ [Done]
Carry-over import user: N1-225 — [FE-Logic] Gọi API Axios, Quản lý State & Nút "Tải file lỗi" [To Do]
Sprint 4 (tất cả To Do): N1-246 — [FE] Dựng giao diện Modal thêm mới thủ công và Modal Import Excel [To Do]; N1-259 — [FE] Dựng giao diện cấu hình thêm/sửa tiêu chí chấm điểm và ngưỡng điểm phân loại [To Do]; N1-271 — [FE] Dựng giao diện Modal xác nhận thao tác chuyển đổi và form điền thông tin cơ hội [To Do]; N1-274 — [FE] Dựng UI thanh filter đa điều kiện và ghép tính năng lưu/đặt tên bộ lọc [To Do]

### Châu Thùy Dung (FE)
Sprint 3: N1-205 — Dựng Drawer 360°, hiển thị các thẻ KPI và danh sách Deals, Contacts [Done]
Carry-over import user: N1-224 — [FE-UI] Xây dựng Component Modal/Bảng báo cáo kết quả [To Do]
Sprint 4 (tất cả To Do): N1-247 — [FE] Ghép API import và hiển thị màn hình xem trước báo lỗi từng dòng [To Do]; N1-263 — [FE] Dựng giao diện cài đặt thứ tự ưu tiên các quy tắc phân bổ cho Giám đốc [To Do]; N1-275 — [FE] Render highlight nổi bật (màu sắc cảnh báo) cho các lead đã quá hạn SLA trên Table [To Do]

### Nguyễn Ngọc Anh (FE)
Sprint 3: N1-212 — Logic đối soát dữ liệu từng dòng, bắt trùng MST và gắn cờ bỏ qua/ghi đè [Done]; N1-215 — Dựng thanh Filter đa điều kiện và lưu bộ lọc cá nhân vào LocalStorage [Done]
Carry-over import user: N1-229 — [QA] Chuẩn bị bộ Data Test Edge-cases và Thực thi kiểm thử [To Do]
Sprint 4 (tất cả To Do): N1-251 — [FE] Dựng giao diện Quản lý chiến dịch và hiển thị thẻ thống kê ngân sách/doanh thu [To Do]; N1-267 — [FE] Thêm button Nhận/Từ chối trên UI chi tiết lead và Modal Form nhập lý do [To Do]

## Điểm cần thống nhất trước khi báo cáo
S3: 3/9 story Done; 6/9 In Progress dù subtasks ngày 10/10 đều Done. Không suy diễn story đã nghiệm thu chỉ từ subtask.
S4: 46 issue mới (9 story + 37 subtasks) đều To Do tại 18/10. Tài liệu API mô tả mã hiện có, không phải chứng nhận các issue Jira này Done.
N1-216 và N1-217 chưa có assignee; không gán cho Phạm Xuân Bình. Jira ghi Nguyễn Thùy Chang, khác tên Trang ở ảnh mẫu nhật ký. Giữ tên Jira và chờ nhóm xác nhận.
N1-222 là carry-over nhập người dùng, không có nhãn Sprint rõ trong dữ liệu export. N1-229 To Do ngày 18/10; không ghi đã kiểm thử xong.
SLA: task N1-266/268 nêu 3 ngày, API hiện có sla_minutes (mặc định 60 phút). Nhóm cần chốt cấu hình nghiệm thu 4.320 phút nếu giữ AC 3 ngày; không đồng nhất cấu hình mặc định với yêu cầu Jira.
Không có Sprint 5 trong file đính kèm. Các endpoint Pipeline ghi theo mã hiện hành, không gắn mã Jira tự tạo.
Gửi email: kiểm tra SMTP runtime sau restart backend; log queue/attempt và thư hộp đến là bằng chứng khác nhau. Không đưa mật khẩu SMTP, OTP thật hoặc token reset vào tài liệu.

## Phụ lục route đọc trực tiếp từ source
Chỉ liệt kê route khai báo tĩnh; không coi bảng này là mô tả đầy đủ schema/quyền từng route. Route động accept/reject và import được bổ sung phía dưới.

### auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/auth/role-matrix`
- `GET /api/auth/options`
- `GET /api/auth/test-accounts`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PUT /api/auth/change-password`
- `POST /api/auth/send-register-otp`
- `POST /api/auth/register`

### users
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/profile/avatar`
- `POST /api/users/avatar`
- `GET /api/users/roles/list`
- `GET /api/users/groups/list`
- `POST /api/users`
- `GET /api/users`
- `PUT /api/users/:id/role`
- `PUT /api/users/:id`
- `PUT /api/users/:id/lock`
- `GET /api/users/:id/customers-count`
- `PUT /api/users/:id/status`
- `DELETE /api/users/:id`

### customers
- `GET /api/customers`
- `GET /api/customers/users-list`
- `GET /api/customers/custom-fields-active`
- `GET /api/customers/saved-filters`
- `POST /api/customers/saved-filters`
- `DELETE /api/customers/saved-filters/:id`
- `GET /api/customers/care-list`
- `PUT /api/customers/:id/contacted`
- `GET /api/customers/detect-duplicates`
- `POST /api/customers/merge`
- `GET /api/customers/:id/360`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `POST /api/customers/contacts`
- `PUT /api/customers/contacts/:contactId`
- `PUT /api/customers/contacts/:contactId/primary`
- `PUT /api/customers/contacts/:contactId/reassign`
- `DELETE /api/customers/contacts/:contactId`
- `POST /api/customers/activities`
- `POST /api/customers/tickets`
- `PUT /api/customers/tickets/:ticketId`
- `POST /api/customers/:id/files`
- `GET /api/customers/:id/files/:fileId`
- `POST /api/customers/deals`

### contacts
- `GET /api/contacts/customer/:customerId`
- `POST /api/contacts/customer/:customerId`
- `PUT /api/contacts/:id`
- `PUT /api/contacts/:id/transfer`
- `DELETE /api/contacts/:id`

### leads
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/saved-filters`
- `POST /api/leads/saved-filters`
- `DELETE /api/leads/saved-filters/:id`
- `GET /api/leads/duplicates`
- `POST /api/leads/merge`
- `GET /api/leads/scoring-rules`
- `PUT /api/leads/scoring-rules`
- `GET /api/leads/assignment-rules`
- `PUT /api/leads/assignment-rules`
- `GET /api/leads/forms`
- `POST /api/leads/forms`
- `GET /api/leads/:id`
- `PUT /api/leads/:id`
- `POST /api/leads/:id/assign`
- `POST /api/leads/:id/activities`
- `POST /api/leads/:id/convert`
- `GET /api/public/lead-forms/:key/meta`
- `GET /api/public/lead-forms/:key`
- `POST /api/public/lead-forms/:key`

### campaigns
- `GET /api/campaigns/options`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `PUT /api/campaigns/:id`

### organization
- `GET /api/organization/tree`
- `GET /api/organization/regions`
- `POST /api/organization/regions`
- `POST /api/organization/groups`
- `PUT /api/organization/groups/:id`
- `POST /api/organization/groups/:id/assign-member`
- `DELETE /api/organization/groups/:id`

### groups
- `GET /api/groups/:id/members`

### deals
- `GET /api/deals`
- `GET /api/deals/export`
- `GET /api/deals/kanban`
- `GET /api/deals/flagged`
- `GET /api/deals/forecast`
- `POST /api/deals/reassign`
- `POST /api/deals`
- `GET /api/deals/:id`
- `PUT /api/deals/:id`
- `PUT /api/deals/:id/stage`
- `POST /api/deals/:id/close`
- `POST /api/deals/:id/reopen`
- `PUT /api/deals/:id/items`
- `POST /api/deals/:id/activities`

### quotes
- `GET /api/quotes`
- `GET /api/quotes/export`
- `GET /api/quotes/:id`
- `POST /api/quotes`
- `PUT /api/quotes/:id`
- `DELETE /api/quotes/:id`

Routes động: `POST /api/leads/:id/accept`, `POST /api/leads/:id/reject`. Với customers/leads/users: `GET /import/template`, `POST /import/preview`, `POST /import/execute`, `POST /import-batch`; riêng customers thêm `/bulk-import`. Customers/leads có GET `/export` tại importRoutes.
