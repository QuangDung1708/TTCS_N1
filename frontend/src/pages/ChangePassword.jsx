import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';

export default function ChangePassword() {
  const navigate = useNavigate();

  // State lưu 3 ô input
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State ẩn/hiện mắt mật khẩu
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State thông báo & loading
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate 1: Mật khẩu mới < 8 ký tự
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự!');
      return;
    }

    // Validate 2: Mật khẩu mới không khớp
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới nhập lại không khớp!');
      return;
    }

    setLoading(true);

    try {
      // Gọi API qua axiosClient (tự động đính kèm Token trong Interceptor)
      const response = await axiosClient.put('/users/change-password', {
        oldPassword: oldPassword,
        newPassword: newPassword,
      });

      setMessage('Đổi mật khẩu thành công. Hệ thống sẽ đăng xuất.');
      
      // Xóa token khỏi localStorage để đăng xuất an toàn
      localStorage.removeItem('crm_token');

      // Tự động chuyển hướng về /login sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      // axiosClient ném lỗi vào catch khi HTTP status >= 400
      setError(err.response?.data?.message || 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đổi Mật Khẩu</h2>
      <p style={styles.description}>Vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn.</p>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {message && <div style={styles.successAlert}>{message}</div>}

      <form onSubmit={handleSubmit}>
        {/* Ô 1: Mật khẩu hiện tại */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Mật khẩu hiện tại (oldPassword):</label>
          <div style={styles.inputWrapper}>
            <input
              type={showOldPassword ? 'text' : 'password'}
              required
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              style={styles.eyeBtn}
            >
              {showOldPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        {/* Ô 2: Mật khẩu mới */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Mật khẩu mới (newPassword):</label>
          <div style={styles.inputWrapper}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              required
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeBtn}
            >
              {showNewPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        {/* Ô 3: Nhập lại mật khẩu mới */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Nhập lại mật khẩu mới (confirmPassword):</label>
          <div style={styles.inputWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Xác nhận lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeBtn}
            >
              {showConfirmPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} style={styles.button(loading)}>
          {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
        </button>
      </form>

      <div style={styles.footer}>
        <Link to="/" style={styles.link}>Quay lại Trang chủ</Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '420px',
    margin: '40px auto',
    padding: '24px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    fontFamily: 'sans-serif',
    backgroundColor: '#ffffff',
    color: '#1e293b'
  },
  title: { fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' },
  description: { fontSize: '14px', color: '#64748b', marginBottom: '20px', textAlign: 'center' },
  errorAlert: {
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  successAlert: {
    padding: '10px 14px',
    backgroundColor: '#e6fffa',
    color: '#047857',
    border: '1px solid #b2f5ea',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  input: {
    width: '100%',
    padding: '10px 40px 10px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontSize: '14px',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  button: (loading) => ({
    width: '100%',
    padding: '10px',
    backgroundColor: loading ? '#94a3b8' : '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '10px',
  }),
  footer: { marginTop: '20px', textAlign: 'center' },
  link: { color: '#2563eb', fontSize: '14px', textDecoration: 'none' },
};