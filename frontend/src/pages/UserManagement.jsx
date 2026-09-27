import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Typography, message } from 'antd';
import { UserAddOutlined, EditOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import LockUserModal from './LockUserModal';
import UserFormModal from './UserFormModal';
import axiosClient from '../utils/axiosClient'; 

const { Title } = Typography;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [selectedUserToLock, setSelectedUserToLock] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let serverList = [];
      try {
        const response = await axiosClient.get('/api/users');
        const res = response?.data;
        if (Array.isArray(res)) serverList = res;
        else if (res?.data && Array.isArray(res.data)) serverList = res.data;
        else if (res?.users && Array.isArray(res.users)) serverList = res.users;
      } catch (err) {
        console.log('Dùng dữ liệu cục bộ.');
      }

      const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
      const rawList = serverList.length > 0 ? serverList : localData;

      const formattedData = rawList.map((user, index) => ({
        ...user,
        id: user.id || user._id || index + 1,
        stt: index + 1,
        displayName: user.name || user.fullName || user.username || user.hoTen || 'Chưa cập nhật',
        displayEmail: user.email || user.mail || 'Chưa cập nhật',
        displayRole: user.role || user.chucVu || 'Nhân viên',
        displayGroup: user.group || user.department || 'Chưa phân nhóm',
        status: user.status || 'Active',
      }));

      setUsers(formattedData);
    } catch (error) {
      console.error('Lỗi tải danh sách:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = (values) => {
    const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
    
    if (editingUser) {
      const updated = localData.map(u => {
        if ((u.id || u._id) === (editingUser.id || editingUser._id)) {
          return { ...u, ...values };
        }
        return u;
      });
      localStorage.setItem('app_users_list', JSON.stringify(updated));
      message.success('Cập nhật thông tin nhân viên thành công!');
    } else {
      const userToSave = {
        id: Date.now(),
        status: 'Active',
        ...values
      };
      const updated = [userToSave, ...localData];
      localStorage.setItem('app_users_list', JSON.stringify(updated));
      message.success('Thêm nhân viên mới thành công!');
    }

    setIsAddModalOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleUnlockUser = (record) => {
    const userId = record.id || record._id;
    const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
    const updated = localData.map(u => {
      if ((u.id || u._id) === userId) {
        return { ...u, status: 'Active' };
      }
      return u;
    });
    localStorage.setItem('app_users_list', JSON.stringify(updated));
    message.success(`Đã mở khóa tài khoản cho ${record.displayName} thành công!`);
    fetchUsers();
  };

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', align: 'center', width: 60 },
    { title: 'Họ và tên', dataIndex: 'displayName', key: 'name', width: 160 },
    { title: 'Email', dataIndex: 'displayEmail', key: 'email', width: 200 },
    { 
      title: 'Vai trò', 
      dataIndex: 'displayRole', 
      key: 'role',
      width: 130,
      render: (role) => <Tag color="blue">{role}</Tag>
    },
    { title: 'Nhóm', dataIndex: 'displayGroup', key: 'group', width: 160 },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      width: 130,
      align: 'center',
      render: (status) => {
        const isActive = status === 'Active' || status === 'active' || status === true || status === 1;
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Đang hoạt động' : 'Đã khóa'}
          </Tag>
        );
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 180,
      render: (_, record) => {
        const isActive = record.status === 'Active' || record.status === 'active' || record.status === true || record.status === 1;
        return (
          <Space size="small">
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => {
                setEditingUser(record);
                setIsAddModalOpen(true);
              }}
            >
              Sửa
            </Button>
            {isActive ? (
              <Button 
                type="link" 
                danger 
                icon={<LockOutlined />}
                onClick={() => {
                  setSelectedUserToLock(record);
                  setIsLockModalOpen(true);
                }}
              >
                Khóa
              </Button>
            ) : (
              <Button 
                type="link" 
                style={{ color: '#52c41a' }} 
                icon={<UnlockOutlined />}
                onClick={() => handleUnlockUser(record)}
              >
                Mở khóa
              </Button>
            )}
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
          <Button 
            type="primary" 
            icon={<UserAddOutlined />} 
            onClick={() => {
              setEditingUser(null);
              setIsAddModalOpen(true);
            }}
            style={{ background: '#1890ff', height: '40px' }}
          >
            Thêm nhân viên
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={users} 
          rowKey={(record) => record.id || record._id || record.email}
          loading={loading}
          bordered
          size="middle"
        />
      </Card>

      <LockUserModal
        visible={isLockModalOpen}
        userToLock={selectedUserToLock}
        onClose={() => setIsLockModalOpen(false)}
        onSuccess={() => fetchUsers()}
      />

      <UserFormModal
        visible={isAddModalOpen}
        initialValues={editingUser}
        isEditing={!!editingUser}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={handleSaveUser}
      />
    </div>
  );
};

export default UserManagement;