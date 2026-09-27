import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lấy Token từ URL (Ví dụ: http://localhost:5173/reset-password?token=XYZ123)
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate 1: Mật khẩu tối thiểu 8 ký tự
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự!');
      return;
    }

    // Validate 2: Nhập lại mật khẩu không khớp
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    // Validate 3: Thiếu token trên URL
    if (!token) {
      setError('Đường dẫn thiếu mã Token xác minh! Vui lòng kiểm tra lại link email.');
      return;
    }

    setLoading(true);

    try {
      // Gọi API POST /api/reset-password
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng về Đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Link khôi phục đã hết hạn hoặc không hợp lệ.');
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi kết nối, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Đặt lại mật khẩu</h2>
      <p style={styles.description}>Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {message && <div style={styles.successAlert}>{message}</div>}

      <form onSubmit={handleSubmit}>
        {/* Ô 1: Mật khẩu mới */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Mật khẩu mới:</label>
          <div style={styles.inputWrapper}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              required
              placeholder="Nhập tối thiểu 8 ký tự"
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

        {/* Ô 2: Nhập lại mật khẩu */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Nhập lại mật khẩu mới:</label>
          <div style={styles.inputWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Xác nhận lại mật khẩu"
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
        <Link to="/login" style={styles.link}>Quay lại Đăng nhập</Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '60px auto',
    padding: '24px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    fontFamily: 'sans-serif',
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