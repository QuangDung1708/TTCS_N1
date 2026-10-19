import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ExcelImportContainer from './ExcelImportContainer';

function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Hệ Thống CRM - Trang Chủ Navigation</h1>
      <div style={{ marginTop: 16 }}>
        <Link to="/import-excel" style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '18px' }}>
          👉 [N1-225] Quản lý Import Excel & Tải file lỗi (/import-excel)
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/import-excel" element={<ExcelImportContainer />} />
      </Routes>
    </BrowserRouter>
  );
}