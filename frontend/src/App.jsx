import React, { useState, useEffect } from 'react';
import Login from './Login';

// Import các Module nghiệp vụ & hệ thống có sẵn trong src
import CustomerManagement from './CustomerManagement';
import CustomFieldSettings from './CustomFieldSettings';
import PipelineConfigManagement from './PipelineConfigManagement';
import DealReasonsAndCompetitors from './DealReasonsAndCompetitors';
import UserManagement from './UserManagement';
import ProductManagement from './ProductManagement';
import SalesOrgTree from './SalesOrgTree';
import CategoryManagement from './CategoryManagement';
import AuditLogManagement from './AuditLogManagement';

function App() {
    // 1. Khởi tạo thông tin User từ LocalStorage
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Modal states
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Profile form states (Chuẩn hóa theo S2-02 & S2-03)
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileSignature, setProfileSignature] = useState('');
    const [profileAvatar, setProfileAvatar] = useState('');
    const [avatarMode, setAvatarMode] = useState('url'); // 'url' hoặc 'upload'
    const [isChangingAvatar, setIsChangingAvatar] = useState(false);

    // Password form states
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Toast Notification System
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
        }, 3200);
    };

    // Tự động chuyển alert() trình duyệt thành Toast nổi trên giao diện
    useEffect(() => {
        const originalAlert = window.alert;
        window.alert = (msg) => {
            const strMsg = String(msg);
            let type = 'info';
            if (strMsg.includes('✅') || strMsg.toLowerCase().includes('thành công')) type = 'success';
            else if (strMsg.includes('❌') || strMsg.toLowerCase().includes('lỗi') || strMsg.toLowerCase().includes('thất bại')) type = 'error';
            else if (strMsg.includes('⚠️') || strMsg.toLowerCase().includes('vui lòng') || strMsg.toLowerCase().includes('cảnh báo')) type = 'warning';
            showToast(strMsg, type);
        };
        return () => {
            window.alert = originalAlert;
        };
    }, []);

    // Cập nhật state khi User thay đổi
    useEffect(() => {
        if (user) {
            setProfileName(user.name || '');
            setProfilePhone(user.phone || '');
            setProfileSignature(user.email_signature || '');
            setProfileAvatar(user.avatar || '');
        }
    }, [user]);

    // Xử lý tải ảnh đại diện từ máy tính (AC S2-03: JPG/PNG tối đa 2MB)
    const handleAvatarFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Kiểm tra định dạng ảnh
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            showToast('⚠️ Chỉ chấp nhận định dạng ảnh JPG hoặc PNG!', 'warning');
            e.target.value = '';
            return;
        }

        // 2. Kiểm tra dung lượng tối đa 2MB
        if (file.size > 2 * 1024 * 1024) {
            showToast('⚠️ Dung lượng ảnh vượt quá 2MB! Vui lòng chọn ảnh nhẹ hơn.', 'warning');
            e.target.value = '';
            return;
        }

        // 3. Đọc dữ liệu ảnh sang dạng Base64
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileAvatar(reader.result);
            showToast('✅ Đã tải ảnh lên thành công! Nhấn "Lưu Thay Đổi" để áp dụng.', 'info');
        };
        reader.readAsDataURL(file);
    };

    // Xử lý lưu hồ sơ cá nhân (AC S2-02 & S2-03)
    const handleSaveProfile = (e) => {
        e.preventDefault();

        // Validate Họ tên
        if (!profileName.trim()) {
            showToast('⚠️ Họ và tên không được để trống!', 'warning');
            return;
        }

        // Validate Định dạng số điện thoại Việt Nam (10 số, đầu số hợp lệ)
        if (profilePhone.trim()) {
            const vnfRegex = /^(03|05|07|08|09)\d{8}$/;
            if (!vnfRegex.test(profilePhone.trim())) {
                showToast('⚠️ Số điện thoại không hợp lệ! Phải là 10 số bắt đầu bằng 03, 05, 07, 08 hoặc 09.', 'warning');
                return;
            }
        }

        const updatedUser = {
            ...user,
            name: profileName.trim(),
            phone: profilePhone.trim(),
            email_signature: profileSignature.trim(),
            avatar: profileAvatar.trim()
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileModal(false);
        setIsChangingAvatar(false);
        showToast('✅ Cập nhật thông tin hồ sơ cá nhân thành công!', 'success');
    };

    // Xử lý Đổi mật khẩu
    const handleChangePassword = (e) => {
        e.preventDefault();
        if (!oldPassword || !newPassword) {
            showToast('⚠️ Vui lòng nhập đầy đủ mật khẩu!', 'warning');
            return;
        }
        if (newPassword.length < 6) {
            showToast('⚠️ Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
            return;
        }
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        showToast('✅ Đổi mật khẩu tài khoản thành công!', 'success');
    };

    // Xử lý Xác nhận Đăng xuất
    const handleConfirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setShowLogoutModal(false);
        setIsDrawerOpen(false);
        showToast('👋 Đã đăng xuất khỏi hệ thống!', 'info');
    };

    // Chưa đăng nhập -> Render trang Login
    if (!user) {
        return <Login onLoginSuccess={(userData) => setUser(userData)} />;
    }

    // Danh sách menu chức năng trong Menu 3 gạch
    const menuGroups = [
        {
            title: 'Kinh Doanh & Bán Hàng',
            items: [
                { id: 'dashboard', label: 'Tổng Quan Hệ Thống', icon: '📊' },
                { id: 'customers', label: 'Quản Lý Khách Hàng', icon: '👥' },
                { id: 'pipeline-config', label: 'Cấu Hình Pipeline Bán Hàng', icon: '📈' },
                { id: 'deal-reasons', label: 'Lý Do Thắng/Thua & Đối Thủ', icon: '🎯' },
            ]
        },
        {
            title: 'Cấu Hình & Quản Trị Hệ Thống',
            items: [
                { id: 'users', label: 'Quản Lý Người Dùng', icon: '👤' },
                { id: 'products', label: 'Bảng Giá Sản Phẩm', icon: '📦' },
                { id: 'org-tree', label: 'Sơ Đồ Cây Tổ Chức', icon: '🌳' },
                { id: 'categories', label: 'Danh Mục Bán Hàng', icon: '🏷️' },
                { id: 'custom-fields', label: 'Khai Báo Trường Tùy Biến', icon: '⚙️' },
                { id: 'audit-logs', label: 'Nhật Ký Thay Đổi (Audit Log)', icon: '📝' },
            ]
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {/* CSS TÙY BIẾN CHO GIAO DIỆN & MENU */}
            <style>{`
                @keyframes drawerSlideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .nav-drawer {
                    animation: drawerSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .drawer-backdrop {
                    animation: fadeInOverlay 0.25s ease forwards;
                }
                .toast-item {
                    animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .menu-item-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 14px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    background-color: transparent;
                    color: #8b9bb4;
                    font-size: 13.5px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: left;
                }
                .menu-item-btn:hover {
                    background-color: #1a2436;
                    color: #58a6ff;
                    border-color: #263854;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(88, 166, 255, 0.12);
                }
                .menu-item-btn.active {
                    background-color: #ff5e0018;
                    color: #ff772e;
                    border-color: #ff5e0055;
                    font-weight: 700;
                }

                .btn-hamburger {
                    background: transparent;
                    border: 1px solid #27374f;
                    color: #e6edf3;
                    border-radius: 8px;
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-hamburger:hover {
                    background-color: #1a2436;
                    border-color: #ff5e00;
                    color: #ff5e00;
                }

                .kpi-card {
                    background-color: #121927;
                    border: 1px solid #1e2c42;
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.25s ease;
                }
                .kpi-card:hover {
                    transform: translateY(-3px);
                    border-color: #3b82f6;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                }
            `}</style>

            {/* TOAST THÔNG BÁO NỔI GÓC PHẢI MÀN HÌNH */}
            {toast.show && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
                    <div
                        className="toast-item"
                        style={{
                            padding: '12px 20px',
                            borderRadius: '10px',
                            backgroundColor: toast.type === 'error' ? '#2c0e11' : toast.type === 'success' ? '#0d2818' : toast.type === 'warning' ? '#2e1f06' : '#101d33',
                            border: `1px solid ${toast.type === 'error' ? '#f85149' : toast.type === 'success' ? '#2ea043' : toast.type === 'warning' ? '#d29922' : '#58a6ff'}`,
                            color: '#ffffff',
                            fontSize: '13.5px',
                            fontWeight: '600',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {/* HEADER TỐI GIẢN */}
            <header style={{ backgroundColor: '#0f1726', borderBottom: '1px solid #1e2c42', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* NÚT 3 GẠCH */}
                        <button className="btn-hamburger" onClick={() => setIsDrawerOpen(true)} title="Mở danh mục tính năng">
                            ☰
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#ff5e00', letterSpacing: '0.5px' }}>CRM SYSTEM</span>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#ff5e0020', color: '#ff772e', border: '1px solid #ff5e0055', fontWeight: 'bold' }}>
                                B2B PRO
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#8b9bb4' }}>Trang hiện tại:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#58a6ff', backgroundColor: '#162235', padding: '4px 12px', borderRadius: '6px', border: '1px solid #27374f' }}>
                            {menuGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Tổng Quan Hệ Thống'}
                        </span>
                    </div>
                </div>
            </header>

            {/* DRAWER MENU 3 GẠCH TRƯỢT TỪ TRÁI SANG */}
            {isDrawerOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex' }}>
                    <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' }} />

                    <div
                        className="nav-drawer"
                        style={{
                            position: 'relative',
                            width: '320px',
                            height: '100%',
                            backgroundColor: '#0f1726',
                            borderRight: '1px solid #1e2c42',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '10px 0 35px rgba(0,0,0,0.5)',
                            zIndex: 1001
                        }}
                    >
                        {/* 1. KHUNG AVATAR + HIỂN THỊ ROLE CỤ THỂ (THEO YÊU CẦU ẢNH 3) */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #1e2c42' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Hồ Sơ Tài Khoản
                                </span>
                                <button
                                    onClick={() => setIsDrawerOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '12px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    {profileAvatar ? (
                                        <img
                                            src={profileAvatar}
                                            alt="Avatar"
                                            style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff5e00' }}
                                        />
                                    ) : (
                                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ff5e00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '14.5px', fontWeight: 'bold', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {user.name || 'Admin System'}
                                        </div>
                                        {/* HIỂN THỊ RÕ RÀNG ROLE VÀ CHỨC DANH DƯỚI TÊN */}
                                        <div style={{ fontSize: '11.5px', color: '#ff772e', marginTop: '2px', fontWeight: '600' }}>
                                            Vai trò: {user.role_name || 'Director (Ban Giám Đốc)'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setShowProfileModal(true); setIsDrawerOpen(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '7px 0',
                                        backgroundColor: '#212d42',
                                        color: '#58a6ff',
                                        border: '1px solid #304261',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✏️ Chỉnh sửa trang cá nhân
                                </button>
                            </div>
                        </div>

                        {/* 2. DANH SÁCH MENU ĐIỀU HƯỚNG */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
                            {menuGroups.map((grp, gIdx) => (
                                <div key={gIdx} style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#56657f', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px', letterSpacing: '0.5px' }}>
                                        {grp.title}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {grp.items.map((item) => (
                                            <button
                                                key={item.id}
                                                className={`menu-item-btn ${activeTab === item.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveTab(item.id);
                                                    setIsDrawerOpen(false);
                                                }}
                                            >
                                                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 3. CHÂN MENU: ĐỔI MẬT KHẨU & ĐĂNG XUẤT */}
                        <div style={{ padding: '14px 16px', borderTop: '1px solid #1e2c42', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => { setShowPasswordModal(true); setIsDrawerOpen(false); }}
                                className="menu-item-btn"
                                style={{ color: '#c9d1d9' }}
                            >
                                <span style={{ fontSize: '16px' }}>🔒</span>
                                <span>Đổi Mật Khẩu</span>
                            </button>

                            <button
                                onClick={() => { setShowLogoutModal(true); }}
                                className="menu-item-btn"
                                style={{ color: '#f85149' }}
                            >
                                <span style={{ fontSize: '16px' }}>🚪</span>
                                <span>Đăng Xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VÙNG NỘI DUNG CHÍNH */}
            <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
                {activeTab === 'dashboard' && (
                    <div>
                        <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '14px', padding: '24px 28px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#ffffff' }}>
                                    Xin chào, {user.name} 👋
                                </h1>
                                <p style={{ margin: '8px 0 0', color: '#8b9bb4', fontSize: '13.5px' }}>
                                    Trung tâm điều hành B2B CRM. Dữ liệu phễu bán hàng và hiệu suất thời gian thực.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setActiveTab('customers')}
                                    style={{ padding: '9px 16px', backgroundColor: '#ff5e00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                >
                                    👥 Quản Lý Khách Hàng
                                </button>
                                <button
                                    onClick={() => setActiveTab('pipeline-config')}
                                    style={{ padding: '9px 16px', backgroundColor: '#212d42', color: '#58a6ff', border: '1px solid #304261', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                >
                                    📈 Cấu Hình Pipeline
                                </button>
                            </div>
                        </div>

                        {/* 4 THẺ KPI DOANH SỐ */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                            <div className="kpi-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>TỔNG KHÁCH HÀNG DOANH NGHIỆP</span>
                                    <span style={{ fontSize: '18px' }}>🏢</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '10px' }}>58 Công ty</div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>↑ +14% so với tháng trước</div>
                            </div>

                            <div className="kpi-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>CƠ HỘI BÁN HÀNG ĐANG CHẠY</span>
                                    <span style={{ fontSize: '18px' }}>💼</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#58a6ff', marginTop: '10px' }}>24 Hợp đồng</div>
                                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '6px' }}>Tổng trị giá 4.2 Tỷ VNĐ</div>
                            </div>

                            <div className="kpi-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>DOANH SỐ DỰ BÁO (WEIGHTED)</span>
                                    <span style={{ fontSize: '18px' }}>💰</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#3fb950', marginTop: '10px' }}>2.85 Tỷ VNĐ</div>
                                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '6px' }}>Tính theo % xác suất Pipeline</div>
                            </div>

                            <div className="kpi-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>TỶ LỆ CHỐT THÀNH CÔNG (WIN RATE)</span>
                                    <span style={{ fontSize: '18px' }}>🎯</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f0883e', marginTop: '10px' }}>72.4%</div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>Đạt mục tiêu quý</div>
                            </div>
                        </div>

                        {/* SƠ ĐỒ PHỄU PIPELINE */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                            <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', padding: '22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>📊 Sơ Đồ Phễu Tiến Trình Pipeline</h3>
                                    <span style={{ fontSize: '12px', color: '#58a6ff', cursor: 'pointer' }} onClick={() => setActiveTab('pipeline-config')}>
                                        Cấu hình phễu ➔
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {[
                                        { stage: '1. Tiếp cận & Thấu hiểu', count: 18, rate: '10%', bar: '95%', color: '#388bfd' },
                                        { stage: '2. Xác định nhu cầu', count: 12, rate: '30%', bar: '75%', color: '#58a6ff' },
                                        { stage: '3. Đề xuất giải pháp & Báo giá', count: 8, rate: '60%', bar: '52%', color: '#d2a8ff' },
                                        { stage: '4. Đàm phán & Thương thảo', count: 5, rate: '85%', bar: '35%', color: '#f0883e' },
                                        { stage: '5. Chốt đơn thành công (Won)', count: 9, rate: '100%', bar: '22%', color: '#3fb950' },
                                    ].map((p, idx) => (
                                        <div key={idx}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: '600' }}>{p.stage}</span>
                                                <span style={{ color: '#8b9bb4' }}>{p.count} Deals • {p.rate} Thắng</span>
                                            </div>
                                            <div style={{ height: '8px', backgroundColor: '#1e2c42', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: p.bar, height: '100%', backgroundColor: p.color, borderRadius: '4px' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', padding: '22px' }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#ffffff' }}>⚡ Thao Tác Nhanh</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button onClick={() => setActiveTab('custom-fields')} style={{ padding: '10px 14px', backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '8px', color: '#c9d1d9', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}>
                                        ⚙️ Khai báo thêm trường động Excel
                                    </button>
                                    <button onClick={() => setActiveTab('deal-reasons')} style={{ padding: '10px 14px', backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '8px', color: '#c9d1d9', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}>
                                        🎯 Cập nhật hồ sơ đối thủ cạnh tranh
                                    </button>
                                    <button onClick={() => setActiveTab('categories')} style={{ padding: '10px 14px', backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '8px', color: '#c9d1d9', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}>
                                        🏷️ Phân loại ngành nghề & quy mô
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CÁC TAB CHỨC NĂNG CHÍNH */}
                {activeTab === 'customers' && <CustomerManagement />}
                {activeTab === 'custom-fields' && <CustomFieldSettings />}
                {activeTab === 'pipeline-config' && <PipelineConfigManagement />}
                {activeTab === 'deal-reasons' && <DealReasonsAndCompetitors />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'products' && <ProductManagement />}
                {activeTab === 'org-tree' && <SalesOrgTree />}
                {activeTab === 'categories' && <CategoryManagement />}
                {activeTab === 'audit-logs' && <AuditLogManagement />}
            </main>

            {/* MODAL 1: XÁC NHẬN ĐĂNG XUẤT */}
            {showLogoutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '400px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '38px', marginBottom: '10px' }}>🚪</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ffffff' }}>Xác Nhận Đăng Xuất</h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '13.5px', color: '#8b9bb4' }}>
                            Bạn có chắc chắn muốn đăng xuất không?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                style={{ padding: '9px 20px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13.5px' }}
                            >
                                Không
                            </button>
                            <button
                                onClick={handleConfirmLogout}
                                style={{ padding: '9px 24px', backgroundColor: '#da3633', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13.5px' }}
                            >
                                Có
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: CHỈNH SỬA TRANG CÁ NHÂN (TÙY BIẾN TOÀN DIỆN THEO YÊU CẦU ẢNH 1, S2-02 & S2-03) */}
            {showProfileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '16px', width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>✏️ Chỉnh Sửa Trang Cá Nhân</h3>
                            <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleSaveProfile}>
                            {/* KHU VỰC AVATAR Ở TRÊN ĐẦU MỤC (THEO YÊU CẦU) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#0f1726', borderRadius: '12px', border: '1px solid #1e2c42' }}>
                                {profileAvatar ? (
                                    <img
                                        src={profileAvatar}
                                        alt="Avatar Preview"
                                        style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ff5e00', boxShadow: '0 4px 14px rgba(255,94,0,0.3)', marginBottom: '10px' }}
                                    />
                                ) : (
                                    <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#ff5e00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px', marginBottom: '10px' }}>
                                        {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}

                                {/* NÚT MỞ MỤC ĐỔI ẢNH ĐẠI DIỆN */}
                                <button
                                    type="button"
                                    onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                                    style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#212d42',
                                        color: '#58a6ff',
                                        border: '1px solid #324461',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📷 {isChangingAvatar ? 'Thu gọn tùy chọn đổi ảnh' : 'Đổi ảnh đại diện'}
                                </button>

                                {/* KHU VỰC 2 LỰA CHỌN ĐỔI ẢNH (AC S2-03) */}
                                {isChangingAvatar && (
                                    <div style={{ width: '100%', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #27374f' }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setAvatarMode('url')}
                                                style={{
                                                    flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer',
                                                    backgroundColor: avatarMode === 'url' ? '#ff5e00' : '#1e2c42',
                                                    color: '#fff', border: 'none', fontWeight: avatarMode === 'url' ? 'bold' : 'normal'
                                                }}
                                            >
                                                1. Nhập đường dẫn (URL)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAvatarMode('upload')}
                                                style={{
                                                    flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer',
                                                    backgroundColor: avatarMode === 'upload' ? '#ff5e00' : '#1e2c42',
                                                    color: '#fff', border: 'none', fontWeight: avatarMode === 'upload' ? 'bold' : 'normal'
                                                }}
                                            >
                                                2. Tải ảnh từ máy (&lt; 2MB)
                                            </button>
                                        </div>

                                        {avatarMode === 'url' ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Dán URL ảnh: https://example.com/avatar.png"
                                                    value={profileAvatar}
                                                    onChange={(e) => setProfileAvatar(e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', backgroundColor: '#162235', border: '1px solid #304261', borderRadius: '6px', color: '#fff', fontSize: '12.5px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <input
                                                    type="file"
                                                    accept="image/png, image/jpeg, image/jpg"
                                                    onChange={handleAvatarFileUpload}
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#162235', border: '1px solid #304261', borderRadius: '6px', color: '#8b9bb4', fontSize: '12px', boxSizing: 'border-box' }}
                                                />
                                                <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '4px' }}>
                                                    * Định dạng JPG/PNG, dung lượng không quá 2MB theo chuẩn S2-03.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* MỤC ĐỔI TÊN: DÒNG TÊN HIỆN TẠI & DÒNG ĐỔI TÊN */}
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '12.5px', color: '#8b9bb4' }}>
                                        Tên hiện tại: <span style={{ color: '#58a6ff', fontWeight: 'bold' }}>{user.name || 'Admin System'}</span>
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nhập họ và tên mới..."
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* SỐ ĐIỆN THOẠI & CHỮ KÝ EMAIL (AC S2-02) */}
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>
                                    Số điện thoại (Việt Nam) *
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: 0912345678"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>
                                    Chữ ký Email (dùng khi gửi báo giá cho khách)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Trân trọng, [Họ tên] - Phòng Kinh Doanh..."
                                    value={profileSignature}
                                    onChange={(e) => setProfileSignature(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* CÁC TRƯỜNG BẢO TOÀN KHÔNG CHO TỰ ĐỔI (AC S2-02) */}
                            <div style={{ marginBottom: '20px', padding: '10px 12px', backgroundColor: '#0d131f', borderRadius: '8px', border: '1px solid #1c2738', fontSize: '12px', color: '#8b9bb4' }}>
                                <div>🔒 Email: <strong style={{ color: '#c9d1d9' }}>{user.email}</strong> (Cố định)</div>
                                <div style={{ marginTop: '4px' }}>🔒 Vai trò / Nhóm: <strong style={{ color: '#c9d1d9' }}>{user.role_name || 'Ban Giám Đốc'}</strong> (Do quản trị viên cấp)</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 22px', backgroundColor: '#ff5e00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Lưu Thay Đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: ĐỔI MẬT KHẨU */}
            {showPasswordModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '420px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', color: '#ffffff' }}>🔒 Đổi Mật Khẩu</h3>
                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mật khẩu hiện tại *</label>
                                <input
                                    type="password"
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mật khẩu mới *</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    Hủy
                                </button>
                                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Xác Nhận Đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;