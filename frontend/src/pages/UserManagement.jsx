import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Tag, Card, Typography } from 'antd';
import { SearchOutlined, UserAddOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setUsers([
        { id: 1, stt: 1, name: 'Nguyễn Văn A', email: 'a.nguyen@company.com', role: 'Admin', group: 'Ban Giám Đốc', status: 'Active' },
        { id: 2, stt: 2, name: 'Trần Thị B', email: 'b.tran@company.com', role: 'Trưởng nhóm', group: 'Phòng Kinh Doanh 1', status: 'Active' },
        { id: 3, stt: 3, name: 'Lê Văn C', email: 'c.le@company.com', role: 'Nhân viên', group: 'Phòng Kinh Doanh 1', status: 'Inactive' },
        { id: 4, stt: 4, name: 'Phạm Thị D', email: 'd.pham@company.com', role: 'Nhân viên', group: 'Phòng Kỹ Thuật', status: 'Active' },
      ]);
      setLoading(false);
    }, 500);
  }, [search, page]);

  const columns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', align: 'center', width: 60 },
    { title: 'Họ và tên', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 220 },
    { 
      title: 'Vai trò', 
      dataIndex: 'role', 
      key: 'role',
      width: 150,
      render: (role) => (
        <Tag style={{ color: '#0050b3', background: '#e6f7ff', borderColor: '#91d5ff', fontWeight: 500 }}>
          {role}
        </Tag>
      )
    },
    { title: 'Nhóm', dataIndex: 'group', key: 'group', width: 200 },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      width: 150,
      align: 'center',
      render: (status) => (
        <Tag 
          style={{ 
            color: status === 'Active' ? '#003eb3' : '#595959', 
            background: status === 'Active' ? '#bae7ff' : '#f5f5f5', 
            borderColor: status === 'Active' ? '#1890ff' : '#d9d9d9',
            fontWeight: 600 
          }}
        >
          {status === 'Active' ? 'Đang hoạt động' : 'Đã khóa'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} style={{ color: '#1890ff', fontWeight: 500 }}>Sửa</Button>
          <Button type="link" danger icon={<LockOutlined />}>Khóa</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#e8f4ff', minHeight: '100vh' }}>
      {/* Thêm viền xanh dương nhạt cho Card tổng */}
      <Card style={{ borderRadius: '10px', boxShadow: '0 4px 12px rgba(24, 144, 255, 0.1)', border: '1px solid #bae7ff' }}>
        
        {/* Phần tiêu đề với điểm nhấn nền xanh dương nhẹ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#f0f5ff', padding: '16px 20px', borderRadius: '8px' }}>
          <Title level={3} style={{ margin: 0, color: '#003eb3' }}>Quản lý danh sách nhân sự</Title>
          <Button type="primary" icon={<UserAddOutlined />} style={{ background: '#1890ff', borderColor: '#1890ff', height: '40px', fontWeight: 500 }}>
            Thêm nhân viên
          </Button>
        </div>

        {/* Thanh tìm kiếm và bộ lọc bo góc với hiệu ứng xanh */}
        <Space style={{ marginBottom: '20px', width: '100%', justifyContent: 'space-between' }} wrap>
          <Input
            placeholder="Tìm kiếm theo tên hoặc email..."
            prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
            style={{ width: 320, borderRadius: '6px', borderColor: '#91d5ff' }}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Select defaultValue="all" style={{ width: 180 }} className="custom-select">
            <Option value="all">Tất cả vai trò</Option>
            <Option value="admin">Admin</Option>
            <Option value="staff">Staff</Option>
          </Select>
        </Space>

        {/* Bảng dữ liệu với tiêu đề bảng phủ màu xanh dương nhạt chuyên nghiệp */}
        <Table 
          columns={columns} 
          dataSource={users} 
          rowKey="id"
          loading={loading}
          pagination={{ current: page, pageSize: 10, total: 4, onChange: (p) => setPage(p), showSizeChanger: false }}
          bordered
          size="middle"
          components={{
            header: {
              cell: (props) => <th {...props} style={{ ...props.style, background: '#e6f7ff', fontWeight: 600, color: '#003eb3', borderBottom: '2px solid #91d5ff' }} />,
            },
          }}
        />
      </Card>
    </div>
  );
};

export default UserManagement;