import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ExcelImportPage from './ExcelImportPage';

function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Hệ Thống CRM - Trang Chủ</h1>
      <Link to="/import-excel" style={{ color: '#1677ff', fontWeight: 'bold', fontSize: '18px' }}>
        👉 Bấm vào đây để tới trang: [FE] Nhập Excel & Báo cáo kết quả
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/import-excel" element={<ExcelImportPage />} />
      </Routes>
    </BrowserRouter>
  );
}