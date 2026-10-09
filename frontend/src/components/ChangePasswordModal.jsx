import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function ChangePasswordModal({ visible, onClose, onLogout }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5001/api/auth/change-password', {
        current_password: values.current_password,
        new_password: values.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // AC 3: Đổi xong thu hồi các phiên đăng nhập khác -> Đăng xuất và đưa về trang Login
      message.success('Đổi mật khẩu thành công! Phiên đăng nhập đã được thu hồi, vui lòng đăng nhập lại.');
      form.resetFields();
      if (typeof onClose === 'function') onClose();
      
      setTimeout(() => {
        if (typeof onLogout === 'function') {
          onLogout();
        } else {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }, 1000);

    } catch (err) {
      message.error(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Đổi Mật Khẩu Tài Khoản"
      open={visible}
      onCancel={() => {
        form.resetFields();
        if (typeof onClose === 'function') onClose();
      }}
      footer={null}
      destroyOnHidden
      width={420}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
        {/* AC 1: Bắt buộc nhập mật khẩu hiện tại */}
        <Form.Item
          label="Mật khẩu hiện tại"
          name="current_password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu đang dùng" />
        </Form.Item>

        {/* AC 2: Mật khẩu mới tối thiểu 8 ký tự, có chữ và số */}
        <Form.Item
          label="Mật khẩu mới"
          name="new_password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value.length < 8) {
                  return Promise.reject(new Error('Mật khẩu mới phải có tối thiểu 8 ký tự!'));
                }
                if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
                  return Promise.reject(new Error('Mật khẩu mới phải bao gồm cả chữ và số!'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Tối thiểu 8 ký tự, gồm chữ và số" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirm_password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận lại mật khẩu mới!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không trùng khớp!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu Thay Đổi
          </Button>
        </div>
      </Form>
    </Modal>
  );
}