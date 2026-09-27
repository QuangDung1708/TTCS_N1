import MainLayout from './MainLayout.jsx'
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ForgotPassword from './ForgotPassword'
import Page403 from './pages/Errors/Page403'
import Page404 from './pages/Errors/Page404'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đổi trực tiếp path="/" sang UserManagement để khi chạy app là hiện ngay bảng quản lý nhân sự */}
        <Route path="/" element={<UserManagement />} />
        
        {/* Giữ lại các đường dẫn khác phòng khi cần */}
        <Route path="/crm-dashboard" element={<MainLayout />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/403" element={<Page403 />} />
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App