import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Trạng thái ẩn/hiện cho từng ô
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Xóa thông báo cũ
    setError('');
    setSuccess('');

    // Kiểm tra mật khẩu mới tối thiểu 8 ký tự
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự!');
      return;
    }

    // Kiểm tra mật khẩu mới và nhập lại
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và nhập lại mật khẩu không khớp!');
      return;
    }

    // Lấy token đăng nhập hiện tại
    const token = localStorage.getItem('crm_token');

    if (!token) {
      setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!');
      return;
    }

    setLoading(true);

    try {
      // Gọi API đổi mật khẩu và gửi token trong header
      await axios.put(
        '/api/users/change-password',
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Thông báo thành công
      setSuccess(
        'Đổi mật khẩu thành công. Hệ thống sẽ đăng xuất.'
      );

      // Xóa token đăng nhập hiện tại
      localStorage.removeItem('crm_token');

      // Chuyển về trang đăng nhập sau 1.5 giây
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      // Lấy message từ Backend
      const message =
        err.response?.data?.message ||
        'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại!';

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
      <h2>Đổi mật khẩu</h2>

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
        {/* Mật khẩu hiện tại */}
        <div style={{ marginBottom: '15px' }}>
          <label>Mật khẩu hiện tại:</label>
          <br />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type={showOldPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                setError('');
              }}
              placeholder="Nhập mật khẩu hiện tại"
              required
              style={{
                padding: '8px',
                width: '250px',
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowOldPassword(!showOldPassword)
              }
              style={{
                marginLeft: '5px',
                padding: '8px',
                width: '50px',
              }}
            >
              {showOldPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Mật khẩu mới */}
        <div style={{ marginBottom: '15px' }}>
          <label>Mật khẩu mới:</label>
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
              placeholder="Nhập mật khẩu mới"
              required
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

        {/* Nhập lại mật khẩu mới */}
        <div style={{ marginBottom: '15px' }}>
          <label>Nhập lại mật khẩu mới:</label>
          <br />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Nhập lại mật khẩu mới"
              required
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

        {/* Nút xác nhận */}
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

export default ChangePassword;