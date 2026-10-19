import React, { useState } from 'react';
import { Table, Input, Select, Button, Space, Card, Tag, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const AccountManagement = () => {
  // 1. Dữ liệu bộ lọc (Filter State)
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 2. Dữ liệu giả lập (Mock Data)
  const mockUsers = [
    { key: '1', id: 'NV001', name: 'Nguyễn Văn A', email: 'nva@company.com', role: 'Quản trị viên', status: 'Hoạt động' },
    { key: '2', id: 'NV002', name: 'Trần Thị B', email: 'ttb@company.com', role: 'Nhân viên kinh doanh', status: 'Hoạt động' },
    { key: '3', id: 'NV003', name: 'Lê Văn C', email: 'lvc@company.com', role: 'Trưởng phòng', status: 'Tạm khóa' },
  ];

  // 3. Cấu hình các cột trong Bảng (Table Columns)
  const columns = [
    { title: 'Mã NV', dataIndex: 'id', key: 'id' },
    { title: 'Họ và tên', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Vai trò', dataIndex: 'role', key: 'role' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Hoạt động' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">Sửa</Button>
          <Button type="link" danger>Khóa</Button>
        </Space>
      ),
    },
  ];

  // Xử lý làm mới bộ lọc
  const handleReset = () => {
    setSearchText('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Quản lý tài khoản</Title>

      {/* KHU VỰC BỘ LỌC (FILTER PANEL) */}
      <Card style={{ marginBottom: '16px' }}>
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo tên hoặc email..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
          />

          <Select
            value={roleFilter}
            onChange={(value) => setRoleFilter(value)}
            style={{ width: 180 }}
          >
            <Option value="ALL">Tất cả vai trò</Option>
            <Option value="ADMIN">Quản trị viên</Option>
            <Option value="SALE">Nhân viên kinh doanh</Option>
            <Option value="MANAGER">Trưởng phòng</Option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            style={{ width: 160 }}
          >
            <Option value="ALL">Tất cả trạng thái</Option>
            <Option value="ACTIVE">Hoạt động</Option>
            <Option value="LOCKED">Tạm khóa</Option>
          </Select>

          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Đặt lại
          </Button>

          <Button type="primary" icon={<UserAddOutlined />}>
            Thêm tài khoản
          </Button>
        </Space>
      </Card>

      {/* DANH SÁCH BẢNG TÀI KHOẢN */}
      <Table
        columns={columns}
        dataSource={mockUsers}
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
};

export default AccountManagement;