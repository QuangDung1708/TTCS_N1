import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mỗi ô có trạng thái ẩn/hiện riêng
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Lấy token từ URL
  // Ví dụ:
  // /reset-password?token=XYZ123
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Xóa thông báo cũ
    setError('');
    setSuccess('');

    // 1. Kiểm tra token
    if (!token) {
      setError('Mã xác thực (Token) không hợp lệ hoặc bị thiếu!');
      return;
    }

    // 2. Kiểm tra độ dài mật khẩu
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có độ dài tối thiểu 8 ký tự!');
      return;
    }

    // 3. Kiểm tra 2 mật khẩu có giống nhau không
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    // Nếu tất cả hợp lệ mới gọi API
    setLoading(true);

    try {
      const response = await axios.post('/api/reset-password', {
        token: token,
        newPassword: newPassword,
      });

      // Hiển thị thông báo thành công
      setSuccess(
        response.data?.message || 'Đổi mật khẩu thành công!'
      );

      // Chuyển về trang login sau 1.5 giây
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      // Lấy message lỗi từ Backend
      const message =
        err.response?.data?.message ||
        'Link đã hết hạn hoặc không hợp lệ!';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '50px',
      }}
    >
      <h2>Đặt lại mật khẩu mới</h2>

      {/* Thông báo lỗi */}
      {error && (
        <div
          style={{
            color: 'red',
            marginBottom: '15px',
            fontWeight: 'bold',
          }}
        >
          {error}
        </div>
      )}

      {/* Thông báo thành công */}
      {success && (
        <div
          style={{
            color: 'green',
            marginBottom: '15px',
            fontWeight: 'bold',
          }}
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'inline-block',
          textAlign: 'left',
        }}
      >
        {/* =========================
            Ô 1: Mật khẩu mới
        ========================== */}
        <div style={{ marginBottom: '15px' }}>
          <label>
            Mật khẩu mới (Tối thiểu 8 ký tự):
          </label>

          <br />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
              }}
              required
              placeholder="Nhập mật khẩu mới"
              style={{
                padding: '8px',
                width: '250px',
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowNewPassword(!showNewPassword)
              }
              style={{
                marginLeft: '5px',
                padding: '8px',
                width: '50px',
              }}
            >
              {showNewPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* =========================
            Ô 2: Nhập lại mật khẩu
        ========================== */}
        <div style={{ marginBottom: '15px' }}>
          <label>
            Nhập lại mật khẩu mới:
          </label>

          <br />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type={
                showConfirmPassword
                  ? 'text'
                  : 'password'
              }
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              required
              placeholder="Nhập lại mật khẩu mới"
              style={{
                padding: '8px',
                width: '250px',
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              style={{
                marginLeft: '5px',
                padding: '8px',
                width: '50px',
              }}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* =========================
            Nút xác nhận
        ========================== */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            width: '100%',
          }}
        >
          {loading
            ? 'Đang xử lý...'
            : 'Xác nhận đổi mật khẩu'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;