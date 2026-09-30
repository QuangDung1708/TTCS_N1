import React from 'react';

export default function ErrorPage({ code = 404, title, message, onBackToDashboard }) {
  const is403 = code === 403;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      textAlign: 'center',
      padding: '24px',
      color: '#f8fafc'
    }}>
      <div style={{
        fontSize: '72px',
        fontWeight: '900',
        color: is403 ? '#ef4444' : '#ff6b00',
        lineHeight: 1,
        marginBottom: '16px',
        letterSpacing: '2px'
      }}>
        {code}
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px', color: '#f8fafc' }}>
        {title || (is403 ? 'Truy Cập Bị Từ Chối (Forbidden)' : 'Trang Không Tồn Tại (Not Found)')}
      </h2>

      <p style={{
        color: '#94a3b8',
        fontSize: '14px',
        maxWidth: '460px',
        lineHeight: '1.6',
        marginBottom: '24px'
      }}>
        {message || (is403 
          ? 'Tài khoản của bạn không có đủ đặc quyền truy cập vào khu vực này. Vui lòng liên hệ Quản trị viên hệ thống nếu bạn cần phân quyền thêm.'
          : 'Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển sang địa chỉ khác.')}
      </p>

      <button
        onClick={onBackToDashboard}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#ff6b00',
          color: '#ffffff',
          border: 'none',
          padding: '10px 22px',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)'
        }}
      >
        ← Quay Lại Bảng Điều Khiển (Dashboard)
      </button>
    </div>
  );
}