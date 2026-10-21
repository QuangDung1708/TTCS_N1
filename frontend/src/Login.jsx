import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

export default function Login({ onLoginSuccess }) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // 1. Gọi API đăng nhập backend
            const response = await axios.post('http://localhost:5001/api/auth/login', {
                email: values.email,
                password: values.password
            });

            const { token, user } = response.data;

            // 2. Lưu JWT Token và User Info vào localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            message.success('Đăng nhập thành công!');

            // 3. Xử lý chuyển trang sang Dashboard
            if (onLoginSuccess) {
                onLoginSuccess(user);
            }
            navigate('/dashboard');

        } catch (error) {
            // 4. Hiển thị thông báo lỗi chung chung (An toàn thông tin, không tiết lộ rõ email hay mật khẩu bị sai)
            const errorMsg = error.response?.data?.message || 'Email hoặc mật khẩu không chính xác!';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#f8fafc',
            padding: 16
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
            >
                {/* Logo & Title */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: '#1677ff',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                    }}>
                        C
                    </div>
                    <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                        ENTERPRISE <span style={{ color: '#1677ff' }}>CRM</span>
                    </Title>
                    <Text type="secondary">Đăng nhập vào hệ thống</Text>
                </div>

                <Form
                    name="login_form"
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    <Form.Item
                        name="email"
                        label={<Text strong>Email</Text>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="nhanvien@company.com"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<Text strong>Mật khẩu</Text>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập Password!' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="••••••••"
                            size="large"
                        />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginBottom: 20 }}>
                        <Button
                            type="link"
                            style={{ padding: 0 }}
                            onClick={() => navigate('/reset-password')}
                        >
                            Quên mật khẩu?
                        </Button>
                    </div>

                    <Form.Item style={{ margin: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={loading}
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}