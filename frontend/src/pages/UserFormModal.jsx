import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';

const { Option } = Select;

const UserFormModal = ({ visible, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();

  // Khi initialValues thay đổi (bấm sửa dòng nào đó), tự động điền dữ liệu vào form
  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('Dữ liệu submit:', values);

      // TODO: Gọi API PUT /api/users/${initialValues.id}/roles ở đây khi ghép BE
      
      message.success(initialValues ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên thành công!');
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.log('Lỗi validate:', error);
    }
  };

  return (
    <Modal
      title={
        <span style={{ color: '#003eb3', fontWeight: 600, fontSize: '18px' }}>
          {initialValues ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
        </span>
      }
      open={visible}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={[
        <Button key="back" onClick={onCancel} style={{ borderRadius: '6px' }}>
          Hủy
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit} 
          style={{ background: '#1890ff', borderColor: '#1890ff', borderRadius: '6px' }}
        >
          Lưu
        </Button>,
      ]}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: '20px' }}
      >
        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
        >
          <Input placeholder="Nhập họ và tên" style={{ borderRadius: '6px', height: '38px' }} />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, message: 'Vui lòng nhập email!' }]}
        >
          {/* Nếu đang sửa (initialValues có tồn tại) thì khóa ô email lại không cho chỉnh sửa */}
          <Input 
            placeholder="Ví dụ: name@company.com" 
            disabled={!!initialValues} 
            style={{ borderRadius: '6px', height: '38px', backgroundColor: initialValues ? '#f5f5f5' : '#fff' }} 
          />
        </Form.Item>

        <Form.Item
          name="role"
          label="Vai trò"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
        >
          <Select placeholder="Chọn vai trò" style={{ height: '38px' }}>
            <Option value="Admin">Admin</Option>
            <Option value="Trưởng nhóm">Trưởng nhóm</Option>
            <Option value="Nhân viên">Nhân viên</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="group"
          label="Nhóm kinh doanh"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm!' }]}
        >
          <Select placeholder="Chọn nhóm kinh doanh" style={{ height: '38px' }}>
            <Option value="Ban Giám Đốc">Ban Giám Đốc</Option>
            <Option value="Phòng Kinh Doanh 1">Phòng Kinh Doanh 1</Option>
            <Option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;