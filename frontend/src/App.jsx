
import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import { login, changePassword, forgotPassword } from './api/api';
import ErrorPage from './ErrorPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form Đăng Nhập
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Modal Quên Mật Khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });

  // Modal Đổi Mật Khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  // Tự động nạp user từ localStorage nếu đã có token
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Lỗi đọc user:', e);
      }
    }
  }, [token]);

  // Xử lý Đăng Nhập
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await login(loginData.email, loginData.password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setActiveTab('dashboard');
    } catch (err) {
      setLoginError(err.message || 'Đăng nhập không thành công!');
    } finally {
      setLoginLoading(false);
    }
  };

  // Điền nhanh thông tin tài khoản test
  const handleQuickLogin = (email) => {
    setLoginData({ email, password: '123456aA@' });
  };

  // Xử lý Đăng Xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setMobileMenuOpen(false);
  };

  // Xử lý Quên mật khẩu
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotMessage({ type: 'success', text: res.message || 'Link đặt lại mật khẩu đã được gửi đến email!' });
    } catch (err) {
      setForgotMessage({ type: 'error', text: err.message || 'Lỗi gửi yêu cầu!' });
    }
  };

  // Xử lý Đổi mật khẩu
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      setPassMessage({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp!' });
      return;
    }
    try {
      const res = await changePassword({
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      setPassMessage({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
      setTimeout(() => handleLogout(), 1800);
    } catch (err) {
      setPassMessage({ type: 'error', text: err.message || 'Lỗi khi đổi mật khẩu!' });
    }
  };

  // ==============================================================
  // 1. MÀN HÌNH ĐĂNG NHẬP (Hiển thị khi chưa có Token)
  // ==============================================================
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '32px 28px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid #334155'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b00', margin: '0 0 8px 0' }}>
              HỆ THỐNG CRM
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              Đăng nhập tài khoản để vào hệ thống
            </p>
          </div>

          {loginError && (
            <div style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid #991b1b'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#e2e8f0', marginBottom: '6px' }}>Email đăng nhập</label>
              <input
                required
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="admin@gmail.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', color: '#e2e8f0' }}>Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotMessage({ type: '', text: '' }); }}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <input
                required
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ff6b00',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: loginLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {loginLoading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>
          </form>

          {/* Gợi ý đăng nhập nhanh để kiểm thử phân quyền */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0', textAlign: 'center' }}>
              Tài khoản test nhanh (Pass: <code>123456aA@</code>):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@gmail.com')}
                style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Giám Đốc (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('leader_a@gmail.com')}
                style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Trưởng Nhóm A
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales_a1@gmail.com')}
                style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Sales A1 (Nhóm A)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales_b1@gmail.com')}
                style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Sales B1 (Nhóm B)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Quên Mật Khẩu */}
        {showForgotModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '380px', color: '#fff' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#ff6b00' }}>Khôi Phục Mật Khẩu</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>Nhập email để nhận liên kết đặt lại mật khẩu</p>

              {forgotMessage.text && (
                <div style={{
                  padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px',
                  backgroundColor: forgotMessage.type === 'error' ? '#7f1d1d' : '#14532d',
                  color: forgotMessage.type === 'error' ? '#fecaca' : '#bbf7d0'
                }}>
                  {forgotMessage.text}
                </div>
              )}

              <form onSubmit={handleForgotSubmit}>
                <input
                  required
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box', marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setShowForgotModal(false)} style={{ padding: '8px 14px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer' }}>Hủy</button>
                  <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#ff6b00', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Gửi Link</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // 2. MÀN HÌNH DASHBOARD SAU KHI ĐĂNG NHẬP
  // ==============================================================
  const isAdmin = user && (user.role_id === 1 || user.data_scope === 'ALL');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER / NAVIGATION BAR */}
      <header style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '12px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Logo & Navigation (Desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b00', margin: 0, letterSpacing: '0.5px' }}>
              CRM SYSTEM
            </h2>

            <nav className="desktop-only" style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'dashboard' ? '#ff6b00' : 'transparent',
                  color: activeTab === 'dashboard' ? '#fff' : '#94a3b8'
                }}
              >
                📊 Tổng Quan
              </button>

              {/* Tiêu chí AC: Menu ẩn/hiện đúng theo quyền */}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'users' ? '#ff6b00' : 'transparent',
                    color: activeTab === 'users' ? '#fff' : '#94a3b8'
                  }}
                >
                  👥 Quản Lý Người Dùng
                </button>
              )}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Tiêu chí AC: Hiển thị Họ tên, Vai trò, Nhóm kinh doanh */}
            <div style={{ textAlign: 'right', fontSize: '13px', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>
                {user?.full_name || 'Người dùng'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                <span style={{ color: '#38bdf8', fontWeight: '600' }}>
                  {user?.role_name || (isAdmin ? 'Giám Đốc' : 'Nhân Viên')}
                </span>
                {' • '}
                <span>{user?.group_name || 'Ban Điều Hành'}</span>
              </div>
            </div>

            {/* Nút thao tác trên Desktop */}
            <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setPassMessage({ type: '', text: '' });
                  setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowPasswordModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ⚙ Đổi mật khẩu
              </button>

              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Đăng Xuất
              </button>
            </div>

            {/* Nút Hamburger cho Mobile (< 768px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-toggle-btn"
              style={{
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#fff',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* Dropdown Menu Mobile */}
        {mobileMenuOpen && (
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? '#ff6b00' : '#0f172a',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📊 Tổng Quan
            </button>

            {isAdmin && (
              <button
                onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeTab === 'users' ? '#ff6b00' : '#0f172a',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                👥 Quản Lý Người Dùng
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => { setShowPasswordModal(true); setMobileMenuOpen(false); }}
                style={{ flex: 1, padding: '8px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                ⚙ Đổi mật khẩu
              </button>
              <button
                onClick={handleLogout}
                style={{ flex: 1, padding: '8px', backgroundColor: '#dc2626', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        )}
      </header>

      {/* NỘI DUNG CHÍNH */}
      {/* NỘI DUNG CHÍNH */}
      {/* NỘI DUNG CHÍNH (Xử lý AC của S1-09: Không để màn hình trắng) */}
      <main style={{ flex: 1, padding: '16px' }}>
        {activeTab === 'dashboard' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#f8fafc' }}>
              Dashboard Tổng Quan
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', lineHeight: '1.6' }}>
              Xin chào <strong>{user?.full_name}</strong> ({user?.role_name || (isAdmin ? 'Giám Đốc' : 'Nhân Viên')}) thuộc <strong>{user?.group_name || 'Ban Điều Hành'}</strong>.
            </p>
          </div>
        )}

        {/* Khi người dùng vào tab Quản trị người dùng */}
        {activeTab === 'users' && (
          isAdmin ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
              <UserManagement />
            </div>
          ) : (
            /* Hiển thị lỗi 403 nếu Sales cố ý truy cập tab Quản trị */
            <ErrorPage
              code={403}
              title="Không Đủ Quyền Truy Cập"
              message="Chức năng Quản lý người dùng chỉ dành riêng cho Quản trị viên (Admin) và Ban Giám Đốc."
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )
        )}

        {/* Bắt tất cả các tab lạ/không tồn tại (Lỗi 404) */}
        {activeTab !== 'dashboard' && activeTab !== 'users' && (
          <ErrorPage
            code={404}
            title="Đường Dẫn Không Hợp Lệ"
            message="Chức năng bạn đang tìm kiếm không tồn tại trên hệ thống hoặc đang trong quá trình phát triển."
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Modal Đổi mật khẩu */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: '400px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ff6b00' }}>Đổi Mật Khẩu Cá Nhân</h3>

            {passMessage.text && (
              <div style={{
                padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px',
                backgroundColor: passMessage.type === 'error' ? '#7f1d1d' : '#14532d',
                color: passMessage.type === 'error' ? '#fecaca' : '#bbf7d0'
              }}>
                {passMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mật khẩu hiện tại</label>
                <input
                  required
                  type="password"
                  value={passData.currentPassword}
                  onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                <input
                  required
                  type="password"
                  value={passData.newPassword}
                  onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Xác nhận mật khẩu mới</label>
                <input
                  required
                  type="password"
                  value={passData.confirmPassword}
                  onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '8px 14px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#ff6b00', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS RESPONSIVE CHO DESKTOP VÀ MOBILE 360PX */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-only {
            display: flex !important;
          }
          .mobile-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}