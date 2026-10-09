import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, theme } from 'antd';
import { LockOutlined, KeyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form] = Form.useForm();
  
  // Lấy bộ token chuẩn của Ant Design (Mặc định là Light Mode)
  const { token: themeToken } = theme.useToken();

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');

  const onFinish = async (values) => {
    if (!token) {
      return message.error('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!');
    }
    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/auth/reset-password', {
        token,
        new_password: values.password
      });
      message.success('Thiết lập mật khẩu mới thành công!');
      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: themeToken.colorBgLayout || '#f5f5f5', // Nền xám nhạt chuẩn Ant Design
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: themeToken.colorBgContainer || '#ffffff',
          borderRadius: 12,
          boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
          border: `1px solid ${themeToken.colorBorderSecondary || '#f0f0f0'}`
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: isSuccess ? '#f6ffed' : '#e6f4ff',
            color: isSuccess ? '#52c41a' : '#1677ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            marginBottom: 16
          }}>
            {isSuccess ? <CheckCircleOutlined /> : <KeyOutlined />}
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
            {isSuccess ? 'Đổi Mật Khẩu Thành Công' : 'Thiết Lập Mật Khẩu Mới'}
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {isSuccess 
              ? 'Hệ thống đang chuyển hướng về màn hình đăng nhập...' 
              : 'Nhập mật khẩu mới an toàn cho tài khoản của bạn'}
          </Text>
        </div>

        {!isSuccess && (
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
            <Form.Item
              label="Mật khẩu mới"
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: themeToken.colorTextPlaceholder }} />}
                placeholder="Tối thiểu 6 ký tự"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Xác nhận mật khẩu mới"
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu nhập lại không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: themeToken.colorTextPlaceholder }} />}
                placeholder="Nhập lại mật khẩu mới"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{ height: 42, fontWeight: 500 }}
              >
                Xác Nhận Đổi Mật Khẩu
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}