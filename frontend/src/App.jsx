import MainLayout from './MainLayout.jsx'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// Import các trang mới
import ForgotPassword from './ForgotPassword' 
import ResetPassword from './pages/ResetPassword'
import Page403 from './pages/Errors/Page403'
import Page404 from './pages/Errors/Page404'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        {/* Đã thêm 2 route mật khẩu vào đúng cấu trúc */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/403" element={<Page403 />} />
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App