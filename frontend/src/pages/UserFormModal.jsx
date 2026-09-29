import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import axiosClient from '../utils/axiosClient'; 

const UserFormModal = ({ visible, onCancel, onSuccess, editingUser }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

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
                    setLoading(true);
                    let response;
                    if (editingUser) {
                        response = await axiosClient.put(`/users/${editingUser.id}`, values);
                    } else {
                        response = await axiosClient.post('/users', values);
                    }

                    message.success(editingUser ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên mới thành công!');
                    form.resetFields();
                    setLoading(false);
                    onSuccess(); 
                } catch (error) {
                    setLoading(false);
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
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            onOk={handleOk}
            confirmLoading={loading}
            okText="Lưu"
            cancelText="Hủy"
        >
            <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
                {/* Input: Họ và tên */}
                <Form.Item
                    name="name"
                    label="Họ và tên"
                    rules={[{ required: true, message: 'Vui lòng điền họ và tên!' }]}
                >
                    <Input placeholder="Nhập họ và tên nhân viên" />
                </Form.Item>

                {/* Input: Email (Có kiểm tra định dạng @) */}
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        { required: true, message: 'Vui lòng điền email!' },
                        { type: 'email', message: 'Email không đúng định dạng!' },
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
                    <Input placeholder="Ví dụ: name@company.com" />
                </Form.Item>

                {/* Select: Vai trò */}
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

                {/* Select: Nhóm kinh doanh / Phòng ban */}
                <Form.Item
                    name="department"
                    label="Nhóm kinh doanh / Phòng ban"
                    rules={[{ required: true, message: 'Vui lòng chọn nhóm kinh doanh!' }]}
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