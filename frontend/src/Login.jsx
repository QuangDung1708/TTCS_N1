import React, { useState, useEffect } from 'react';

const Login = ({ onLoginSuccess, sessionExpiredMessage }) => {
    const [email, setEmail] = useState('admin@gmail.com');
    const [password, setPassword] = useState('123456aA@');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // States thông báo lỗi & Khóa tài khoản (S1-01)
    const [errorMessage, setErrorMessage] = useState('');
    const [lockCountdown, setLockCountdown] = useState(0);

    // States Modal Quên Mật Khẩu (S1-03)
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotNotice, setForgotNotice] = useState(null);
    const [forgotLoading, setForgotLoading] = useState(false);

    // Bộ đếm ngược khi bị khóa 15s (S1-01)
    useEffect(() => {
        let timer;
        if (lockCountdown > 0) {
            timer = setInterval(() => {
                setLockCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [lockCountdown]);

    // Xử lý Đăng Nhập
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (lockCountdown > 0) return;

        setLoading(true);
        setErrorMessage('');

        try {
            const res = await fetch('http://localhost:5001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('last_active_time', Date.now().toString());
                if (onLoginSuccess) onLoginSuccess(data.user);
            } else {
                if (res.status === 403) {
                    setLockCountdown(data.secondsLeft || 15);
                    setErrorMessage('');
                } else {
                    setErrorMessage(data.message || 'Email hoặc mật khẩu không chính xác!');
                }
            }
        } catch (err) {
            console.error('Lỗi login:', err);
            setErrorMessage('Không thể kết nối đến máy chủ Backend!');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý Quên Mật Khẩu (S1-03)
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;

        setForgotLoading(true);
        setForgotNotice(null);

        try {
            const res = await fetch('http://localhost:5001/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                setForgotNotice({
                    type: 'success',
                    message: data.message,
                    tempPassword: data.tempPassword
                });
            } else {
                setForgotNotice({
                    type: 'error',
                    message: data.message || 'Lỗi xử lý yêu cầu!'
                });
            }
        } catch (err) {
            console.error('Lỗi forgot password:', err);
            setForgotNotice({
                type: 'error',
                message: 'Lỗi kết nối máy chủ khi gửi yêu cầu!'
            });
        } finally {
            setForgotLoading(false);
        }
    };

    const fillAccount = (accEmail) => {
        setEmail(accEmail);
        setPassword('123456aA@');
        setErrorMessage('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#0c1322',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .auth-card { animation: modalFadeIn 0.3s ease forwards; }
                .auth-input:focus {
                    outline: none;
                    border-color: #ff5e00 !important;
                    box-shadow: 0 0 0 3px rgba(255, 94, 0, 0.2) !important;
                }
            `}</style>

            <div className="auth-card" style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: '#162235',
                border: '1px solid #27374f',
                borderRadius: '20px',
                padding: '36px 32px',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#ff5e00' }}>HỆ THỐNG CRM</h2>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#8b9bb4' }}>Đăng nhập tài khoản để vào hệ thống</p>
                </div>

                {/* THÔNG BÁO HẾT HẠN PHIÊN (S1-02) */}
                {sessionExpiredMessage && (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#2e1f06', border: '1px solid #d29922', color: '#ffd37a', fontSize: '13px', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>⚠️</span>
                        <span>{sessionExpiredMessage}</span>
                    </div>
                )}

                {/* THÔNG BÁO KHÓA TÀI KHOẢN HOẶC BÁO LỖI (S1-01) */}
                {lockCountdown > 0 ? (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#2c0e11', border: '1px solid #f85149', color: '#ff7b72', fontSize: '13px', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>⏳</span>
                        <div>
                            Tài khoản bị tạm khóa do nhập sai 5 lần. Thử lại sau <strong>{lockCountdown}s</strong>!
                        </div>
                    </div>
                ) : errorMessage ? (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#2c0e11', border: '1px solid #f85149', color: '#ff7b72', fontSize: '13px', marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>❌</span>
                        <div style={{ flex: 1 }}>{errorMessage}</div>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: '#c9d1d9', marginBottom: '6px', fontWeight: '500' }}>Email đăng nhập</label>
                        <input
                            type="email"
                            required
                            disabled={lockCountdown > 0}
                            className="auth-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            style={{ width: '100%', padding: '11px 14px', backgroundColor: '#212d42', border: '1px solid #324461', borderRadius: '12px', color: '#ffffff', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', color: '#c9d1d9', fontWeight: '500' }}>Mật khẩu</label>
                            {/* NÚT QUÊN MẬT KHẨU (S1-03) */}
                            <span
                                onClick={() => { setShowForgotModal(true); setForgotNotice(null); setForgotEmail(''); }}
                                style={{ fontSize: '12.5px', color: '#58a6ff', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Quên mật khẩu?
                            </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                disabled={lockCountdown > 0}
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '11px 40px 11px 14px', backgroundColor: '#212d42', border: '1px solid #324461', borderRadius: '12px', color: '#ffffff', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                            <span
                                onMouseEnter={() => setShowPassword(true)}
                                onMouseLeave={() => setShowPassword(false)}
                                title="Rê chuột để xem mật khẩu"
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '16px', opacity: 0.75, userSelect: 'none' }}
                            >
                                {showPassword ? '👁️' : '🙈'}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || lockCountdown > 0}
                        style={{
                            width: '100%',
                            padding: '12px 0',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            backgroundColor: lockCountdown > 0 ? '#484f58' : '#ff5e00',
                            color: '#ffffff',
                            border: 'none',
                            cursor: lockCountdown > 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Đang xác thực...' : lockCountdown > 0 ? `Đang khóa (${lockCountdown}s)` : 'Đăng Nhập'}
                    </button>
                </form>

                {/* TÀI KHOẢN TEST */}
                <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #23334a', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8b9bb4', marginBottom: '10px' }}>Tài khoản test nhanh (Pass: 123456aA@):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        <button type="button" onClick={() => fillAccount('admin@gmail.com')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', backgroundColor: '#212c40', color: '#c9d1d9', border: '1px solid #303e55', cursor: 'pointer' }}>Admin (Giám Đốc)</button>
                        <button type="button" onClick={() => fillAccount('sales_a1@gmail.com')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', backgroundColor: '#212c40', color: '#c9d1d9', border: '1px solid #303e55', cursor: 'pointer' }}>Sales A1</button>
                        <button type="button" onClick={() => fillAccount('sales_b1@gmail.com')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', backgroundColor: '#212c40', color: '#c9d1d9', border: '1px solid #303e55', cursor: 'pointer' }}>Sales B1</button>
                    </div>
                </div>
            </div>

            {/* MODAL QUÊN MẬT KHẨU (S1-03) */}
            {showForgotModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '16px', width: '420px', padding: '26px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>🔑 Khôi Phục Mật Khẩu</h3>
                            <button onClick={() => setShowForgotModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8b9bb4' }}>
                            Nhập địa chỉ email đăng ký để nhận thông tin khôi phục tài khoản.
                        </p>

                        {forgotNotice && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '14px',
                                fontSize: '13px',
                                backgroundColor: forgotNotice.type === 'success' ? '#0d2818' : '#2c0e11',
                                border: `1px solid ${forgotNotice.type === 'success' ? '#2ea043' : '#f85149'}`,
                                color: '#ffffff'
                            }}>
                                <div>{forgotNotice.message}</div>
                                {forgotNotice.tempPassword && (
                                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#162235', borderRadius: '6px', border: '1px dashed #3fb950' }}>
                                        Mật khẩu tạm thời: <strong style={{ color: '#3fb950', fontSize: '15px' }}>{forgotNotice.tempPassword}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleForgotPassword}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Địa chỉ Email *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowForgotModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    Đóng
                                </button>
                                <button type="submit" disabled={forgotLoading} style={{ padding: '8px 20px', backgroundColor: '#ff5e00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {forgotLoading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;