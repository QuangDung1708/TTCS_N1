import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button, Form, Input, ConfigProvider, Typography, message, Layout } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from './api';

message.config({ maxCount: 1 });

const { Title, Text } = Typography;
const { Header, Content } = Layout;

// Theme màu chuẩn hệ thống
const themeConfig = {
  token: {
    colorPrimary: '#ff6b00',
    borderRadius: 6,
  },
};

// ==========================================
// 1. PROTECTED ROUTE
// ==========================================
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ==========================================
// 2. MÀN HÌNH ĐĂNG NHẬP (Bổ sung nút Quên mật khẩu)
// ==========================================
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      const { token, user, message: successMsg } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      messageApi.success(successMsg || 'Đăng nhập thành công!');
      setTimeout(() => navigate('/dashboard'), 1000);
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
    <ConfigProvider theme={themeConfig}>
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

            {/* Link chuyển sang trang Quên mật khẩu */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <Link to="/forgot-password" style={{ color: '#ff6b00', fontSize: '14px' }}>
                Quên mật khẩu?
              </Link>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', fontWeight: 'bold' }}>
                ĐĂNG NHẬP
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </ConfigProvider>
  );
};

// ==========================================
// 3. MÀN HÌNH QUÊN MẬT KHẨU (N1-92)
// ==========================================
const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: values.email });
      messageApi.success(response.data.message);
      setSubmitted(true);
    } catch (error) {
      if (error.response) {
        messageApi.error(error.response.data.message);
      } else {
        messageApi.error('Lỗi kết nối máy chủ!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      {contextHolder}
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '420px', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Title level={2} style={{ color: '#0f172a', margin: 0 }}>Khôi phục mật khẩu</Title>
            <Text type="secondary">Nhập email để nhận liên kết đặt lại mật khẩu</Text>
          </div>

          {!submitted ? (
            <Form name="forgot_form" onFinish={onFinish} layout="vertical" size="large">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email đã đăng ký!' },
                  { type: 'email', message: 'Email không hợp lệ!' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Nhập email của bạn" />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px', marginBottom: '16px' }}>
                <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', fontWeight: 'bold' }}>
                  GỬI LIÊN KẾT
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: '16px' }}>
              <Text strong style={{ color: '#10b981', display: 'block', marginBottom: '8px' }}>
                Yêu cầu đã được ghi nhận!
              </Text>
              <Text type="secondary">
                Vui lòng kiểm tra hòm thư của bạn (hoặc console Terminal) để lấy đường dẫn khôi phục trong vòng 30 phút.
              </Text>
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeftOutlined /> Quay lại Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

// ==========================================
// 4. MÀN HÌNH DASHBOARD
// ==========================================
const Dashboard = () => {
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await api.post('/auth/logout');
      message.success('Đăng xuất an toàn thành công!');
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLogoutLoading(false);
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>HỆ THỐNG CRM</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#cbd5e1' }}>Xin chào, <strong>{user.full_name || 'Người dùng'}</strong></span>
          <Button type="primary" danger loading={logoutLoading} onClick={handleLogout}>Đăng Xuất</Button>
        </div>
      </Header>
      <Content style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <Title level={2}>Chào mừng bạn đến với Dashboard CRM!</Title>
        <Text type="secondary">
          Bạn đang đăng nhập với quyền: <strong>{user.role_id === 1 ? 'Quản trị viên (Admin)' : 'Nhân viên'}</strong>
        </Text>
      </Content>
    </Layout>
  );
};
// ==========================================
// COMPONENT: MÀN HÌNH ĐẶT LẠI MẬT KHẨU (N1-93)
// ==========================================
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Lấy token từ URL (?token=...)
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    if (!token) {
      messageApi.error('Mã xác thực không hợp lệ hoặc bị thiếu!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: values.password,
      });

      messageApi.success(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      if (error.response) {
        messageApi.error(error.response.data.message);
      } else {
        messageApi.error('Lỗi mạng: Không thể kết nối máy chủ!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      {contextHolder}
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <div style={{ width: '420px', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Title level={2} style={{ color: '#0f172a', margin: 0 }}>Mật khẩu mới</Title>
            <Text type="secondary">Nhập mật khẩu mới cho tài khoản của bạn</Text>
          </div>

          <Form name="reset_form" onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên!' },
              ]}
              hasFeedback
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              hasFeedback
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
            </Form.Item>

            <Form.Item style={{ marginTop: '24px', marginBottom: '16px' }}>
              <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', fontWeight: 'bold' }}>
                LƯU MẬT KHẨU
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#64748b' }}>
              Quay lại Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

// ==========================================
// 5. ĐIỀU TUYẾN CHÍNH
// ==========================================
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
};

export default App;