import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerManagement from './pages/CustomerManagement';
import ProductPriceManagement from './pages/ProductPriceManagement';
import ExcelImportContainer from './ExcelImportContainer'; // Tích hợp Task N1-225

function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Trang chủ Hệ thống Quản lý Khách hàng (CRM)</h1>
      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <Link to="/customers" style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>
          👉 Quản lý Danh sách Khách hàng (/customers)
        </Link>
        <Link to="/products" style={{ color: '#1677ff', fontWeight: 'bold', fontSize: '18px' }}>
          👉 [TASK 1 & 2] Quản trị Danh mục Sản phẩm & Bảng giá (/products)
        </Link>
        {/* Đường dẫn tới tính năng Import Excel mới */}
        <Link to="/import-excel" style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '18px' }}>
          👉 [N1-225] Quản lý Import Excel & Tải file lỗi (/import-excel)
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
        <Route path="/products" element={<ProductPriceManagement />} />
        {/* Route cho Task N1-225 */}
        <Route path="/import-excel" element={<ExcelImportContainer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;