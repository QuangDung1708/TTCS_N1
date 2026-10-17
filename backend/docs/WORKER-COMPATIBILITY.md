# Bản vá worker cho XAMPP / MariaDB 10.4

Lỗi tái hiện trên MariaDB 10.4.34: `ER_PARSE_ERROR` gần `SKIP LOCKED` trong truy vấn lấy lead chưa được phân bổ. MariaDB 10.4 chưa hỗ trợ cú pháp này. Ảnh lỗi của người dùng chỉ hiển thị mã lỗi, chưa xác nhận phiên bản database trên máy người dùng.

Hai truy vấn lead/mail đã chuyển sang `FOR UPDATE`. Phân bổ lead giữ khóa advisory `crm-worker` vốn có. Gửi mail dùng khóa advisory riêng `crm-mail-worker`, tên khóa kèm database hiện tại; worker thứ hai bỏ qua lượt nếu khóa đang được giữ. Khóa được giải phóng sau khi commit/rollback. Phân bổ, SLA, cảnh báo cơ hội và gửi mail vẫn hoạt động, không cần tắt worker.

## Cập nhật bản fullstack đã tải

1. Trong terminal backend, nhấn Ctrl+C để dừng server. Dừng cả `npm run worker` nếu đang chạy riêng.
2. Giải nén `TTCS_N1-worker-fix.zip`; chép đè đúng hai tệp từ thư mục `backend` của bản vá vào thư mục `backend` đang dùng: `src/core/leads.js` và `src/jobs/worker.js`.
3. Chạy lại `npm run dev`.

Bản vá không chứa `.env`, không đổi cấu trúc database, không cần cài lại npm hoặc chạy migration chỉ để áp dụng bản vá này. Hướng dẫn áp dụng cho gói fullstack đã bàn giao, không dành cho backend khác phiên bản. File fullstack tải mới cũng đã chứa bản sửa.

Việc SMTP ngoài có gửi được hay không vẫn phụ thuộc cấu hình SMTP và quyền truy cập hộp thư. Gửi SMTP và commit database không phải một giao dịch nguyên tử: sau sự cố tiến trình đúng lúc gửi, thư có thể được thử lại. Khóa ngăn gửi trùng do nhiều worker hoạt động bình thường, không cam kết gửi đúng một lần khi tiến trình bị sập.

## Kiểm chứng

Kết quả chạy lại được ghi trong báo cáo bàn giao tại `delivery/README.md`. Kiểm thử dùng database riêng, không dùng dữ liệu nghiệp vụ thật của người dùng. Kiểm thử SMTP nhận thư qua socket TCP cục bộ, gồm chạy đồng thời hai worker và kiểm tra không gửi lại thư đã đánh dấu hoàn tất; chưa kiểm chứng hộp thư Gmail ngoài.

Việc sửa worker và kiểm thử liên quan trên MariaDB 10.4 không có nghĩa mọi API được chứng nhận tương thích với MariaDB. MySQL 8.4 tiếp tục là nền tảng kiểm thử toàn bộ backend.
