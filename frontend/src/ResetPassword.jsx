import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, KeyOutlined, CheckCircleFilled } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get('token');

  const onFinish = async (values) => {
    if (!token) return message.error('Liên kết không hợp lệ hoặc đã hết hạn!');
    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/auth/reset-password', {
        token,
        new_password: values.password
      });
      message.success('Đổi mật khẩu thành công! Đang chuyển hướng...');
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 1. Thẻ bao ngoài: Phủ kín 100% màn hình với một màu nền xám duy nhất */
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5', // Nền xám đồng nhất toàn màn hình
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      {/* 2. Thẻ Card: Chỉ riêng Card mới mang màu trắng và đổ bóng */}
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #e8e8e8'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#e6f4ff',
            color: '#1677ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 12
          }}>
            <KeyOutlined />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
            Thiết Lập Mật Khẩu Mới
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Nhập mật khẩu mới cho tài khoản của bạn
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Mật khẩu mới"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
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
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu nhập lại không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
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
              style={{ height: 44, borderRadius: 8, fontWeight: 500 }}
            >
              Xác Nhận Đổi Mật Khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}