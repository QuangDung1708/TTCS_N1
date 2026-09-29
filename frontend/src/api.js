import axios from 'axios';
import { message } from 'antd';

// Tạo một instance axios dùng chung cho toàn bộ dự án
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// 1. Request Interceptor: Tự động đính Token vào mọi request gửi đi
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Tự động bắt lỗi 401 khi token hết hạn / bị blacklist
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Dọn sạch phiên làm việc
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      message.error(error.response.data.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');

      // Tự động chuyển hướng về trang login sau 1 giây
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;