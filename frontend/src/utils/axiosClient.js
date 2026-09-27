import axios from 'axios';
import { message } from 'antd';

const axiosClient = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

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

axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    
    if (error.response && error.response.status === 401) {
      
      localStorage.removeItem('crm_token');

      message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');

      window.location.href = '/login';
    }

    if (error.response && error.response.status === 403) {
      window.location.href = '/403';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;