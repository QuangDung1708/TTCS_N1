import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import axiosClient from '../api/axiosClient'; 

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
                    let response;
                    if (editingUser) {
                     
                        response = await axiosClient.put(`/users/${editingUser.id}`, values);
                    } else {
                    
                        response = await axiosClient.post('/users', values);
                    }

                    message.success(editingUser ? 'Cập nhật thành công!' : 'Thêm thành công!');
                    onSuccess(); 
                } catch (error) {
                    console.error('Lỗi API:', error);
                    const errorMsg = error.response?.data?.message || error.message || 'Lỗi kết nối tới Server!';
                    message.error(errorMsg);
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