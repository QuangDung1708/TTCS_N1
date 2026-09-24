import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Card, Typography, Space, Tag, message } from 'antd';
import { SearchOutlined, UserAddOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Kỹ thuật Debounce 500ms cho ô tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Gọi API lấy danh sách nhân viên
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        setTimeout(() => {
          const mockData = [
            { key: '1', stt: 1, name: 'Nguyễn Văn A', email: 'a.nguyen@company.com', role: 'Admin', team: 'Ban Giám Đốc', status: 'Active' },
            { key: '2', stt: 2, name: 'Trần Thị B', email: 'b.tran@company.com', role: 'Trưởng nhóm', team: 'Phòng Kinh Doanh 1', status: 'Active' },
            { key: '3', stt: 3, name: 'Lê Văn C', email: 'c.le@company.com', role: 'Nhân viên', team: 'Phòng Kinh Doanh 1', status: 'Inactive' },
            { key: '4', stt: 4, name: 'Phạm Thị D', email: 'd.pham@company.com', role: 'Nhân viên', team: 'Phòng Kỹ Thuật', status: 'Active' },
          ];

          const filtered = mockData.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                                item.email.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchRole = roleFilter ? item.role === roleFilter : true;
            return matchSearch && matchRole;
          });

          setUsers(filtered);
          setLoading(false);
        }, 300);
      } catch (error) {
        message.error('Lỗi tải dữ liệu nhân viên');
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch, roleFilter, page]);

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 70 },
    { title: 'Họ và tên', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Vai trò', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => (
        <Tag color={role === 'Admin' ? 'red' : role === 'Trưởng nhóm' ? 'green' : 'blue'}>
          {role}
        </Tag>
      )
    },
    { title: 'Nhóm', dataIndex: 'team', key: 'team' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Active' ? 'success' : 'default'}>
          {status === 'Active' ? 'Đang hoạt động' : 'Đã khóa'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => message.info(`Sửa nhân viên: ${record.name}`)}>Sửa</Button>
          <Button type="link" danger icon={<LockOutlined />} onClick={() => message.warning(`Khóa tài khoản: ${record.name}`)}>Khóa</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false} style={{ margin: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Quản lý danh sách nhân sự</Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => message.success('Mở modal thêm nhân viên')}>
          + Thêm nhân viên
        </Button>
      </div>

      <Space style={{ marginBottom: 20 }} wrap>
        <Input
          placeholder="Tìm kiếm theo tên hoặc email..."
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder="Lọc theo vai trò"
          style={{ width: 180 }}
          allowClear
          onChange={(value) => setRoleFilter(value || '')}
        >
          <Option value="Admin">Admin</Option>
          <Option value="Trưởng nhóm">Trưởng nhóm</Option>
          <Option value="Nhân viên">Nhân viên</Option>
        </Select>
      </Space>

      <Table
        dataSource={users}
        columns={columns}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 5,
          total: users.length,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );
};

export default UserManagement;