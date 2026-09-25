import { useState } from 'react'
import { Layout, Menu, Typography, Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import { useUser } from './context/UserContext.jsx'
import './MainLayout.css'
const { Header, Sider, Content } = Layout

function MainLayout() {
  const { userInfo } = useUser()
const [sidebarOpen, setSidebarOpen] = useState(false) 
const menuItems = [
  { key: 'dashboard', label: 'Trang chủ' },
  ...(userInfo?.role_name === 'Admin'
    ? [{ key: 'employees', label: 'Quản lý nhân viên' }]
    : []),

  ...(userInfo?.role_name === 'Admin' || userInfo?.role_name === 'Leader'
    ? [{ key: 'departments', label: 'Quản lý phòng ban' }]
    : []),
]
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
  className={`crm-sider ${sidebarOpen ? 'mobile-open' : ''}`}
  
>
        <div
          style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          CRM
        </div>

        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
        />
      </Sider>
{sidebarOpen && (
  <div
    className="sidebar-overlay"
    onClick={() => setSidebarOpen(false)}
  />
)}
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
          }}
        >
          <Button
  className="hamburger-button"
  type="text"
  icon={<MenuOutlined />}
  onClick={() => setSidebarOpen(true)}
/>
          <Typography.Text>
            {userInfo
              ? `${userInfo.email} - ${userInfo.role_name}`
              : 'Chưa đăng nhập'}
          </Typography.Text>
        </Header>

        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
          }}
        >
          <h1>CRM Dashboard</h1>

          {userInfo && (
            <div>
              <p>ID: {userInfo.id}</p>
              <p>Email: {userInfo.email}</p>
              <p>Role: {userInfo.role_name}</p>
              <p>Group ID: {userInfo.group_id}</p>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
