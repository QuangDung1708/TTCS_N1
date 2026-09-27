import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios'; // Mặc định dùng axios, hoặc thay bằng fetch/instance của dự án

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Gọi API POST /api/forgot-password
      await axios.post('/api/forgot-password', { email });
    } catch (error) {
      // Dù API thành công hay thất bại, không báo lỗi chi tiết để bảo mật
      console.error(error);
    } finally {
      setLoading(false);
      // Hiện thông báo cố định như yêu cầu
      setMessage('Vui lòng kiểm tra hộp thư email của bạn');
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Quên mật khẩu</h2>
      <p>Vui lòng nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu</p>

      {message && <div className="alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Nhập địa chỉ email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>

      <div className="back-to-login">
        <Link to="/login">Quay lại Đăng nhập</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;