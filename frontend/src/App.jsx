import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerManagement from './pages/CustomerManagement';

function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Trang chủ Hệ thống Quản lý Khách hàng</h1>
      <div style={{ marginTop: '30px' }}>
        <Link to="/customers" style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>
          👉 Quản lý Danh sách Khách hàng (/customers)
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/customers" element={<CustomerManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;