import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';

const UserFormModal = ({ visible, onCancel, onSuccess, editingUser }) => {
    const [form] = Form.useForm();

    
    useEffect(() => {
        if (visible) {
            if (editingUser) {
                form.setFieldsValue(editingUser);
            } else {
                form.resetFields();
            }
        }
    }, [visible, editingUser, form]);

  
    const handleOk = () => {
        form.validateFields()
            .then(async (values) => {
                try {
                    const url = editingUser 
                        ? `http://localhost:3000/api/users/${editingUser.id}` 
                        : 'http://localhost:3000/api/users';
                    
                    const method = editingUser ? 'PUT' : 'POST';

                    const response = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(values),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                       
                        throw new Error(data.message || 'Thao tác thất bại');
                    }

                    
                    message.success(editingUser ? 'Cập nhật thành công!' : 'Thêm thành công!');
                    onSuccess(); 
                } catch (error) {
                    message.error(error.message || 'Lỗi kết nối tới Server!');
                }
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
            });
    };

    return (
        <Modal
            title={editingUser ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}
            open={visible}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Lưu"
            cancelText="Hủy"
        >
            <Form form={form} layout="vertical">
                {/* Input: Họ và tên */}
                <Form.Item
                    name="name"
                    label="Họ và tên"
                    rules={[{ required: true, message: 'Vui lòng điền họ và tên!' }]}
                >
                    <Input placeholder="Nhập họ và tên" />
                </Form.Item>

                {/* Input: Email (Có kiểm tra định dạng @) */}
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        { required: true, message: 'Vui lòng điền email!' },
                        { type: 'email', message: 'Email không đúng định dạng (thiếu @)!', warningOnly: true },
                        {
                            validator: (_, value) => {
                                if (!value || value.includes('@')) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error('Email phải chứa ký tự @!'));
                            },
                        },
                    ]}
                >
                    <Input placeholder="Nhập email (ví dụ: abc@gmail.com)" />
                </Form.Item>

                {/* Select: Vai trò */}
                <Form.Item
                    name="role"
                    label="Vai trò"
                    rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                >
                    <Select placeholder="Chọn vai trò">
                        <Select.Option value="Nhân viên">Nhân viên</Select.Option>
                        <Select.Option value="Admin">Admin</Select.Option>
                    </Select>
                </Form.Item>

                {/* Select: Nhóm kinh doanh */}
                <Form.Item
                    name="department"
                    label="Nhóm kinh doanh"
                    rules={[{ required: true, message: 'Vui lòng chọn nhóm kinh doanh!' }]}
                >
                    <Select placeholder="Chọn nhóm kinh doanh">
                        <Select.Option value="Phòng Kinh Doanh 1">Phòng Kinh Doanh 1</Select.Option>
                        <Select.Option value="Phòng Kinh Doanh 2">Phòng Kinh Doanh 2</Select.Option>
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default UserFormModal;