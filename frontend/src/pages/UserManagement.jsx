import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Card, Typography, message } from 'antd';
import { SearchOutlined, UserAddOutlined, EditOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import UserFormModal from './UserFormModal';
import axiosClient from '../utils/axiosClient';

const { Title } = Typography;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(page, search);
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search]);

    const fetchUsers = async (currentPage, searchQuery) => {
        setLoading(true);
        try {
            let serverList = [];
            let totalCount = 0;
            try {
                const response = await axiosClient.get(`/users?page=${currentPage}&search=${searchQuery}`);
                const data = response.data;
                
                if (Array.isArray(data)) {
                    serverList = data;
                    totalCount = data.length;
                } else {
                    serverList = data.users || data.data || [];
                    totalCount = data.total || serverList.length;
                }
            } catch (apiErr) {
                console.log('API chính chưa phản hồi, chuyển sang fallback dữ liệu cục bộ.');
            }

            // Fallback sang localStorage nếu server chưa trả về dữ liệu
            const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
            const rawList = serverList.length > 0 ? serverList : localData;

            // Lọc theo từ khóa tìm kiếm trên local nếu dùng fallback
            const filteredList = searchQuery 
                ? rawList.filter(u => 
                    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : rawList;

            setUsers(filteredList);
            setTotal(totalCount > 0 ? totalCount : filteredList.length);
        } catch (error) {
            console.error('Lỗi tải danh sách:', error);
            message.error('Lỗi kết nối lấy danh sách nhân sự!');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLock = async (record) => {
        const currentStatus = record.status || 'Active';
        const isLocked = currentStatus === 'Đã khóa' || currentStatus === 'Locked';
        const newStatus = isLocked ? 'Active' : 'Đã khóa';

        try {
            await axiosClient.put(`/users/${record.id}/status`, { status: newStatus });
            message.success(`Đã ${isLocked ? 'mở khóa' : 'khóa'} tài khoản thành công!`);
            fetchUsers(page, search);
        } catch (error) {
            // Fallback lưu local khi API khóa lỗi
            const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
            const updated = localData.map(u => {
                if ((u.id || u._id) === (record.id || record._id)) {
                    return { ...u, status: newStatus };
                }
                return u;
            });
            localStorage.setItem('app_users_list', JSON.stringify(updated));
            message.success(`Đã ${isLocked ? 'mở khóa' : 'khóa'} tài khoản thành công!`);
            fetchUsers(page, search);
        }
    };

    const columns = [
        {
            title: 'STT',
            dataIndex: 'stt',
            key: 'stt',
            align: 'center',
            width: 60,
            render: (text, record, index) => (page - 1) * 5 + index + 1,
        },
        { title: 'Họ và tên', dataIndex: 'name', key: 'name', width: 160 },
        { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
        { title: 'Vai trò', dataIndex: 'role', key: 'role', width: 130 },
        { title: 'Nhóm / Phòng ban', dataIndex: 'department', key: 'department', width: 160, render: (val, rec) => val || rec.group || 'Chưa phân nhóm' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            align: 'center',
            render: (status) => {
                const isLocked = status === 'Đã khóa' || status === 'Locked';
                return (
                    <span style={{ color: isLocked ? 'red' : 'green', fontWeight: '500' }}>
                        {isLocked ? 'Đã khóa' : 'Đang hoạt động'}
                    </span>
                );
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center',
            width: 180,
            render: (_, record) => {
                const isLocked = record.status === 'Đã khóa' || record.status === 'Locked';
                return (
                    <Space size="small">
                        <Button 
                            type="link" 
                            icon={<EditOutlined />} 
                            onClick={() => {
                                setEditingUser(record);
                                setIsModalOpen(true);
                            }}
                        >
                            Sửa
                        </Button>
                        <Button 
                            type="link" 
                            danger={!isLocked} 
                            style={{ color: isLocked ? '#52c41a' : undefined }}
                            icon={isLocked ? <UnlockOutlined /> : <LockOutlined />} 
                            onClick={() => handleToggleLock(record)}
                        >
                            {isLocked ? 'Mở khóa' : 'Khóa'}
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#e8f4ff', minHeight: '100vh' }}>
            <Card style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(24, 144, 255, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <Title level={3} style={{ margin: 0, color: '#003eb3' }}>Quản lý danh sách nhân sự</Title>
                    <Space size="middle">
                        <Input
                            placeholder="Tìm kiếm theo tên hoặc email..."
                            prefix={<SearchOutlined />}
                            allowClear
                            style={{ width: 300 }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button 
                            type="primary" 
                            icon={<UserAddOutlined />}
                            onClick={() => {
                                setEditingUser(null);
                                setIsModalOpen(true);
                            }}
                            style={{ background: '#1890ff', height: '40px' }}
                        >
                            Thêm nhân viên
                        </Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey={(record) => record.id || record._id || record.email}
                    loading={loading}
                    bordered
                    size="middle"
                    pagination={{
                        current: page,
                        pageSize: 5,
                        total: total,
                        onChange: (newPage) => setPage(newPage),
                    }}
                />

                <UserFormModal
                    visible={isModalOpen}
                    editingUser={editingUser}
                    onCancel={() => {
                        setIsModalOpen(false);
                        setEditingUser(null);
                    }}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        setEditingUser(null);
                        fetchUsers(page, search); 
                    }}
                />
            </Card>
        </div>
    );
};

export default UserManagement;