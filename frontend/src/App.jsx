import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import { changePassword } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users'

  // Modal đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  // Đọc thông tin user từ localStorage khi tải trang
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Lỗi phân giải thông tin user:', e);
      }
    }
  }, [token]);

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    window.location.reload();
  };

  // Xử lý đổi mật khẩu
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
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (err) {
      setPassMessage({ type: 'error', text: err.message || 'Lỗi khi đổi mật khẩu!' });
    }
  };

  // Nếu chưa đăng nhập hoặc không có token
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff' }}>
        <p>Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.</p>
      </div>
    );
  }

  // Kiểm tra quyền Quản trị viên (Admin / Giám đốc có role_id = 1 hoặc data_scope = 'ALL')
  const isAdmin = user && (user.role_id === 1 || user.data_scope === 'ALL');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#131722', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header & Thanh điều hướng chính */}
      <header style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '64px'
      }}>
        {/* Logo & Menu Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b00', margin: 0, letterSpacing: '0.5px' }}>
            HỆ THỐNG CRM
          </h2>

          <nav style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'dashboard' ? '#ff6b00' : 'transparent',
                color: activeTab === 'dashboard' ? '#fff' : '#94a3b8',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Tổng Quan
            </button>

            {/* Nút chỉ hiển thị cho Quản trị viên */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'users' ? '#ff6b00' : 'transparent',
                  color: activeTab === 'users' ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                👥 Quản Lý Người Dùng
              </button>
            )}
          </nav>
        </div>

        {/* Thông tin người dùng & Nút thao tác nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
          <div style={{ fontSize: '14px', textAlign: 'right' }}>
            <span style={{ color: '#94a3b8' }}>Xin chào, </span>
            <strong style={{ color: '#fff' }}>{user?.full_name || 'Người dùng'}</strong>
            <span style={{
              display: 'inline-block',
              marginLeft: '8px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isAdmin ? '#7c2d12' : '#1e3a8a',
              color: isAdmin ? '#fdba74' : '#93c5fd'
            }}>
              {isAdmin ? 'Quản trị viên' : 'Nhân sự'}
            </span>
          </div>

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
              fontSize: '13px',
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
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* 2. Nội dung chính hiển thị theo Tab đã chọn */}
      <main style={{ flex: 1, padding: '24px' }}>
        {activeTab === 'dashboard' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', color: '#f8fafc' }}>
              Chào mừng bạn đến với Dashboard CRM!
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '500px', lineHeight: '1.6' }}>
              Bạn đang đăng nhập với quyền: <strong>{isAdmin ? 'Quản trị viên (Admin)' : 'Nhân viên kinh doanh'}</strong>.
              {isAdmin && ' Nhấn vào tab "Quản Lý Người Dùng" trên thanh Menu phía trên để tạo tài khoản và phân quyền cho nhân sự.'}
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', minHeight: '80vh', color: '#0f172a' }}>
            <UserManagement />
          </div>
        )}
      </main>

      {/* Modal Đổi mật khẩu */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '10px', padding: '24px', width: '100%', maxWidth: '420px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#ff6b00' }}>Đổi Mật Khẩu Cá Nhân</h3>

            {passMessage.text && (
              <div style={{
                padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px',
                backgroundColor: passMessage.type === 'error' ? '#7f1d1d' : '#14532d',
                color: passMessage.type === 'error' ? '#fecaca' : '#bbf7d0'
              }}>
                {passMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Mật khẩu hiện tại</label>
                <input
                  required
                  type="password"
                  value={passData.currentPassword}
                  onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Mật khẩu mới (Tối thiểu 8 ký tự gồm chữ và số)</label>
                <input
                  required
                  type="password"
                  value={passData.newPassword}
                  onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Xác nhận mật khẩu mới</label>
                <input
                  required
                  type="password"
                  value={passData.confirmPassword}
                  onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', backgroundColor: '#ff6b00', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}