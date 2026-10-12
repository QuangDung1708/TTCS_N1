import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Modal, Alert, Steps, Tag } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, MailOutlined, KeyOutlined, ArrowRightOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

// DANH SÁCH 7 TÀI KHOẢN THEO ĐÚNG ĐẶC TẢ MA TRẬN
const TEST_ACCOUNTS = [
  { label: 'Admin', role: 'Admin', email: 'admin@crm.vn', password: '123456', color: 'red' },
  { label: 'Director', role: 'Director', email: 'director@crm.vn', password: '123456', color: 'purple' },
  { label: 'Team Lead', role: 'Team Lead', email: 'lead@crm.vn', password: '123456', color: 'magenta' },
  { label: 'Sales Rep', role: 'Sales Rep', email: 'sales@crm.vn', password: '123456', color: 'blue' },
  { label: 'Marketing', role: 'Marketing', email: 'marketing@crm.vn', password: '123456', color: 'orange' },
  { label: 'Cust. Success', role: 'Cust. Success', email: 'cs@crm.vn', password: '123456', color: 'cyan' },
  { label: 'Accountant', role: 'Accountant', email: 'accountant@crm.vn', password: '123456', color: 'green' }
];
// --- MODAL ĐĂNG KÝ AN TOÀN (KHÔNG DÙNG ICON LẠ, KHÔNG DÙNG ROW/COL) ---
function RegisterModal({ open, onCancel, onSuccess }) {
  const [form] = Form.useForm();
  const [countdown, setCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    try {
      const email = form.getFieldValue('email');
      if (!email) return message.warning('Vui lòng nhập email trước khi lấy mã!');
      setSendingOtp(true);
      const res = await axios.post('http://localhost:5001/api/auth/send-register-otp', { email });
      message.success(res.data.message || 'Mã xác nhận đã gửi về email!');
      setCountdown(60);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gửi mã xác nhận.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRegister = async (values) => {
    setSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5001/api/auth/register', {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        otp_code: values.otp_code
      });
      message.success(res.data.message || 'Tạo tài khoản thành công!');
      form.resetFields();
      onSuccess();
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Tạo Tài Khoản Mới"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleRegister} style={{ marginTop: 16 }}>
        <Form.Item label="Họ và tên" name="full_name">
          <Input prefix={<UserOutlined />} placeholder="Ví dụ: Nguyễn Văn A" size="large" />
        </Form.Item>

        <Form.Item
          label="Email đăng ký"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email!' },
            { type: 'email', message: 'Email không đúng định dạng!' }
          ]}
        >
          <Input placeholder="name@company.com" size="large" />
        </Form.Item>

        <Form.Item label="Mã xác nhận (OTP gửi về mail)" required>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item
              name="otp_code"
              noStyle
              rules={[{ required: true, message: 'Nhập mã 6 số!' }]}
            >
              <Input placeholder="Nhập mã 6 số" maxLength={6} size="large" />
            </Form.Item>
            <Button
              size="large"
              onClick={handleSendOtp}
              loading={sendingOtp}
              disabled={countdown > 0}
              style={{ minWidth: 100 }}
            >
              {countdown > 0 ? `${countdown}s` : 'Gửi mã'}
            </Button>
          </div>
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu!' },
            { min: 6, message: 'Tối thiểu 6 ký tự!' }
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự" size="large" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu"
          name="confirm_password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Mật khẩu không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" size="large" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            Xác Nhận Tạo Tài Khoản
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}


export default function Login({ onLoginSuccess }) {
  const [form] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // RÀNG BUỘC KHÓA: SAI 5 LẦN KHÓA 15 GIÂY
  const [failedCount, setFailedCount] = useState(() => {
    return parseInt(localStorage.getItem('crm_failed_attempts') || '0', 10);
  });
  const [lockCountdown, setLockCountdown] = useState(0);

  // MODAL QUÊN MẬT KHẨU
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [resettingPass, setResettingPass] = useState(false);

  // Kiểm tra thời gian khóa khi tải trang
  useEffect(() => {
    const lockUntil = localStorage.getItem('crm_locked_until');
    if (lockUntil) {
      const remaining = Math.ceil((parseInt(lockUntil, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockCountdown(remaining);
      } else {
        clearLockState();
      }
    }
  }, []);

  // Bộ đếm ngược thời gian thực
  useEffect(() => {
    let timer;
    if (lockCountdown > 0) {
      timer = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            clearLockState();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockCountdown]);

  const clearLockState = () => {
    localStorage.removeItem('crm_locked_until');
    localStorage.removeItem('crm_failed_attempts');
    setFailedCount(0);
  };

  // Xử lý đăng nhập
const handleLogin = async (values) => {
  try {
    setLoading(true);
    const res = await axios.post('http://localhost:5001/api/auth/login', values);

    // CHỈ LƯU VÀ CHUYỂN TRANG KHI SERVER THỰC SỰ TRẢ VỀ TOKEN HỢP LỆ
    if (res.data && res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      message.success('Đăng nhập thành công!');
      
      // Gọi callback đăng nhập hoặc chuyển hướng
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(res.data.user);
      }
    } else {
      message.error(res.data?.message || 'Không nhận được mã xác thực!');
    }
  } catch (err) {
    // Khi có lỗi (400, 401, 403 tài khoản bị khóa), TUYỆT ĐỐI KHÔNG LƯU RÁC VÀO LOCALSTORAGE
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const resp = err.response?.data;
    if (resp?.isTemporaryLock && resp?.remainingSeconds) {
      setLockCountdown(resp.remainingSeconds);
      localStorage.setItem('crm_locked_until', (Date.now() + resp.remainingSeconds * 1000).toString());
    }
    message.error(resp?.message || 'Đăng nhập thất bại!');
  } finally {
    setLoading(false);
  }
};
  // Nạp nhanh tài khoản theo vai trò được chọn
  const handleSelectTestAccount = (acc) => {
    if (lockCountdown > 0) return;
    form.setFieldsValue({
      email: acc.email,
      password: acc.password
    });
    message.info(`Đã nạp tài khoản: ${acc.label} (${acc.email})`);
  };

// Hàm gửi yêu cầu quên mật khẩu thỏa mãn AC 3
const handleSendResetLink = async (values) => {
  setSendingEmail(true);
  try {
    const res = await axios.post('http://localhost:5001/api/auth/forgot-password', {
      email: values.email.trim()
    });

    // AC 3: Bất kể email đúng hay sai, luôn hiển thị cùng thông báo này
    message.success(res.data.message || 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.');
    setIsForgotModalOpen(false);
    forgotForm.resetFields();
  } catch (err) {
    message.error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
  } finally {
    setSendingEmail(false);
  }
};

  // Quên mật khẩu: Xác nhận OTP và đặt pass mới
  const handleResetPassword = async (values) => {
    setResettingPass(true);
    try {
      await axios.post('http://localhost:5001/api/auth/reset-password', {
        email: forgotEmail,
        otp: values.otp.trim(),
        new_password: values.new_password
      });
      message.success('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setIsForgotModalOpen(false);
      setForgotStep(0);
      forgotForm.resetFields();
      form.setFieldsValue({ email: forgotEmail, password: values.new_password });
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setResettingPass(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
      padding: '24px 16px'
    }}>
      <Card
        style={{ width: 480, borderRadius: 16, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
        bodyStyle={{ padding: '36px 32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 50,
            height: 50,
            backgroundColor: '#1677ff',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
          }}>
            <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: -0.5 }}>
            ENTERPRISE <span style={{ color: '#1677ff' }}>CRM</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Cổng thông tin quản trị và vận hành doanh nghiệp
          </Text>
        </div>

        {/* Thông báo khóa tạm thời khi nhập sai quá 5 lần */}
        {lockCountdown > 0 && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
            message="Tạm khóa đăng nhập 15 phút (AC S1-01)"
            description={`Tài khoản đã nhập sai 5 lần liên tiếp. Vui lòng chờ ${Math.floor(lockCountdown / 60)} phút ${lockCountdown % 60} giây để thử lại.`}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleLogin} disabled={lockCountdown > 0}>
          <Form.Item
            label={<Text strong>Email tài khoản</Text>}
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input size="large" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="nhanvien@crm.vn" />
          </Form.Item>

          {/* TIÊU ĐỀ MẬT KHẨU CĂN 2 BÊN BẰNG FLEXBOX */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>Mật khẩu</Text>
            <a
              onClick={() => {
                if (lockCountdown > 0) return;
                setIsForgotModalOpen(true);
                setForgotStep(0);
                forgotForm.resetFields();
              }}
              style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}
            >
              Quên mật khẩu?
            </a>
          </div>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password size="large" prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="••••••••" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            disabled={lockCountdown > 0}
            icon={<ArrowRightOutlined />}
            style={{ height: 46, borderRadius: 8, fontWeight: 600, fontSize: 15 }}
          >
            {lockCountdown > 0 ? `Đang khóa (${lockCountdown}s)` : 'Đăng Nhập'}
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
        <span style={{ fontSize: 13, color: '#8c8c8c' }}>Chưa có tài khoản? </span>
        <a
          onClick={() => setIsRegisterOpen(true)}
          style={{ fontSize: 13, fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
        >
          Tạo tài khoản ngay
        </a>
      </div>

      {/* Thẻ gọi modal */}
      <RegisterModal
        open={isRegisterOpen}
        onCancel={() => setIsRegisterOpen(false)}
        onSuccess={() => setIsRegisterOpen(false)}
      />

        {/* 7 TÀI KHOẢN TEST NHANH THEO MA TRẬN 7 ROLES */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              Tài khoản test nhanh theo 7 vai trò hệ thống:
            </Text>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {TEST_ACCOUNTS.map((acc) => (
              <Button
                key={acc.role}
                size="small"
                disabled={lockCountdown > 0}
                onClick={() => handleSelectTestAccount(acc)}
                style={{ borderRadius: 6, fontSize: 12 }}
              >
                <Tag color={acc.color} style={{ margin: 0, marginRight: 4, borderRadius: 4, padding: '0 4px' }}>
                  {acc.role}
                </Tag>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* MODAL QUÊN MẬT KHẨU THỎA MÃN AC 1 & AC 3 */}
<Modal
  title="Khôi Phục Mật Khẩu"
  open={isForgotModalOpen}
  onCancel={() => setIsForgotModalOpen(false)}
  footer={null}
  destroyOnClose
  width={440}
>
  <div style={{ marginBottom: 16, color: '#64748b', fontSize: 13 }}>
    Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ gửi một <b>liên kết đặt lại mật khẩu có hiệu lực trong 30 phút</b> đến hòm thư.
  </div>
  <Form form={forgotForm} layout="vertical" onFinish={handleSendResetLink}>
    <Form.Item
      label="Email tài khoản"
      name="email"
      rules={[
        { required: true, message: 'Vui lòng nhập email!' },
        { type: 'email', message: 'Địa chỉ email không đúng định dạng!' }
      ]}
    >
      <Input size="large" prefix={<MailOutlined />} placeholder="Ví dụ: admin@gmail.com" />
    </Form.Item>
    <Button type="primary" htmlType="submit" block size="large" loading={sendingEmail} style={{ height: 44, borderRadius: 8 }}>
      Gửi Liên Kết Đặt Lại Mật Khẩu
    </Button>
  </Form>
</Modal>
    </div>
  );
}