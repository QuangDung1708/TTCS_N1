import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message, Card } from 'antd';
import { SearchOutlined, UserAddOutlined, EditOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import UserFormModal from './UserFormModal';
import axiosClient from '../api/axiosClient'; 

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
         
            const response = await axiosClient.get(`/users?page=${currentPage}&search=${searchQuery}`);
            const data = response.data;
            
            if (Array.isArray(data)) {
                setUsers(data);
                setTotal(data.length);
            } else {
                setUsers(data.users || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi kết nối API lấy danh sách!');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLock = async (record) => {
        const newStatus = record.status === 'Đã khóa' ? 'Đang hoạt động' : 'Đã khóa';
        try {
    
            await axiosClient.put(`/users/${record.id}/status`, { status: newStatus });
            
            message.success(`Đã ${newStatus === 'Đã khóa' ? 'khóa' : 'mở khóa'} nhân viên thành công!`);
            fetchUsers(page, search); 
        } catch (error) {
            message.error('Không thể thay đổi trạng thái nhân viên!');
        }
    };

    const columns = [
        {
            title: 'STT',
            dataIndex: 'id',
            key: 'stt',
            render: (text, record, index) => (page - 1) * 10 + index + 1,
        },
        { title: 'Họ và tên', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Vai trò', dataIndex: 'role', key: 'role' },
        { title: 'Nhóm', dataIndex: 'department', key: 'department' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const isLocked = status === 'Đã khóa';
                return (
                    <span style={{ color: isLocked ? 'red' : 'green', fontWeight: '500' }}>
                        {status || 'Đang hoạt động'}
                    </span>
                );
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => {
                const isLocked = record.status === 'Đã khóa';
                return (
                    <Space size="middle">
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
        <Card title="Quản lý danh sách nhân sự" bordered={false} style={{ margin: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space size="middle">
                    <Input
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        prefix={<SearchOutlined />}
                        allowClear
                        style={{ width: 300 }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Space>
                <Button 
                    type="primary" 
                    icon={<UserAddOutlined />}
                    onClick={() => {
                        setEditingUser(null);
                        setIsModalOpen(true);
                    }}
                >
                    Thêm nhân viên
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
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
                onCancel={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    fetchUsers(page, search); 
                }}
            />
        </Card>
    );
};

export default UserManagement;