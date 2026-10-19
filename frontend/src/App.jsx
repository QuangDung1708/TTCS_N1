import React, { useState, useEffect } from 'react';
import { 
    Layout, Menu, Button, Avatar, Badge, Dropdown, Space, Tag, 
    Card, Row, Col, Statistic, Progress, Table, Typography, 
    ConfigProvider, theme, message, Popover, List, Modal, Form, 
    Input, Upload, Divider, Spin, Empty 
} from 'antd';
import {
    MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined,
    UsergroupAddOutlined, RiseOutlined, AppstoreOutlined,
    TeamOutlined, SafetyCertificateOutlined, BellOutlined,
    LogoutOutlined, KeyOutlined, UserOutlined, ArrowUpOutlined, 
    DollarCircleOutlined, TrophyOutlined, FireOutlined, ReloadOutlined, 
    PlusOutlined, UploadOutlined, PhoneOutlined, MailOutlined,
    BranchesOutlined, SettingOutlined, HistoryOutlined, TagsOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import AccountManagement from './components/AccountManagement';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import CustomerManagement from './CustomerManagement';
import UserManagement from './UserManagement';
import PermissionMatrix from './PermissionMatrix';
import CategoryManagement from './CategoryManagement';
import CustomFieldSettings from './CustomFieldSettings';
import AuditLogManagement from './AuditLogManagement';
import ChangePasswordModal from './components/ChangePasswordModal';
import ProductManagement from './ProductManagement';
import PipelineManagement from './PipelineManagement';
import Login from './Login';
import SaaSOrgTree from './SalesOrgTree';
import NotificationBell from './NotificationBell';
import ResetPassword from './ResetPassword';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// --- 1. DASHBOARD DỮ LIỆU ĐỘNG 100% ---
function DashboardOverview() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const [kpi, setKpi] = useState({
        totalCustomers: 0,
        newCustomers: 0,
        pipelineValue: 0,
        dealsWon: 0,
        winRate: 0,
        targetProgress: 0
    });
    const [funnel, setFunnel] = useState({ discovery: 0, proposal: 0, negotiation: 0, won: 0 });
    const [recentDeals, setRecentDeals] = useState([]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setKpi(res.data.kpi);
                setFunnel(res.data.funnel);
                setRecentDeals(res.data.recentDeals);
            }
        } catch {
            message.error('Lỗi nạp dữ liệu thống kê từ cơ sở dữ liệu!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const stageColors = { Discovery: 'blue', Proposal: 'orange', Negotiation: 'purple', Won: 'success', Lost: 'error' };

    const columns = [
        { 
            title: 'Doanh nghiệp / Khách hàng', 
            dataIndex: 'company', 
            render: (t) => <Text strong style={{ color: '#1677ff' }}>{t}</Text> 
        },
        { title: 'Tên cơ hội / Dự án', dataIndex: 'deal' },
        { 
            title: 'Giá trị', 
            dataIndex: 'value', 
            render: (v) => <Text strong style={{ color: '#0f766e' }}>{Number(v || 0).toLocaleString('vi-VN')} đ</Text> 
        },
        { 
            title: 'Giai đoạn', 
            dataIndex: 'stage', 
            render: (s) => <Tag color={stageColors[s] || 'default'}>{s}</Tag> 
        },
        { title: 'Người phụ trách', dataIndex: 'owner' }
    ];

    return (
        <Spin spinning={loading}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>Bảng Tin Tổng Quan Doanh Nghiệp</Title>
                        <Paragraph type="secondary" style={{ margin: 0 }}>
                            Phạm vi dữ liệu: <Tag color="blue">{currentUser.role_code === 'Admin' || currentUser.role_code === 'Director' ? 'Toàn bộ công ty' : currentUser.role_code}</Tag>
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchStats}>Cập nhật</Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customers')}>Tạo Khách Hàng</Button>
                        </Space>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title="TỔNG KHÁCH HÀNG"
                                value={kpi.totalCustomers}
                                prefix={<UsergroupAddOutlined style={{ color: '#1677ff', marginRight: 8 }} />}
                                suffix={<small style={{ fontSize: 12, color: '#52c41a' }}><ArrowUpOutlined /> +{kpi.newCustomers} mới</small>}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title="GIÁ TRỊ PIPELINE"
                                value={(Number(kpi.pipelineValue || 0) / 1000000000).toFixed(2)}
                                precision={2}
                                suffix="Tỷ VNĐ"
                                prefix={<DollarCircleOutlined style={{ color: '#fa8c16', marginRight: 8 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <Statistic
                                title="HỢP ĐỒNG ĐÃ CHỐT"
                                value={kpi.dealsWon}
                                prefix={<TrophyOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
                                suffix={`(Tỷ lệ ${kpi.winRate}%)`}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text strong style={{ color: '#64748b' }}>TIẾN ĐỘ THÁNG</Text>
                                <Text strong style={{ color: '#1677ff' }}>{kpi.targetProgress}%</Text>
                            </div>
                            <Progress percent={kpi.targetProgress} strokeColor="#1677ff" showInfo={false} />
                            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Dữ liệu thực tế từ hệ thống</div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card title={<Space><FireOutlined style={{ color: '#ff4d4f' }} /> Phễu Chuyển Đổi Thực Tế</Space>} style={{ borderRadius: 12, height: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>Tiếp cận (Discovery)</Text>
                                        <Text strong>{funnel.discovery || 0} Deals</Text>
                                    </div>
                                    <Progress percent={funnel.discovery > 0 ? 100 : 0} strokeColor="#1677ff" showInfo={false} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>Đề xuất (Proposal)</Text>
                                        <Text strong>{funnel.proposal || 0} Deals</Text>
                                    </div>
                                    <Progress percent={funnel.proposal > 0 ? 60 : 0} strokeColor="#fa8c16" showInfo={false} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>Đàm phán (Negotiation)</Text>
                                        <Text strong>{funnel.negotiation || 0} Deals</Text>
                                    </div>
                                    <Progress percent={funnel.negotiation > 0 ? 30 : 0} strokeColor="#722ed1" showInfo={false} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>Thành công (Won)</Text>
                                        <Text strong style={{ color: '#52c41a' }}>{funnel.won || 0} Hợp đồng</Text>
                                    </div>
                                    <Progress percent={funnel.won > 0 ? 100 : 0} strokeColor="#52c41a" showInfo={false} />
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={16}>
                        <Card title="Giao Dịch Gần Đây" extra={<Button type="link" onClick={() => navigate('/deals')}>Xem Pipeline</Button>} style={{ borderRadius: 12 }}>
                            {recentDeals.length > 0 ? (
                                <Table dataSource={recentDeals} columns={columns} pagination={false} size="middle" />
                            ) : (
                                <Empty description="Chưa có bản ghi cơ hội bán hàng nào trong cơ sở dữ liệu" style={{ padding: '24px 0' }} />
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        </Spin>
    );
}

// --- 2. LAYOUT CHÍNH: CHUÔNG VÀ PROFILE ĐỘNG ---
export default function App() {
    const [collapsed, setCollapsed] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForm] = Form.useForm();
    const [avatarUrl, setAvatarUrl] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const isResetPath = window.location.pathname.includes('/reset-password') || 
                        window.location.search.includes('token=');

    if (isResetPath) {
        return <ResetPassword />;
    }

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (token && savedUser) {
                return JSON.parse(savedUser);
            }
        } catch (e) {
            console.error('Lỗi đọc session:', e);
        }
        return null;
    });

    const isAdmin = currentUser?.role_code === 'Admin';
    const isDirector = currentUser?.role_code === 'Director';

    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const fetchNotifications = async () => {
        setNotifLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/dashboard/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.data || []);
        } catch (_) {}
        finally {
            setNotifLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.user) {
                setCurrentUser(res.data.user);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setAvatarUrl(res.data.user.avatar || '');
            }
        } catch (_) {}
    };

    useEffect(() => {
        fetchNotifications();
        fetchUserProfile();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.clear();
        sessionStorage.clear();

        if (typeof setCurrentUser === 'function') setCurrentUser(null);

        message.success('Đã đăng xuất thành công!');
        setTimeout(() => {
            window.location.replace('/login');
        }, 200);
    };

    const handleSaveProfile = async (values) => {
        setSavingProfile(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:5001/api/users/profile', {
                full_name: values.full_name,
                phone: values.phone,
                email_signature: values.email_signature,
                avatar: avatarUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updated = res.data.user;
            setCurrentUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));

            message.success('Cập nhật hồ sơ thành công vào cơ sở dữ liệu!');
            setIsProfileModalOpen(false);
        } catch (err) {
            message.error(err.response?.data?.message || 'Lỗi cập nhật hồ sơ!');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleAvatarUpload = (info) => {
        const file = info.file.originFileObj || info.file;
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            message.error('Chỉ chấp nhận JPG hoặc PNG!');
            return false;
        }
        if (file.size / 1024 / 1024 >= 2) {
            message.error('Kích thước ảnh đại diện phải nhỏ hơn 2MB!');
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarUrl(e.target.result);
            message.success('Đã tải ảnh lên! Nhấn "Lưu thay đổi" để cập nhật vào database.');
        };
        reader.readAsDataURL(file);
        return false;
    };

    const menuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng Quan' },
        { type: 'divider' },
        {
            type: 'group',
            label: collapsed ? null : 'KINH DOANH & KHÁCH HÀNG',
            children: [
                { key: '/accounts', icon: <UserOutlined />, label: 'Quản Lý Tài Khoản' },
                { key: '/customers', icon: <UsergroupAddOutlined />, label: 'Khách Hàng & Liên Hệ' },
                { key: '/deals', icon: <RiseOutlined />, label: 'Cơ Hội & Pipeline' },
                { key: '/products', icon: <AppstoreOutlined />, label: 'Sản Phẩm Dịch Vụ' },
                { key: '/categories', icon: <TagsOutlined />, label: 'Danh Mục Bán Hàng' }
            ]
        },
        ...((isAdmin || isDirector) ? [
            { type: 'divider' },
            {
                type: 'group',
                label: collapsed ? null : 'QUẢN TRỊ HỆ THỐNG',
                children: [
                    { key: '/organization', icon: <BranchesOutlined />, label: 'Cơ Cấu Tổ Chức' },
                    { key: '/users', icon: <TeamOutlined />, label: 'Quản Trị Người Dùng' },
                    { key: '/roles', icon: <SafetyCertificateOutlined />, label: 'Ma Trận Phân Quyền' },
                    { key: '/custom-fields', icon: <SettingOutlined />, label: 'Trường Tùy Biến' },
                    { key: '/audit-logs', icon: <HistoryOutlined />, label: 'Nhật Ký Thao Tác' }
                ]
            }
        ] : [])
    ];

    if (window.location.pathname === '/login') {
        return <Login onLoginSuccess={(userData) => {
            setCurrentUser(userData);
            window.location.href = '/dashboard';
        }} />;
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: { colorPrimary: '#1677ff', borderRadius: 8, fontFamily: 'Inter, system-ui, sans-serif' }
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={250}
                    collapsedWidth={80}
                    style={{ background: '#ffffff', borderRight: '1px solid #f0f0f0', position: 'sticky', top: 0, height: '100vh', zIndex: 10 }}
                >
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: collapsed ? '0 24px' : '0 20px', gap: 12, borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#1677ff', color: '#fff', fontWeight: 'bold', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            C
                        </div>
                        {!collapsed && (
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                                ENTERPRISE <span style={{ color: '#1677ff' }}>CRM</span>
                            </div>
                        )}
                    </div>
                    <Menu mode="inline" selectedKeys={[location.pathname]} onClick={({ key }) => navigate(key)} items={menuItems} style={{ borderRight: 0, marginTop: 8 }} />
                </Sider>

                <Layout style={{ background: '#f8fafc' }}>
                    <Header style={{ padding: '0 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 9 }}>
                        <Button type="text" icon={collapsed ? <MenuUnfoldOutlined style={{ fontSize: 18 }} /> : <MenuFoldOutlined style={{ fontSize: 18 }} />} onClick={() => setCollapsed(!collapsed)} style={{ width: 44, height: 44 }} />

                        <Space size={18}>
                            <NotificationBell />

                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'profile',
                                            label: 'Hồ sơ cá nhân',
                                            onClick: () => setIsProfileModalOpen(true),
                                        },
                                        {
                                            type: 'divider',
                                        },
                                        {
                                            key: 'changePassword',
                                            label: 'Đổi mật khẩu',
                                            onClick: () => setIsPasswordModalVisible(true),
                                        },
                                        {
                                            key: 'logout',
                                            danger: true,
                                            label: 'Đăng xuất',
                                            onClick: handleLogout,
                                        },
                                    ],
                                }}
                                trigger={['click']}
                                placement="bottomRight"
                            >
                                <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
                                    <Avatar 
                                        src={avatarUrl || currentUser?.avatar} 
                                        style={{ backgroundColor: '#1677ff' }}
                                    >
                                        {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                                    </Avatar>
                                    <div style={{ lineHeight: 1.2 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                            {currentUser?.full_name || 'Người dùng'}
                                        </div>
                                        <Tag color={isAdmin ? 'red' : (isDirector ? 'purple' : 'blue')} style={{ margin: 0, fontSize: 10 }}>
                                            {currentUser?.role_code || 'Nhân viên'}
                                        </Tag>
                                    </div>
                                </Space>
                            </Dropdown> 
                        </Space>
                    </Header>

                    <Content style={{ margin: '20px 24px', minHeight: 'calc(100vh - 104px)' }}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardOverview />} />
                            <Route path="/accounts" element={<AccountManagement />} />
                            <Route path="/customers" element={<CustomerManagement />} />
                            <Route path="/deals" element={<PipelineManagement />} />
                            <Route path="/products" element={<ProductManagement />} />
                            <Route path="/categories" element={<CategoryManagement />} />
                            <Route path="/organization" element={<SaaSOrgTree />} />
                            <Route path="/users" element={<UserManagement />} />
                            <Route path="/roles" element={<PermissionMatrix />} />
                            <Route path="/custom-fields" element={<CustomFieldSettings />} />
                            <Route path="/audit-logs" element={<AuditLogManagement />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                        </Routes>
                    </Content>
                </Layout>

                {ChangePasswordModal && (
                    <ChangePasswordModal visible={isPasswordModalVisible} onClose={() => setIsPasswordModalVisible(false)} onLogout={handleLogout} />
                )}

                <Modal
                    title={<Space><UserOutlined style={{ color: '#1677ff' }} /> <span style={{ fontWeight: 700 }}>Hồ Sơ Cá Nhân & Chữ Ký Email</span></Space>}
                    open={isProfileModalOpen}
                    onCancel={() => setIsProfileModalOpen(false)}
                    onOk={profileForm.submit}
                    confirmLoading={savingProfile}
                    okText="Lưu thay đổi"
                    cancelText="Đóng"
                    width={560}
                    destroyOnClose
                >
                    <Divider style={{ margin: '12px 0 20px' }} />
                    <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                            <Avatar size={72} src={avatarUrl} style={{ backgroundColor: '#1677ff', fontSize: 28 }}>
                                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                            </Avatar>
                            <div>
                                <Upload beforeUpload={() => false} onChange={handleAvatarUpload} showUploadList={false} accept="image/png, image/jpeg">
                                    <Button icon={<UploadOutlined />}>Tải ảnh đại diện</Button>
                                </Upload>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                    Hỗ trợ JPG, PNG ≤ 2MB (Tự động cắt vuông)
                                </div>
                            </div>
                        </div>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="full_name" label={<Text strong>Họ và tên</Text>} rules={[{ required: true, message: 'Nhập họ và tên!' }]}>
                                    <Input placeholder="Nguyễn Văn A" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="phone"
                                    label={<Text strong>Số điện thoại</Text>}
                                    rules={[
                                        { required: true, message: 'Nhập số điện thoại!' },
                                        { pattern: /(84|0[3|5|7|8|9])+([0-9]{8})\b/, message: 'Số điện thoại Việt Nam không hợp lệ!' }
                                    ]}
                                >
                                    <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="09xxxxxxxx" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="email" label="Email (Cố định)">
                                    <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} disabled />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="role_code" label="Vai trò phân quyền">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            </Layout>
        </ConfigProvider>
    );
}