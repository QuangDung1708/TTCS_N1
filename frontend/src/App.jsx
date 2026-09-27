import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login'; // Import file Login bạn vừa tạo

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <Routes>
          {/* Mặc định chuyển hướng sang trang /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Route cho màn hình Đăng nhập */}
          <Route path="/login" element={<Login />} />

          {/* Route mẫu sau khi đăng nhập thành công */}
          <Route path="/dashboard" element={<div style={{ padding: 20 }}><h2>Trang Dashboard (Đã đăng nhập)</h2></div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;