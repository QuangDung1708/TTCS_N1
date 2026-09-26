import axios from 'axios';
import { message } from 'antd';

// Tạo instance của Axios
const axiosClient = axios.create({
  baseURL: '/api', // Cấu hình baseURL tùy theo BE của dự án
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho Request: Tự động gắn Token vào Header trước khi gửi request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor cho Response: Xử lý tập trung các lỗi từ Server trả về
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Bắt lỗi 401 (Token hết hạn hoặc không hợp lệ)
    if (error.response && error.response.status === 401) {
      // 1. Xóa token ngay lập tức
      localStorage.removeItem('crm_token');

      // 2. Hiển thị thông báo Toast/Alert
      message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');

      // 3. Chuyển hướng về trang login
      window.location.href = '/login';
    }
    // Bắt lỗi 403 (Không đủ quyền truy cập)
    if (error.response && error.response.status === 403) {
      window.location.href = '/403';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;