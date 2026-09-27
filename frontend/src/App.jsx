feature/S1-03-fe-reset-password-ui
import MainLayout from './MainLayout.jsx'
import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// Import các trang mới
import ForgotPassword from './ForgotPassword' 
import ResetPassword from './pages/ResetPassword'
import Page403 from './pages/Errors/Page403'
import Page404 from './pages/Errors/Page404'
<<<<<<< HEAD
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import Login from './pages/Login';
=======
>>>>>>> develop

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MainLayout from './MainLayout.jsx';
import { useState } from 'react';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Page403 from './pages/Errors/Page403';
import Page404 from './pages/Errors/Page404';
import heroImg from './assets/hero.png';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import './App.css';
import UserManagement from './pages/UserManagement';

function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>

        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>

        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link to="/forgot-password" style={{ color: '#646cff', fontWeight: 'bold' }}>
            👉 Đi tới trang Quên Mật Khẩu
          </Link>
          <Link to="/reset-password?token=XYZ123" style={{ color: '#10b981', fontWeight: 'bold' }}>
            👉 Đi tới trang Đặt Lại Mật Khẩu (Link có Token mẫu)
          </Link>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="next-steps"></section>
    </>
<<<<<<< HEAD
  )
=======
  );
}
 develop

>>>>>>> develop
function App() {
  return (
    <BrowserRouter>
      <Routes>
<<<<<<< HEAD
        <Route path="/403" element={<Page403 />} />
        <Route path="/404" element={<Page404 />} />

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route path="/403" element={<Page403 />} />
=======
 feature/S1-03-fe-reset-password-ui
        <Route path="/" element={<MainLayout />} />
        {/* Đã thêm 2 route mật khẩu vào đúng cấu trúc */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
<Route path="/" element={<UserManagement />} />
        <Route path="/crm-dashboard" element={<MainLayout />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
 develop
        <Route path="/403" element={<Page403 />} />
        <Route path="/404" element={<Page404 />} />
>>>>>>> develop
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  );
}

 feature/S1-03-fe-reset-password-ui
export default App

export default App;
 develop
