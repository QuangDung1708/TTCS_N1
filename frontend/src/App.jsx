import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Page403 from './pages/Errors/Page403';
import Page404 from './pages/Errors/Page404';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement'; // Thêm import trang quản lý nhân sự

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/403" element={<Page403 />} />
        <Route path="/404" element={<Page404 />} />

        {/* Đổi trang chủ (path="/") thành giao diện Quản lý danh sách nhân sự */}
        <Route path="/" element={<UserManagement />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Các đường dẫn không tồn tại sẽ chuyển về trang 404 hoặc UserManagement tùy bạn */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;