import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('admin@gmail.com');
    const [password, setPassword] = useState('123456aA@');
    const [loading, setLoading] = useState(false);

    // Xử lý đăng nhập
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
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
                if (onLoginSuccess) onLoginSuccess(data.user);
            } else {
                alert('⚠️ ' + (data.message || 'Đăng nhập thất bại!'));
            }
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        } finally {
            setLoading(false);
        }
    };

    // Điền nhanh tài khoản test
    const fillAccount = (accEmail) => {
        setEmail(accEmail);
        setPassword('123456aA@');
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#0c1322',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            padding: '20px'
        }}>
            {/* NHÚNG CSS ANIMATION & HOVER HIỆU ỨNG TRỰC TIẾP */}
            <style>{`
                @keyframes loginFadeIn {
                    0% {
                        opacity: 0;
                        transform: translateY(16px) scale(0.97);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .login-card-animated {
                    animation: loginFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                /* Nút Đăng nhập: Hover tối màu + nổi khối */
                .btn-login-submit {
                    background-color: #ff5e00;
                    color: #ffffff;
                    border: none;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .btn-login-submit:hover {
                    background-color: #e04f00; /* Tối màu đi một tông */
                    transform: translateY(-2px); /* Nhấc nổi nhẹ lên */
                    box-shadow: 0 8px 24px rgba(255, 94, 0, 0.35); /* Đổ bóng phát sáng */
                }
                .btn-login-submit:active {
                    transform: translateY(0);
                    box-shadow: 0 3px 10px rgba(255, 94, 0, 0.25);
                }

                /* Nút tài khoản test nhanh */
                .btn-test-chip {
                    background-color: #212c40;
                    color: #c9d1d9;
                    border: 1px solid #303e55;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .btn-test-chip:hover {
                    background-color: #2b3952;
                    color: #58a6ff;
                    border-color: #58a6ff;
                    transform: translateY(-1px);
                }

                /* Input focus hiệu ứng */
                .login-input {
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .login-input:focus {
                    outline: none;
                    border-color: #ff5e00 !important;
                    box-shadow: 0 0 0 3px rgba(255, 94, 0, 0.2) !important;
                }
            `}</style>

            {/* KHUNG ĐĂNG NHẬP (CARD) BO TRÒN 20PX + HIỆU ỨNG XUẤT HIỆN */}
            <div 
                className="login-card-animated"
                style={{
                    width: '100%',
                    maxWidth: '430px',
                    backgroundColor: '#162235',
                    border: '1px solid #27374f',
                    borderRadius: '20px', // Bo tròn mềm mại hơn
                    padding: '36px 32px',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)'
                }}
            >
                {/* TIÊU ĐỀ */}
                <div style={{ textAlign: 'center', marginBottom: '26px' }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '800',
                        color: '#ff5e00',
                        letterSpacing: '0.5px'
                    }}>
                        HỆ THỐNG CRM
                    </h2>
                    <p style={{
                        margin: '8px 0 0',
                        fontSize: '13px',
                        color: '#8b9bb4'
                    }}>
                        Đăng nhập tài khoản để vào hệ thống
                    </p>
                </div>

                {/* FORM NHẬP LIỆU */}
                <form onSubmit={handleSubmit}>
                    {/* EMAIL */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: '#c9d1d9', marginBottom: '6px', fontWeight: '500' }}>
                            Email đăng nhập
                        </label>
                        <input
                            type="email"
                            required
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                backgroundColor: '#212d42',
                                border: '1px solid #324461',
                                borderRadius: '12px', // Bo tròn input
                                color: '#ffffff',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* PASSWORD */}
                    <div style={{ marginBottom: '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', color: '#c9d1d9', fontWeight: '500' }}>
                                Mật khẩu
                            </label>
                            <a
                                href="#forgot"
                                onClick={(e) => { e.preventDefault(); alert('Vui lòng liên hệ Admin để cấp lại mật khẩu!'); }}
                                style={{ fontSize: '12px', color: '#58a6ff', textDecoration: 'none' }}
                            >
                                Quên mật khẩu?
                            </a>
                        </div>
                        <input
                            type="password"
                            required
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%',
                                padding: '11px 14px',
                                backgroundColor: '#212d42',
                                border: '1px solid #324461',
                                borderRadius: '12px', // Bo tròn input
                                color: '#ffffff',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* NÚT ĐĂNG NHẬP */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-login-submit"
                        style={{
                            width: '100%',
                            padding: '12px 0',
                            borderRadius: '12px', // Bo tròn nút bấm
                            fontSize: '15px',
                            fontWeight: 'bold',
                            display: 'block'
                        }}
                    >
                        {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
                    </button>
                </form>

                {/* KHỐI TÀI KHOẢN TEST NHANH */}
                <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #23334a', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#8b9bb4', marginBottom: '10px' }}>
                        Tài khoản test nhanh (Pass: 123456aA@):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="btn-test-chip"
                            onClick={() => fillAccount('admin@gmail.com')}
                            style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}
                        >
                            Giám Đốc (Admin)
                        </button>
                        <button
                            type="button"
                            className="btn-test-chip"
                            onClick={() => fillAccount('truongnhom_a@gmail.com')}
                            style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}
                        >
                            Trưởng Nhóm A
                        </button>
                        <button
                            type="button"
                            className="btn-test-chip"
                            onClick={() => fillAccount('sales_a1@gmail.com')}
                            style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}
                        >
                            Sales A1 (Nhóm A)
                        </button>
                        <button
                            type="button"
                            className="btn-test-chip"
                            onClick={() => fillAccount('sales_b1@gmail.com')}
                            style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}
                        >
                            Sales B1 (Nhóm B)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;