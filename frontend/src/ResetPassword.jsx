import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Result } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onFinish = async (values) => {
    if (!token) {
      message.error('Thiếu mã liên kết bảo mật (token)!');
      return;
    }
    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/auth/reset-password', {
        token,
        new_password: values.new_password
      });
      setSuccess(true);
      message.success('Đổi mật khẩu thành công!');
    } catch (err) {
      // Báo lỗi nếu token đã dùng hoặc quá 30 phút (AC 1 & AC 2)
      message.error(err.response?.data?.message || 'Liên kết không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Card style={{ width: 440, textAlign: 'center', borderRadius: 16 }}>
          <Result
            status="success"
            title="Đổi Mật Khẩu Thành Công!"
            subTitle="Mật khẩu của bạn đã được cập nhật an toàn. Liên kết này hiện đã bị vô hiệu hóa."
            extra={[
              <Button type="primary" key="login" onClick={() => navigate('/login')}>
                Về Trang Đăng Nhập
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Card style={{ width: 440, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Thiết Lập Mật Khẩu Mới</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Nhập mật khẩu mới cho tài khoản của bạn</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Mật khẩu mới"
            name="new_password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu phải có tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password size="large" prefix={<KeyOutlined />} placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ height: 44, borderRadius: 8 }}>
            Xác Nhận Đổi Mật Khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
}