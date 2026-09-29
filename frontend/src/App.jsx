import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Button, Form, Input, ConfigProvider, Typography, message, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

// 1. FIX LỖI 2 POPUP: Giới hạn Ant Design chỉ hiển thị tối đa 1 thông báo
message.config({ maxCount: 1 });

const { Title, Text } = Typography;

// ==========================================
// COMPONENT 1: MÀN HÌNH ĐĂNG NHẬP
// ==========================================
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email: values.email,
        password: values.password
      });

      const { token, user, message: successMsg } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      messageApi.success(successMsg || 'Đăng nhập thành công!');
      
      setTimeout(() => {
        navigate('/dashboard'); // Chuyển hướng sang URL /dashboard
      }, 1000);

    } catch (error) {
      if (error.response) {
        messageApi.error(error.response.data.message);
      } else {
        messageApi.error('Lỗi mạng: Không thể kết nối đến máy chủ!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#ff6b00', borderRadius: 6 } }}>
      {contextHolder}
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '400px', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
             <Title level={2} style={{ color: '#0f172a', margin: 0 }}>HỆ THỐNG CRM</Title>
             <Text type="secondary">Vui lòng đăng nhập để tiếp tục</Text>
          </div>
          <Form name="login_form" onFinish={onFinish} layout="vertical" size="large">
            <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email công ty!' }, { type: 'email', message: 'Email không đúng định dạng!' }]}>
              <Input prefix={<UserOutlined />} placeholder="Email công ty" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
            </Form.Item>
            <Form.Item style={{ marginTop: '30px', marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', fontWeight: 'bold' }}>ĐĂNG NHẬP</Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </ConfigProvider>
  );
};

// ==========================================
// COMPONENT 2: MÀN HÌNH DASHBOARD (Có Header + Logout API)
// ==========================================
const { Header, Content } = Layout;

const Dashboard = () => {
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Lấy thông tin user đã lưu trong localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    setLogoutLoading(true);
    const token = localStorage.getItem('token');

    try {
      if (token) {
        // Gọi API Backend để đưa token vào Blacklist
        await axios.post(
          'http://localhost:5001/api/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      messageApi.success('Đăng xuất an toàn thành công!');
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error);
      messageApi.warning('Đã kết thúc phiên trên máy.');
    } finally {
      // Dọn sạch dữ liệu ở client dù API trả lời thế nào
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLogoutLoading(false);

      setTimeout(() => {
        navigate('/login');
      }, 500);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      {/* Header chuẩn tông Midnight Blue (#0f172a) */}
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          padding: '0 24px',
        }}
      >
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
          HỆ THỐNG CRM
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#cbd5e1' }}>
            Xin chào, <strong>{user.full_name || 'Người dùng'}</strong>
          </span>
          <Button
            type="primary"
            danger
            loading={logoutLoading}
            onClick={handleLogout}
          >
            Đăng Xuất
          </Button>
        </div>
      </Header>

      <Content
        style={{
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
        }}
      >
        <Title level={2}>Chào mừng bạn đến với Dashboard CRM!</Title>
        <Text type="secondary">
          Bạn đang đăng nhập với quyền: <strong>{user.role_id === 1 ? 'Quản trị viên (Admin)' : 'Nhân viên'}</strong>
        </Text>
      </Content>
    </Layout>
  );
};

// ==========================================
// COMPONENT CHÍNH: TỔNG ĐÀI ROUTER
// ==========================================
const App = () => {
  return (
    <Routes>
      {/* Tự động điều hướng từ / sang /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Khai báo các đường dẫn */}
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;