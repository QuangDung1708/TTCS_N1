# Hướng dẫn test và rà soát AC Sprint 4 — 18/10/2026

Phạm vi: S4-01 đến S4-09 theo 31 AC trong ảnh và backend/docs/AC-MATRIX.md. Đối chiếu mã ứng dụng b3025cc4, tài liệu trên nhánh codex/frontend-sprint-1-5. Đây là kết quả kỹ thuật, không tự thay đổi trạng thái nghiệm thu Jira.

## Kết quả rà soát

Chạy lại 47/47 kiểm tra backend trong 5 suite (leads-deals, security-runtime, worker, import-duplicates, catalog-organization) trên MariaDB 10.4, DB kiểm thử riêng. Kiểm tra trình duyệt bổ sung thực hiện gộp lead, xác nhận API 200 và giữ đủ lịch sử của hai lead. Không truy cập DB hoặc máy Windows của người dùng.

Phát hiện cần hoàn thiện: sau khi gộp A/B thành công, B mang trạng thái MERGED nhưng vẫn nằm trong API gợi ý trùng. Mở lại kiểm tra trùng có thể thấy lại cặp đã xử lý. Vì vậy S4-04.AC1 chưa trọn vẹn ở tình huống kiểm tra lại sau gộp; không đánh dấu cả US đạt hoàn toàn. AC giữ lịch sử vẫn đạt trong ca kiểm tra này. Nguyên nhân: GET /api/leads/duplicates lấy toàn bộ list, chưa loại lead MERGED/CONVERTED khỏi các cặp có thể gộp. Đây là phát hiện rà soát, chưa sửa mã ứng dụng trong đợt hướng dẫn này.

Hai điểm cần xác nhận thêm:

- S4-06.AC4: worker chạy chu kỳ 30 giây, đã kiểm tra phân bổ bằng scheduler thật; chưa chứng minh SLA 5 phút ở tải lớn/staging. Worker hiện xử lý tối đa 1.000 lead NEW mỗi vòng, không nên tuyên bố giới hạn thời gian tuyệt đối ở mọi tải.
- S4-07: ảnh AC yêu cầu quá SLA, không ấn định số ngày. Giao diện mặc định 60 phút; task Jira N1-266/N1-268 ghi 3 ngày. Nhóm cần thống nhất cấu hình: 3 ngày = 4.320 phút. Đây là chênh lệch cấu hình/yêu cầu cần chốt, không phải bằng chứng cơ chế SLA không chạy.
- S4-01 nhúng website khác: mã nhúng và trang công khai đã có. Địa chỉ local chỉ dùng được ở máy/mạng truy cập được dịch vụ đó; cần URL triển khai truy cập được và cấu hình hosting cho phép iframe khi nghiệm thu website thực tế.

| AC | Kết luận tại mã hiện tại | Cách kiểm tra/bằng chứng |
| --- | --- | --- |
| S4-01.AC1 | Có mã nhúng; cần test website triển khai đích | Tạo form, lấy iframe, dán vào trang HTML test; không cần đăng nhập để gửi |
| S4-01.AC2 | Đã có đủ 5 trường trên form | Họ tên, email, điện thoại, công ty, nhu cầu |
| S4-01.AC3 | Đã kiểm tra API | Chữ ký, thời gian tối thiểu, honeypot; giới hạn 10 POST/IP mỗi cửa sổ 15 phút, quá mức trả 429 |
| S4-01.AC4 | Đã kiểm tra API | Tạo NEW, lấy nguồn/campaign từ form, không nhận nguồn tự ghi đè từ client |
| S4-02.AC1 | Đã có UI/API | Thêm lead thủ công, reload còn dữ liệu |
| S4-02.AC2 | Đã kiểm tra API và ca UI bản trước | Mẫu XLSX, preview, lỗi từng dòng; trùng hoàn toàn bị chặn, chỉ nhập dòng hợp lệ |
| S4-02.AC3 | Đã kiểm tra API | Nguồn thiếu hoặc ID không hợp lệ bị từ chối, cả tạo tay và import |
| S4-03.AC1 | Đã có UI/API | Ngân sách, kênh, ngày chạy; ngày kết thúc trước bắt đầu không hợp lệ |
| S4-03.AC2 | Đã kiểm tra API | Lead chuyển đổi thành deal giữ campaign_id |
| S4-03.AC3 | Đã kiểm tra API | Thống kê lead/deal và doanh thu thực tế Won; không coi ngân sách là doanh thu |
| S4-04.AC1 | Cần hoàn thiện sau gộp | Nhận diện email/phone/company có; nhưng MERGED vẫn được đưa lại vào gợi ý trùng |
| S4-04.AC2 | Có gợi ý và luồng gắn khách hàng | Hiện khách hàng có thể liên quan; chọn khách hàng đã có tại form chuyển đổi |
| S4-04.AC3 | Đã kiểm tra API và UI gộp bổ sung | Hai nội dung hoạt động còn đủ trên lead giữ lại |
| S4-05.AC1 | Đã có UI/API | Quy tắc ngành/quy mô/nguồn/mức quan tâm và số điểm |
| S4-05.AC2 | Đã kiểm tra API | Đổi thông tin hoặc lưu quy tắc tính lại lead hoạt động; score trong payload không ghi đè |
| S4-05.AC3 | Đã kiểm tra API/UI bản trước | Ngưỡng warm/hot; hot phải lớn hơn warm |
| S4-05.AC4 | Đã kiểm tra API | Lead lạnh vẫn còn; danh sách ưu tiên quá SLA trước, rồi điểm giảm dần |
| S4-06.AC1 | Đã kiểm tra API/worker | Khớp vùng/ngành, phân vòng nhân viên Sales Rep đang active trong nhóm trực tiếp |
| S4-06.AC2 | Đã kiểm tra API/worker | Số thứ tự nhỏ hơn xét trước; lấy quy tắc đầu tiên khớp |
| S4-06.AC3 | Đã kiểm tra API | NEW không khớp thành QUEUED; trưởng nhóm xem được hàng chờ và phân tay |
| S4-06.AC4 | Đạt kiểm tra chức năng; chưa kết luận tải lớn | Scheduler 30 giây thật đã phân lead; cần đo thời gian tại môi trường triển khai |
| S4-07.AC1 | Đã kiểm tra API | Đúng người được phân bấm Nhận: ASSIGNED thành CARING |
| S4-07.AC2 | Đã kiểm tra API | Thiếu lý do bị từ chối; có lý do về QUEUED, bỏ owner |
| S4-07.AC3 | Đã kiểm tra API/worker | Quá hạn, chưa có hoạt động liên hệ: gắn cờ và thông báo leader của nhóm; cần có leader_id |
| S4-08.AC1 | Đã kiểm tra API | Transaction tạo customer/contact/deal; lỗi bước sau rollback bước trước |
| S4-08.AC2 | Đã có UI/API | Mang tên, email, phone, ngành, quy mô, khu vực, nguồn/campaign sang phần tương ứng; không nhập lại danh tính |
| S4-08.AC3 | Đã kiểm tra API/UI bản trước | CONVERTED không sửa/chuyển lại được |
| S4-08.AC4 | Đã kiểm tra API/UI bản trước | Hoạt động lead được chuyển sang customer_activities, có trong hồ sơ khách |
| S4-09.AC1 | Đã kiểm tra API, có bộ lọc UI | Trạng thái, nguồn, nhiệt độ, owner, khoảng ngày tạo |
| S4-09.AC2 | Có hiển thị UI, kiểm tra thủ công theo hướng dẫn | Tag Quá SLA và nền hàng nổi bật; worker phải thực sự cập nhật cờ |
| S4-09.AC3 | Đã kiểm tra API, có UI lưu | Đặt tên/lưu/áp dụng lại bộ lọc riêng theo tài khoản |

## Chuẩn bị chung

1. Dùng bản cập nhật Excel/cây tổ chức đã bàn giao; mở backend và frontend. Dùng dữ liệu thử, tên bắt đầu TEST-S4 để dễ tìm.
2. Chuẩn bị các vai trò: Admin hoặc Giám đốc (cấu hình), Marketing (tạo form/lead/campaign), Trưởng nhóm, ít nhất 2 Sales Rep đang hoạt động trong cùng một nhóm nếu test xoay vòng. Không dùng Admin thay Sales để test Nhận/Từ chối.
3. Cây tổ chức phải có trưởng nhóm và nhân viên đúng nhóm. Nguồn Website, ngành nghề và khu vực phải tồn tại trong danh mục.
4. Kiểm tra worker: khi backend chạy bình thường, không đặt RUN_WORKER=false. Nếu chủ đích tắt worker trong backend, có thể chạy npm run worker trong terminal backend riêng. Không cần sửa DB hoặc đợi 3 ngày để test SLA: dùng thời hạn 1 phút cho dữ liệu test.
5. Chụp màn hình quy tắc điểm/phân bổ hiện tại trước khi đổi, khôi phục sau test. Lưu quy tắc là thay cấu hình chung, có thể ảnh hưởng lead đang có.
6. Với các bước cần giữ lead chưa phân công để quan sát, test trong môi trường riêng hoặc quan sát ngay sau tạo. Worker có thể đổi NEW thành ASSIGNED/QUEUED sau một vòng.

## S4-01 — Thu lead từ website

Vai trò: Marketing hoặc Admin.

1. Lead & phân bổ → Biểu mẫu website → Tạo biểu mẫu.
2. Tên TEST-S4 Form tư vấn; nguồn Website; chọn chiến dịch nếu đã tạo. Lưu.
3. Mã nhúng → lấy đường dẫn nằm trong src="..."; mở ở cửa sổ ẩn danh. Không dán nguyên thẻ iframe vào thanh địa chỉ.
4. Điền họ tên TEST-S4 Khách website, công ty TEST-S4 Công ty web, email của bạn, số điện thoại hợp lệ, nhu cầu Tư vấn CRM. Chờ nút Gửi thông tin khả dụng và gửi.
5. Phải thấy Đã nhận thông tin. Quay lại CRM bằng Admin/Marketing, Làm mới, tìm lead vừa tạo; nguồn và chiến dịch đúng form. Trạng thái ban đầu Mới, nhưng worker có thể đã phân tiếp.
6. Để test mã nhúng thật: tạo một trang HTML test có đoạn iframe đã sao chép, mở trang đó và gửi một khách khác. Không cần dựng website thương mại riêng để test chức năng.
7. Thử thiếu trường, email sai hoặc điện thoại sai: không gửi thành công. Test chống spam API chỉ trên môi trường thử: hơn 10 POST cùng IP trong cửa sổ 15 phút phải trả 429; cả request lỗi cũng tính vào giới hạn, có thể ảnh hưởng người cùng IP khi test chung.

Đạt: đủ trường; mở công khai; gửi tạo đúng lead/nguồn; nhúng hoạt động ở môi trường đích; chống spam chặn đúng. Local hoạt động chưa chứng minh đã chạy trên website Internet.

## S4-02 — Tạo tay và nhập Excel

Vai trò: Marketing hoặc Admin.

1. Lead & phân bổ → Thêm lead. Điền TEST-S4 Khách hội thảo, công ty TEST-S4 Công ty hội thảo, email hoặc phone, nguồn hợp lệ; để người phụ trách trống nếu muốn test phân bổ sau. Lưu rồi reload.
2. Thử bỏ nguồn: form phải báo lỗi. Thử chỉ tên/công ty mà không có cả email lẫn phone: không lưu được.
3. Nhập Excel → Tải mẫu Excel. Dùng đúng tiêu đề và xem sheet Danh mục để lấy Mã nguồn lead; không điền tên Website vào cột yêu cầu mã ID.
4. Soạn tệp: dòng 2 hợp lệ; dòng 3 thiếu nguồn; dòng 4 sai email và không có phone hợp lệ; dòng 5 giống hoàn toàn dòng 2; thêm một dòng giống hồ sơ đã có trong CRM. Giữ phone kiểu văn bản để không mất số 0.
5. Chọn tệp → kiểm tra số dòng hợp lệ/lỗi và lý do từng dòng. Dòng giống hoàn toàn hiện Không hợp lệ / Không được nhập.
6. Nhập dữ liệu vào hệ thống → chỉ dòng hợp lệ được lưu, dòng lỗi bị bỏ qua và có báo cáo. Làm mới tìm tên đã nhập. Nhập lại tệp: không tạo thêm bản sao giống hoàn toàn.

Đạt: có mẫu, preview, lỗi từng dòng; thiếu nguồn bị chặn ở backend; preview chưa làm tăng dữ liệu; execute chỉ nhận dòng hợp lệ.

## S4-03 — Chiến dịch và doanh thu

Vai trò: Marketing tạo/xem chiến dịch; Admin hoặc Sales Rep xử lý cơ hội.

1. Chiến dịch marketing → Tạo chiến dịch: TEST-S4 Hội thảo CRM, ngân sách 10.000.000, kênh Hội thảo, ngày bắt đầu/kết thúc hợp lệ. Lưu, reload vẫn còn.
2. Tạo một lead chọn đúng chiến dịch này. Về chiến dịch, Làm mới: số lead tăng 1 (dùng chiến dịch mới không có dữ liệu khác để dễ đối chiếu).
3. Phân lead cho Sales Rep, dùng Sales hoặc Admin chuyển đổi theo S4-08. Cơ hội sinh ra phải vẫn thuộc chiến dịch; số cơ hội tăng 1. Số lead hiện đếm cả lead đã chuyển đổi, nên không kỳ vọng tự giảm về 0.
4. Chốt Won cơ hội với doanh thu thực tế 5.000.000, ngày ký và lý do thắng hợp lệ. Nếu giai đoạn có điều kiện, đáp ứng điều kiện hoặc dùng quyền quản lý ghi lý do ghi đè hợp lệ.
5. Về chiến dịch, Làm mới: Giá trị đã chốt tăng đúng 5.000.000. Cơ hội còn mở hoặc Lost không cộng vào doanh thu Won.
6. Thử ngày kết thúc trước ngày bắt đầu hoặc ngân sách âm: phải bị chặn. Marketing chỉ đọc cơ hội theo ma trận, không mặc nhiên có quyền chốt.

Đạt: thuộc tính chiến dịch lưu đúng; liên kết không mất khi chuyển đổi; số lead/cơ hội và doanh thu thực tế đúng.

## S4-04 — Trùng lead và gộp

Vai trò: Marketing hoặc Admin.

1. Tạo tay hai lead TEST-S4 A và TEST-S4 B có cùng email nhưng tên khác. Tạo thêm cặp chỉ trùng phone, và cặp chỉ trùng tên công ty để kiểm tra từng tiêu chí riêng. Không dùng import dòng giống hoàn toàn vì import đã chặn.
2. Mở lead A → nhập hoạt động Đã gọi lần A → Ghi nhận. Lead B ghi Đã gửi tài liệu B.
3. Kiểm tra trùng → chọn lead A. Cặp A/B phải xuất hiện. Chọn hồ sơ giữ lại, ở hồ sơ còn lại bấm Gộp vào hồ sơ đã chọn → Đồng ý.
4. Mở hồ sơ giữ lại: còn cả 2 hoạt động. Hồ sơ nguồn mang trạng thái Đã gộp và không sửa/ghi hoạt động mới được.
5. Tạo một khách hàng có cùng email/phone/tên công ty với một lead khác. Kiểm tra trùng phải gợi ý khách hàng liên quan. Khi Chuyển đổi lead, chọn Gắn với khách hàng đã có thay vì tạo một doanh nghiệp mới.
6. Kiểm tra lại danh sách trùng sau khi gộp. Hiện tại còn lỗi: lead MERGED vẫn có thể được gợi ý lại; ghi nhận AC1 cần hoàn thiện ở tình huống này. Không cố gộp lại nguồn đã MERGED vì API sẽ trả 409.

Đạt toàn bộ khi phát hiện từng tiêu chí đúng, gợi ý khách hàng có sẵn, giữ lịch sử, và cặp đã xử lý không bị gợi ý như cặp đang chờ gộp. Mã hiện tại chưa đạt trọn vẹn bước cuối.

## S4-05 — Chấm điểm và Nóng/Ấm/Lạnh

Vai trò: Admin hoặc Giám đốc kinh doanh.

1. Lead & phân bổ → Chấm điểm lead. Chụp cấu hình cũ. Đặt ngưỡng Ấm = 30, Nóng = 70.
2. Tạo 2 quy tắc test: Nguồn lead = Website, điểm 20; Mức độ quan tâm = Cao, điểm 60. Nếu có quy tắc khác cũng khớp, điểm sẽ cộng thêm, cần tính tất cả hoặc dùng cấu hình test riêng.
3. Tạo lead nguồn Website, quan tâm Thấp: 20 điểm, Lạnh. Sửa quan tâm Cao: 80 điểm, Nóng. Không nhập trực tiếp ô score của từng lead.
4. Sửa điểm của quy tắc Cao từ 60 về 20: lead đang hoạt động đó tự thành 40 điểm, Ấm; reload để đối chiếu.
5. Kiểm tra thêm quy tắc Ngành nghề và Quy mô bằng đúng giá trị danh mục. Lead không khớp quy tắc nào có 0 điểm nhưng vẫn còn trong danh sách.
6. Đặt Nóng <= Ấm: backend phải từ chối. Danh sách ưu tiên lead quá SLA trước, rồi điểm giảm dần; vì vậy không kết luận lỗi khi lead quá SLA điểm thấp đứng trên lead chưa quá SLA điểm cao.
7. Đăng nhập Sales Rep: xem được điểm, không được sửa cấu hình chấm điểm. Khôi phục cấu hình cũ sau test.

Đạt: 4 loại tiêu chí cấu hình được, điểm tự tính lại, ngưỡng đúng và không loại lead điểm thấp. Trường Giá trị cần khớp của Mức độ quan tâm hiện nhập chữ: gõ đúng Cao/Trung bình/Thấp như lead.

## S4-06 — Phân bổ tự động

Vai trò: Admin/Giám đốc cấu hình; Trưởng nhóm và Sales Rep kiểm tra kết quả.

1. Chuẩn bị nhóm TEST-S4 Miền Bắc có trưởng nhóm, ít nhất 2 Sales Rep active ở trực tiếp nhóm này. Nhân sự ở nhóm con không được tự hiểu là thành viên trực tiếp của nhóm cha khi xoay vòng.
2. Lead & phân bổ → Quy tắc phân bổ. Thêm quy tắc: ưu tiên 1, khu vực đúng tên Miền Bắc trong danh mục, nhóm tiếp nhận vừa chuẩn bị, SLA 5 phút, Đang áp dụng bật. Ô vùng/ngành là nhập chữ, cần khớp chính xác giá trị lead.
3. Tạo thêm quy tắc ưu tiên 2 cũng khớp nhưng nhóm khác. Số nhỏ hơn được xét trước.
4. Dùng Marketing tạo 3 lead mới có khu vực phù hợp, để Người phụ trách trống. Lead do Sales tự tạo có thể tự nhận về chính Sales nên không phù hợp ca kiểm tra này.
5. Chờ khoảng một chu kỳ 30 giây, bấm Làm mới, tối đa quan sát 5 phút. Ba lead phải lần lượt vào hai Sales (A/B/A hoặc B/A/B tùy con trỏ vòng trước), không nhất thiết bắt đầu từ cùng một người mỗi lần.
6. Lead phải về nhóm của quy tắc ưu tiên 1. Tạo lead NEW ở vùng/ngành không khớp bất kỳ rule nào: sau worker phải thành Chờ phân bổ. Trưởng nhóm mở hàng chờ và phân tay được.
7. Bấm Phân bổ trên lead hàng chờ, chọn Sales, lý do và lưu. Nếu nhóm rule không có Sales active, hệ thống cũng chuyển về hàng chờ thay vì gán sai người.
8. Khôi phục cấu hình sau test. Lead đã QUEUED không tự được worker phân lại khi thêm rule mới; luồng hiện hành dành cho trưởng nhóm phân tay. Muốn đo rule mới phải tạo lead NEW mới.

Đạt chức năng: vùng/ngành, ưu tiên, xoay vòng và hàng chờ đúng. Ghi thời điểm tạo và nhận để đo 5 phút ở máy triển khai; chưa thể kết luận chịu tải chỉ bằng kiểm tra local.

## S4-07 — Nhận, từ chối và quá SLA

Vai trò: quản lý giao lead; đúng Sales Rep được giao phản hồi; trưởng nhóm nhận cảnh báo.

1. Admin/Marketing tạo 3 lead A/B/C. Bấm biểu tượng Phân bổ ở từng lead, giao đúng Sales Rep và đặt Thời hạn phản hồi = 1 phút cho ca test.
2. Đăng nhập Sales đó, mở A, bấm Nhận: trạng thái Đang chăm sóc. Admin xem được lead nhưng không thay nhân viên được giao bấm Nhận theo luồng này.
3. Với B, bấm Từ chối: để trống lý do phải lỗi. Nhập Không thuộc khu vực phụ trách rồi lưu: thành Chờ phân bổ, không còn owner cũ. Quản lý vẫn xem và giao lại được.
4. Với C, chưa ghi nhận liên hệ. Chờ quá 1 phút và thêm tối đa một chu kỳ worker khoảng 30 giây; Làm mới. Phải có Quá SLA và hàng nổi bật.
5. Đăng nhập trưởng nhóm của Sales C, bấm chuông → Làm mới: có thông báo Lead quá SLA. Trưởng nhóm phải được bổ nhiệm trong cây tổ chức, không chỉ mang role Team Lead mà không gắn vào nhóm.
6. Sales mở C, ghi Đã gọi khách và Ghi nhận: contacted_at được cập nhật, cờ quá hạn được xóa. Chỉ bấm Nhận mà chưa ghi liên hệ vẫn có thể quá SLA; đó là đúng AC “chưa liên hệ”.
7. Nếu test 3 ngày theo task Jira: đặt 4.320 phút; không cần đợi thực tế 3 ngày để kiểm tra cơ chế vì ca 1 phút dùng cùng logic.

Đạt: nhận đúng trạng thái, từ chối bắt buộc lý do, quá hạn chưa liên hệ có cờ và thông báo đúng leader. Nếu không có cờ, kiểm tra worker; có cờ mà không có thông báo, kiểm tra trưởng nhóm được bổ nhiệm.

## S4-08 — Chuyển lead thành khách hàng và cơ hội

Vai trò: Sales Rep sở hữu lead hoặc Admin có quyền tạo khách hàng/cơ hội. Marketing có thể tạo lead nhưng mặc định chỉ đọc DEAL, nên không dùng Marketing để kết luận chuyển đổi bị lỗi quyền.

1. Tạo lead TEST-S4 Chuyển đổi, điền đủ thông tin, ngành/quy mô/khu vực; gắn chiến dịch test. Giao cho Sales.
2. Sales mở lead, ghi hoạt động Đã tư vấn gói CRM → Ghi nhận.
3. Bấm biểu tượng Chuyển đổi. Để trống Gắn với khách hàng đã có nếu test tạo mới. Tên cơ hội đã gợi ý theo công ty; chọn giai đoạn, giá trị dự kiến, ngày chốt và trường tùy chỉnh bắt buộc nếu có.
4. Bấm Lưu thay đổi đúng một lần. Lead phải thành Đã chuyển đổi, không còn nút sửa/chuyển đổi.
5. Sang Khách hàng & liên hệ: có doanh nghiệp và người liên hệ mang tên/email/phone của lead. Mở hồ sơ 360, kiểm tra hoạt động Đã tư vấn gói CRM.
6. Sang Cơ hội & Pipeline: có cơ hội mới, đúng khách hàng/liên hệ/nguồn/chiến dịch. Quay lại chiến dịch kiểm tra số liệu.
7. Ca gắn khách cũ: tạo lead khác, lúc chuyển đổi chọn khách hàng đã có. Phải không tạo thêm doanh nghiệp, vẫn tạo contact/deal đúng khách đã chọn.
8. Ca lỗi: với một lead chưa chuyển, thử thiếu ngày chốt hoặc trường bắt buộc. Không được lưu một phần customer/contact/deal. Tính nguyên tử và gọi hai lần đã có kiểm tra API; nếu chỉ UI chặn trước khi gửi thì chưa đủ chứng minh rollback backend.

Đạt: chuyển cùng một giao dịch, dữ liệu liên kết đúng, lịch sử còn đủ, lead khóa sau chuyển. Không yêu cầu chỉ một nút click mà bỏ qua form nhập các thông tin cơ hội chưa có trên lead.

## S4-09 — Lọc lead, cờ SLA và bộ lọc lưu

Vai trò: Sales Rep; Admin có thể dùng để đối chiếu toàn bộ dữ liệu.

1. Chuẩn bị lead ở các trạng thái/nguồn/điểm/owner khác nhau; bảo đảm có lead thuộc chính tài khoản Sales đang test.
2. Lead & phân bổ: chọn riêng từng điều kiện Trạng thái, Nguồn, Nóng/Ấm/Lạnh, Người phụ trách, Từ ngày/Đến ngày. Mỗi lần đối chiếu kết quả rồi mới kết hợp nhiều điều kiện.
3. Khoảng ngày hiện lọc theo ngày tạo lead, không phải ngày phân bổ hoặc ngày sửa. Lead ngoài scope của Sales không xuất hiện dù bộ lọc khớp.
4. Chọn một tổ hợp, ví dụ Nóng + Đã phân công. Bấm Lưu bộ lọc hiện tại, đặt TEST-S4 Lead cần gọi → Lưu bộ lọc.
5. Bấm Đặt lại, sau đó chọn TEST-S4 Lead cần gọi trong Bộ lọc của tôi: điều kiện và kết quả phải được áp dụng lại. Reload rồi chọn lại vẫn có bộ lọc; không bắt buộc tự áp dụng ngay khi đăng nhập nếu chưa chọn.
6. Kiểm tra lead quá hạn tạo ở S4-07: tag Quá SLA và nền hàng nổi bật. Nếu bộ lọc đang loại lead đó thì Đặt lại trước khi tìm.
7. Đăng nhập người khác: không được dùng hoặc xóa bộ lọc riêng của người trước. Có thể dùng nút Xóa bộ lọc để dọn dữ liệu thử của chính mình.

Đạt: các bộ lọc đúng trường dữ liệu và scope, quá SLA nổi bật, bộ lọc có tên và dùng lại được.

## Cách ghi kết quả để nghiệm thu

Mỗi ca ghi: US/AC → tài khoản/vai trò → dữ liệu test → bước làm → kỳ vọng → thực tế → Đạt/Không đạt/Chưa kiểm tra → ảnh hoặc request/response. Với worker, thêm thời điểm tạo/phân bổ, SLA và trạng thái worker. Không dùng “test suite xanh” thay cho bằng chứng AC triển khai hoặc tải lớn. Không đổi Jira sang Done chỉ từ hướng dẫn này.
