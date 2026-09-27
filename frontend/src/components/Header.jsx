import React from 'react';
import { Dropdown, Avatar, Space, message, Layout } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();

  // Hàm xử lý sự kiện đăng xuất
  const handleLogout = async () => {
    try {
      // Gọi API Logout thông qua axiosClient (tự động đính kèm token)
      await axiosClient.post('/logout');
      message.success('Đăng xuất thành công!');
    } catch (error) {
      console.error('Lỗi khi gọi API logout:', error);
    } finally {
      // Bất kể API thành công hay lỗi, luôn xóa token và chuyển hướng về /login
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
      danger: true,
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