import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login({ onLoginSuccess }) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = (values) => {
        setLoading(true);
        // Dựng UI tĩnh: giả lập đăng nhập thành công sau 0.5s
        setTimeout(() => {
            setLoading(false);
            message.success('Đăng nhập thành công (Giao diện tĩnh)!');
            if (onLoginSuccess) {
                onLoginSuccess({ full_name: 'Người dùng Demo', role_code: 'Admin' });
            } else {
                navigate('/dashboard');
            }
        }, 500);
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
                {/* Logo & Tiêu đề */}
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

                {/* Form Đăng Nhập */}
                <Form
                    name="login_form"
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    {/* Ô Input Email */}
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

                    {/* Ô Input Password */}
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

                    {/* Link Quên mật khẩu */}
                    <div style={{ textAlign: 'right', marginBottom: 20 }}>
                        <Button
                            type="link"
                            style={{ padding: 0 }}
                            onClick={() => navigate('/reset-password')}
                        >
                            Quên mật khẩu?
                        </Button>
                    </div>

                    {/* Nút Đăng nhập */}
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