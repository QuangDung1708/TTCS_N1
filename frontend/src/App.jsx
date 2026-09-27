import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Page404 from './pages/Page404';
import Page403 from './pages/Page403';

function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>Màn hình Kiểm thử - Task S1-07 (Trang Lỗi)</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
        <Link to="/403" style={{ color: '#d97706', fontWeight: 'bold', fontSize: '18px' }}>
          👉 Test trang lỗi 403 (/403)
        </Link>
        <Link to="/duong-dan-khong-ton-tai" style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '18px' }}>
          👉 Test trang lỗi 404 (Gõ bậy đường dẫn)
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
        <Route path="/403" element={<Page403 />} />
        <Route path="/404" element={<Page404 />} />
        {/* Đường dẫn '*' sẽ tự động bắt tất cả URL không tồn tại về trang 404 */}
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  );
}