import React from 'react';
import { Dropdown, Avatar, Space, message, Layout } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();

  // Hàm xử lý sự kiện đăng xuất
  const handleLogout = async () => {
    const token = localStorage.getItem('crm_token');

    try {
      // Gọi API Logout kèm token ở Header
      await axios.post(
        '/api/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success('Đăng xuất thành công!');
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error);
    } finally {
      // Quan trọng: Bất kể API thành công hay lỗi, luôn xóa token và về trang /login
      localStorage.removeItem('crm_token');
      navigate('/login');
    }
  };

  // Các item trong menu Dropdown của Ant Design
  const items = [
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true, // Màu đỏ nổi bật cho nút đăng xuất
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px #f0f1f2',
      }}
    >
      <Dropdown menu={{ items }} placement="bottomRight" arrow={{ pointAtCenter: true }}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} />
          <span>Tài khoản</span>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
