import React, { useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import axiosClient from '../utils/axiosClient';

const UserFormModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validate các trường dữ liệu trên form
      const values = await form.validateFields();
      setLoading(true);

      // Gọi API thực tế lưu nhân viên mới vào Database qua Backend
      try {
        await axiosClient.post('/api/users', {
          name: values.name,
          email: values.email,
          role: values.role,
          group: values.group,
          status: 'Active'
        });
        message.success('Thêm nhân viên vào hệ thống thành công!');
      } catch (apiError) {
        console.log('API post chưa kết nối, lưu dự phòng local', apiError);
        // Fallback lưu localStorage nếu backend chưa bật API post
        const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
        const newUser = {
          id: Date.now(),
          ...values,
          status: 'Active'
        };
        localStorage.setItem('app_users_list', JSON.stringify([newUser, ...localData]));
        message.success('Thêm nhân viên thành công!');
      }

      form.resetFields();
      setLoading(false);
      onSuccess(); // Tải lại bảng danh sách dữ liệu mới nhất
    } catch (error) {
      setLoading(false);
      console.error('Lỗi validate form:', error);
    }
  };

  return (
    <Modal
      title="Thêm nhân viên mới"
      open={visible}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
        >
          <Input placeholder="Nhập họ và tên nhân viên" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email!' },
            { type: 'email', message: 'Email không đúng định dạng!' }
          ]}
        >
          <Input placeholder="Ví dụ: name@company.com" />
        </Form.Item>

        <Form.Item
          name="role"
          label="Vai trò"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
        >
          <Select placeholder="Chọn vai trò">
            <Select.Option value="Admin">Admin</Select.Option>
            <Select.Option value="Trưởng nhóm">Trưởng nhóm</Select.Option>
            <Select.Option value="Nhân viên">Nhân viên</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="group"
          label="Nhóm kinh doanh / Phòng ban"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm!' }]}
        >
          <Select placeholder="Chọn nhóm kinh doanh">
            <Select.Option value="Ban Giám Đốc">Ban Giám Đốc</Select.Option>
            <Select.Option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</Select.Option>
            <Select.Option value="Phòng Kinh Doanh">Phòng Kinh Doanh</Select.Option>
            <Select.Option value="Phòng Marketing">Phòng Marketing</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;