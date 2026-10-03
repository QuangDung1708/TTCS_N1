import React, { useState, useEffect, useMemo } from 'react';
import Login from './Login';

// Import các Module nghiệp vụ & hệ thống
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
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    const [activeTab, setActiveTab] = useState('dashboard');

    // Drawer state có animation đóng ngược mượt mà (Ảnh 4)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isDrawerClosing, setIsDrawerClosing] = useState(false);

    // Dữ liệu thật Dashboard đồng bộ từ Database
    const [dashboardData, setDashboardData] = useState({
        customerCount: 0,
        productCount: 0,
        userCount: 0,
        stages: []
    });
    const [loadingDashboard, setLoadingDashboard] = useState(false);

    // Modal states
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');

    // Profile states
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileSignature, setProfileSignature] = useState('');
    const [profileAvatar, setProfileAvatar] = useState('');
    const [avatarMode, setAvatarMode] = useState('url');
    const [isChangingAvatar, setIsChangingAvatar] = useState(false);
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    // Password form states & Hover reveal
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Toast Notification System
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
        }, 3200);
    };

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
        return () => { window.alert = originalAlert; };
    }, []);

    useEffect(() => {
        if (user) {
            setProfileName(user.name || user.full_name || '');
            setProfilePhone(user.phone || '');
            setProfileSignature(user.email_signature || '');
            setProfileAvatar(user.avatar || '');
            setAvatarLoadError(false);
        }
    }, [user]);

    // [S1-02] Tự động kiểm tra phiên làm việc (Idle timeout)
    useEffect(() => {
        if (!user) return;

        const updateActivity = () => {
            localStorage.setItem('last_active_time', Date.now().toString());
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);

        const interval = setInterval(() => {
            const lastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
            const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 phút không hoạt động

            if (Date.now() - lastActive > SESSION_TIMEOUT) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                setSessionExpiredMsg('Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại!');
            }
        }, 20000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            clearInterval(interval);
        };
    }, [user]);

    // Trích xuất mảng đa năng từ JSON Backend
    const extractArray = (resJson) => {
        if (!resJson) return [];
        if (Array.isArray(resJson)) return resJson;
        if (Array.isArray(resJson.data)) return resJson.data;
        if (Array.isArray(resJson.customers)) return resJson.customers;
        if (Array.isArray(resJson.products)) return resJson.products;
        if (Array.isArray(resJson.stages)) return resJson.stages;
        if (Array.isArray(resJson.pipelineStages)) return resJson.pipelineStages;
        if (Array.isArray(resJson.users)) return resJson.users;
        if (Array.isArray(resJson.rows)) return resJson.rows;
        for (const k in resJson) {
            if (Array.isArray(resJson[k])) return resJson[k];
        }
        return [];
    };

    // Tải dữ liệu thật cho Dashboard từ Database
    const fetchRealDashboardData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoadingDashboard(true);
        const headers = { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        };

        try {
            const [resCust, resProd, resStages, resUsers] = await Promise.allSettled([
                fetch('http://localhost:5001/api/customers', { headers }),
                fetch('http://localhost:5001/api/products', { headers }),
                fetch('http://localhost:5001/api/pipeline-stages', { headers }),
                fetch('http://localhost:5001/api/users', { headers })
            ]);

            // Chỉ đăng xuất khi gặp 401 (Token hết hạn thật sự)
            if (resCust.status === 'fulfilled' && resCust.value.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                setSessionExpiredMsg('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
                return;
            }

            let custList = [];
            if (resCust.status === 'fulfilled' && resCust.value.ok) {
                const d = await resCust.value.json();
                custList = extractArray(d);
            }

            let prodList = [];
            if (resProd.status === 'fulfilled' && resProd.value.ok) {
                const d = await resProd.value.json();
                prodList = extractArray(d);
            }

            let stagesList = [];
            if (resStages.status === 'fulfilled' && resStages.value.ok) {
                const d = await resStages.value.json();
                stagesList = extractArray(d);
                stagesList.sort((a, b) => (a.order_index ?? a.stage_order ?? 0) - (b.order_index ?? b.stage_order ?? 0));
            }

            let usersList = [];
            if (resUsers.status === 'fulfilled' && resUsers.value.ok) {
                const d = await resUsers.value.json();
                usersList = extractArray(d);
            }

            setDashboardData({
                customerCount: custList.length,
                productCount: prodList.length,
                userCount: usersList.length || 1,
                stages: stagesList
            });
        } catch (err) {
            console.error('Lỗi tải dữ liệu Dashboard thật:', err);
        } finally {
            setLoadingDashboard(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRealDashboardData();
        }
    }, [user, activeTab]);

    // Đóng drawer menu có hiệu ứng lùi về bên trái
    const handleCloseDrawer = () => {
        if (isDrawerClosing) return;
        setIsDrawerClosing(true);
        setTimeout(() => {
            setIsDrawerOpen(false);
            setIsDrawerClosing(false);
        }, 260);
    };

    const getAvatarSrc = (url) => {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
        return `http://localhost:5001${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleAvatarFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            showToast('⚠️ Chỉ chấp nhận định dạng ảnh JPG hoặc PNG!', 'warning');
            e.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('⚠️ Dung lượng ảnh vượt quá 2MB theo AC S2-03!', 'warning');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileAvatar(reader.result);
            setAvatarLoadError(false);
            showToast('✅ Đã chọn ảnh từ máy! Nhấn "Lưu Thay Đổi" để lưu vào hệ thống.', 'info');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!profileName.trim()) {
            showToast('⚠️ Họ và tên không được để trống!', 'warning');
            return;
        }

        if (profilePhone.trim()) {
            const vnfRegex = /^(03|05|07|08|09)\d{8}$/;
            if (!vnfRegex.test(profilePhone.trim())) {
                showToast('⚠️ Số điện thoại không hợp lệ! Phải là 10 số đầu 03, 05, 07, 08, 09.', 'warning');
                return;
            }
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: profileName.trim(),
                    phone: profilePhone.trim(),
                    email_signature: profileSignature.trim(),
                    avatar: profileAvatar.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                showToast('⚠️ ' + data.message, 'warning');
                return;
            }

            const updatedUser = { 
                ...user, 
                ...(data.user || {}), 
                name: profileName.trim(), 
                full_name: profileName.trim(), 
                avatar: profileAvatar.trim() 
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setShowProfileModal(false);
            setIsChangingAvatar(false);
            showToast('✅ Cập nhật thông tin hồ sơ cá nhân thành công!', 'success');
        } catch (err) {
            showToast('❌ Lỗi kết nối máy chủ khi lưu hồ sơ!', 'error');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('⚠️ Vui lòng nhập đầy đủ các trường mật khẩu!', 'warning');
            return;
        }

        // Validate đúng chuẩn AC S1-04: tối thiểu 8 ký tự, có chữ và số
        const passRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passRegex.test(newPassword)) {
            showToast('⚠️ Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm cả chữ và số!', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('⚠️ Mật khẩu mới và xác nhận mật khẩu không trùng khớp!', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/users/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const data = await res.json();

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                setSessionExpiredMsg('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
                return;
            }

            if (!res.ok) {
                showToast('❌ ' + (data.message || 'Đổi mật khẩu thất bại!'), 'error');
                return;
            }

            setShowPasswordModal(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showToast('✅ Đổi mật khẩu thành công!', 'success');
        } catch (err) {
            showToast('❌ Lỗi kết nối máy chủ khi đổi mật khẩu!', 'error');
        }
    };

    const handleConfirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setShowLogoutModal(false);
        setIsDrawerOpen(false);
        showToast('👋 Đã đăng xuất khỏi hệ thống!', 'info');
    };

    // Phân quyền theo vai trò (RBAC S1-05 & S1-06)
    const userRole = (user?.role_name || '').toUpperCase();
    const isAdmin = user?.role_id === 1 || userRole.includes('ADMIN') || userRole.includes('DIRECTOR') || userRole.includes('GIÁM ĐỐC');
    const isManager = userRole.includes('TRƯỞNG NHÓM') || userRole.includes('MANAGER');

    const filteredMenuGroups = useMemo(() => {
        const allGroups = [
            {
                title: 'Kinh Doanh & Bán Hàng',
                items: [
                    { id: 'dashboard', label: 'Tổng Quan Hệ Thống', roles: ['ALL'] },
                    { id: 'customers', label: 'Quản Lý Khách Hàng', roles: ['ALL'] },
                    { id: 'products', label: 'Bảng Giá Sản Phẩm', roles: ['ALL'] },
                    { id: 'pipeline-config', label: 'Cấu Hình Pipeline Bán Hàng', roles: ['ADMIN', 'DIRECTOR'] },
                    { id: 'deal-reasons', label: 'Lý Do Thắng/Thua & Đối Thủ', roles: ['ADMIN', 'DIRECTOR'] },
                ]
            },
            {
                title: 'Cấu Hình & Quản Trị Hệ Thống',
                items: [
                    { id: 'users', label: 'Quản Lý Người Dùng', roles: ['ADMIN'] },
                    { id: 'org-tree', label: 'Sơ Đồ Cây Tổ Chức', roles: ['ADMIN', 'DIRECTOR'] },
                    { id: 'categories', label: 'Danh Mục Bán Hàng', roles: ['ADMIN', 'DIRECTOR'] },
                    { id: 'custom-fields', label: 'Khai Báo Trường Tùy Biến', roles: ['ADMIN'] },
                    { id: 'audit-logs', label: 'Nhật Ký Thay Đổi (Audit Log)', roles: ['ADMIN'] },
                ]
            }
        ];

        return allGroups.map(grp => ({
            ...grp,
            items: grp.items.filter(item => {
                if (item.roles.includes('ALL')) return true;
                if (isAdmin) return true;
                if (isManager && item.roles.includes('MANAGER')) return true;
                return false;
            })
        })).filter(grp => grp.items.length > 0);
    }, [isAdmin, isManager]);

    if (!user) {
        return (
            <Login 
                onLoginSuccess={(userData) => { setUser(userData); setSessionExpiredMsg(''); }} 
                sessionExpiredMessage={sessionExpiredMsg} 
            />
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <style>{`
                @keyframes drawerSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                @keyframes drawerSlideOut { from { transform: translateX(0); } to { transform: translateX(-100%); } }
                @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOutOverlay { from { opacity: 1; } to { opacity: 0; } }
                @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

                .nav-drawer { animation: drawerSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .nav-drawer.closing { animation: drawerSlideOut 0.26s cubic-bezier(0.4, 0, 0.2, 1) forwards !important; }
                .drawer-backdrop { animation: fadeInOverlay 0.25s ease forwards; }
                .drawer-backdrop.closing { animation: fadeOutOverlay 0.25s ease forwards !important; }
                .toast-item { animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                .menu-item-btn {
                    width: 100%; display: flex; align-items: center; gap: 12px;
                    padding: 10px 14px; border: 1px solid transparent; border-radius: 8px;
                    background-color: transparent; color: #8b9bb4; font-size: 13.5px;
                    font-weight: 500; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: left;
                }
                .menu-item-btn:hover {
                    background-color: #1a2436; color: #58a6ff; border-color: #263854;
                    transform: translateX(4px); box-shadow: 0 4px 12px rgba(88, 166, 255, 0.12);
                }
                .menu-item-btn.active {
                    background-color: #ff5e0018; color: #ff772e; border-color: #ff5e0055; font-weight: 700;
                }
                .btn-hamburger {
                    background: transparent; border: 1px solid #27374f; color: #e6edf3;
                    border-radius: 8px; width: 38px; height: 38px; display: flex;
                    align-items: center; justify-content: center; font-size: 20px; cursor: pointer; transition: all 0.2s;
                }
                .btn-hamburger:hover { background-color: #1a2436; border-color: #ff5e00; color: #ff5e00; }
                .kpi-card {
                    background-color: #121927; border: 1px solid #1e2c42; border-radius: 12px;
                    padding: 20px; transition: all 0.25s ease;
                }
                .kpi-card:hover { transform: translateY(-3px); border-color: #3b82f6; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); }
                .eye-hover-icon {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    cursor: pointer; font-size: 16px; opacity: 0.7; transition: opacity 0.2s; user-select: none;
                }
                .eye-hover-icon:hover { opacity: 1; }
            `}</style>

            {/* TOAST NOTIFICATION CONTAINER */}
            {toast.show && (
                <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
                    <div
                        className="toast-item"
                        style={{
                            padding: '12px 20px', borderRadius: '10px',
                            backgroundColor: toast.type === 'error' ? '#2c0e11' : toast.type === 'success' ? '#0d2818' : toast.type === 'warning' ? '#2e1f06' : '#101d33',
                            border: `1px solid ${toast.type === 'error' ? '#f85149' : toast.type === 'success' ? '#2ea043' : toast.type === 'warning' ? '#d29922' : '#58a6ff'}`,
                            color: '#ffffff', fontSize: '13.5px', fontWeight: '600', boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header style={{ backgroundColor: '#0f1726', borderBottom: '1px solid #1e2c42', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button className="btn-hamburger" onClick={() => setIsDrawerOpen(true)} title="Mở danh mục tính năng">☰</button>
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
                            {filteredMenuGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Tổng Quan Hệ Thống'}
                        </span>
                    </div>
                </div>
            </header>

            {/* DRAWER MENU 3 GẠCH (ĐÃ PHỤC HỒI 100% HỒ SƠ TÀI KHOẢN VÀ ICON) */}
            {isDrawerOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex' }}>
                    {/* NỀN MỜ CLICK ĐÓNG MƯỢT MÀ */}
                    <div 
                        className={`drawer-backdrop ${isDrawerClosing ? 'closing' : ''}`} 
                        onClick={handleCloseDrawer} 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)' }} 
                    />

                    {/* KHUNG MENU TRƯỢT 2 CHIỀU */}
                    <div 
                        className={`nav-drawer ${isDrawerClosing ? 'closing' : ''}`} 
                        style={{ 
                            position: 'relative', width: '320px', height: '100%', 
                            backgroundColor: '#0f1726', borderRight: '1px solid #1e2c42', 
                            display: 'flex', flexDirection: 'column', 
                            boxShadow: '10px 0 35px rgba(0,0,0,0.5)', zIndex: 1001 
                        }}
                    >
                        {/* 1. KHUNG HỒ SƠ TÀI KHOẢN CỦA BẠN ĐÃ TRỞ LẠI ĐẦY ĐỦ */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #1e2c42' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HỒ SƠ TÀI KHOẢN</span>
                                <button onClick={handleCloseDrawer} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                            </div>

                            <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '12px', padding: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    {profileAvatar && !avatarLoadError ? (
                                        <img src={getAvatarSrc(profileAvatar)} alt="Avatar" onError={() => setAvatarLoadError(true)} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff5e00' }} />
                                    ) : (
                                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ff5e00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                                            {(user.name || user.full_name) ? (user.name || user.full_name).charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '14.5px', fontWeight: 'bold', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {user.name || user.full_name || 'Quang Dũng'}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#ff772e', marginTop: '2px', fontWeight: '600' }}>
                                            Vai trò: {user.role_name || (isAdmin ? 'Director' : 'Sales Executive')}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { setShowProfileModal(true); handleCloseDrawer(); }} 
                                    style={{ width: '100%', padding: '7px 0', backgroundColor: '#212d42', color: '#58a6ff', border: '1px solid #304261', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    ✏️ Chỉnh sửa trang cá nhân
                                </button>
                            </div>
                        </div>

                        {/* 2. DANH SÁCH MENU ĐẦY ĐỦ ICON VÀ PHÂN QUYỀN */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
                            {filteredMenuGroups.map((grp, gIdx) => (
                                <div key={gIdx} style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#56657f', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px', letterSpacing: '0.5px' }}>
                                        {grp.title}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {grp.items.map((item) => (
                                            <button
                                                key={item.id}
                                                className={`menu-item-btn ${activeTab === item.id ? 'active' : ''}`}
                                                onClick={() => { setActiveTab(item.id); handleCloseDrawer(); }}
                                            >
                                                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 3. CHÂN MENU */}
                        <div style={{ padding: '14px 16px', borderTop: '1px solid #1e2c42', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => { setShowPasswordModal(true); handleCloseDrawer(); }} className="menu-item-btn" style={{ color: '#c9d1d9' }}>
                                <span style={{ fontSize: '16px' }}>🔒</span>
                                <span>Đổi Mật Khẩu</span>
                            </button>
                            <button onClick={() => { setShowLogoutModal(true); }} className="menu-item-btn" style={{ color: '#f85149' }}>
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
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#ffffff' }}>Xin chào, {user.name || user.full_name} 👋</h1>
                                <p style={{ margin: '8px 0 0', color: '#8b9bb4', fontSize: '13.5px' }}>Trung tâm điều hành B2B CRM. Báo cáo số liệu thời gian thực đồng bộ trực tiếp từ Database.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => fetchRealDashboardData()} style={{ padding: '9px 14px', backgroundColor: '#1e2c42', color: '#58a6ff', border: '1px solid #304261', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    🔄 {loadingDashboard ? 'Đang tải...' : 'Làm mới'}
                                </button>
                                <button onClick={() => setActiveTab('customers')} style={{ padding: '9px 16px', backgroundColor: '#ff5e00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                    👥 Khách Hàng
                                </button>
                                {isAdmin && (
                                    <button onClick={() => setActiveTab('pipeline-config')} style={{ padding: '9px 16px', backgroundColor: '#212d42', color: '#58a6ff', border: '1px solid #304261', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                        📈 Cấu Hình Pipeline
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 4 THẺ KPI CHÍNH */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                            <div className="kpi-card" onClick={() => setActiveTab('customers')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>KHÁCH HÀNG DOANH NGHIỆP</span><span>🏢</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '10px' }}>
                                    {dashboardData.customerCount} Công ty
                                </div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>● Dữ liệu thật từ bảng customers</div>
                            </div>

                            <div className="kpi-card" onClick={() => setActiveTab('products')} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>BẢNG GIÁ SẢN PHẨM (S2-05)</span><span>📦</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#58a6ff', marginTop: '10px' }}>
                                    {dashboardData.productCount} Mặt hàng
                                </div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>● Dữ liệu thật từ bảng products</div>
                            </div>

                            <div className="kpi-card" onClick={() => isAdmin && setActiveTab('pipeline-config')} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>QUY TRÌNH BÁN HÀNG (S2-09)</span><span>📈</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#3fb950', marginTop: '10px' }}>
                                    {dashboardData.stages.length} Giai đoạn
                                </div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>● Dữ liệu thật từ bảng pipeline_stages</div>
                            </div>

                            <div className="kpi-card" onClick={() => isAdmin && setActiveTab('users')} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b9bb4', fontSize: '13px' }}>
                                    <span>NHÂN SỰ HỆ THỐNG</span><span>👤</span>
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#f0883e', marginTop: '10px' }}>
                                    {dashboardData.userCount} Tài khoản
                                </div>
                                <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '6px' }}>● Dữ liệu thật từ bảng users</div>
                            </div>
                        </div>

                        {/* PHỄU PIPELINE THẬT */}
                        <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', padding: '22px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>📊 Sơ Đồ Phễu Quy Trình Bán Hàng (S2-09)</h3>
                                    <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '4px' }}>
                                        Hiển thị danh sách các giai đoạn & % xác suất thắng chuẩn hóa từ cơ sở dữ liệu
                                    </div>
                                </div>
                                {isAdmin && (
                                    <span style={{ fontSize: '12px', color: '#58a6ff', cursor: 'pointer', fontWeight: '600' }} onClick={() => setActiveTab('pipeline-config')}>
                                        Cấu hình lại các bước ➔
                                    </span>
                                )}
                            </div>

                            {dashboardData.stages.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#8b9bb4', backgroundColor: '#0f1726', borderRadius: '8px' }}>
                                    Chưa có giai đoạn Pipeline nào được cấu hình trong Database. Hãy bấm vào "Cấu Hình Pipeline" để thêm các bước!
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {dashboardData.stages.map((stg, idx) => {
                                        const prob = stg.win_probability ?? stg.probability ?? 10;
                                        const colors = ['#388bfd', '#58a6ff', '#d2a8ff', '#f0883e', '#3fb950', '#a371f7'];
                                        const stageColor = colors[idx % colors.length];

                                        return (
                                            <div key={stg.id || idx}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                                    <span style={{ fontWeight: '600', color: '#ffffff' }}>
                                                        {idx + 1}. {stg.name || stg.stage_name}
                                                    </span>
                                                    <span style={{ color: stageColor, fontWeight: 'bold' }}>
                                                        Xác suất thắng: {prob}%
                                                    </span>
                                                </div>
                                                <div style={{ height: '9px', backgroundColor: '#1e2c42', borderRadius: '5px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.max(prob, 8)}%`, height: '100%', backgroundColor: stageColor, borderRadius: '5px', transition: 'width 0.4s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CÁC TAB CHỨC NĂNG */}
                {activeTab === 'customers' && <CustomerManagement />}
                {activeTab === 'products' && <ProductManagement />}

                {/* CÁC TAB YÊU CẦU QUYỀN QUẢN TRỊ */}
                {activeTab === 'custom-fields' && (isAdmin ? <CustomFieldSettings /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'pipeline-config' && (isAdmin ? <PipelineConfigManagement /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'deal-reasons' && (isAdmin ? <DealReasonsAndCompetitors /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'users' && (isAdmin ? <UserManagement /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'org-tree' && (isAdmin ? <SalesOrgTree /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'categories' && (isAdmin ? <CategoryManagement /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
                {activeTab === 'audit-logs' && (isAdmin ? <AuditLogManagement /> : <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>⛔ Bạn không có quyền truy cập chức năng này!</div>)}
            </main>

            {/* MODAL 1: ĐĂNG XUẤT */}
            {showLogoutModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '400px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '38px', marginBottom: '10px' }}>🚪</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ffffff' }}>Xác Nhận Đăng Xuất</h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '13.5px', color: '#8b9bb4' }}>Bạn có chắc chắn muốn đăng xuất không?</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setShowLogoutModal(false)} style={{ padding: '9px 20px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Không</button>
                            <button onClick={handleConfirmLogout} style={{ padding: '9px 24px', backgroundColor: '#da3633', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>Có</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: CHỈNH SỬA HỒ SƠ */}
            {showProfileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '16px', width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>✏️ Chỉnh Sửa Trang Cá Nhân</h3>
                            <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleSaveProfile}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#0f1726', borderRadius: '12px', border: '1px solid #1e2c42' }}>
                                {profileAvatar && !avatarLoadError ? (
                                    <img src={getAvatarSrc(profileAvatar)} alt="Avatar" onError={() => setAvatarLoadError(true)} style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #ff5e00', marginBottom: '10px' }} />
                                ) : (
                                    <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#ff5e00', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px', marginBottom: '10px' }}>
                                        {(profileName || user.name || user.full_name) ? (profileName || user.name || user.full_name).charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}

                                <button type="button" onClick={() => setIsChangingAvatar(!isChangingAvatar)} style={{ padding: '6px 14px', backgroundColor: '#212d42', color: '#58a6ff', border: '1px solid #324461', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    📷 {isChangingAvatar ? 'Thu gọn tùy chọn đổi ảnh' : 'Đổi ảnh đại diện'}
                                </button>

                                {isChangingAvatar && (
                                    <div style={{ width: '100%', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #27374f' }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                            <button type="button" onClick={() => setAvatarMode('url')} style={{ flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer', backgroundColor: avatarMode === 'url' ? '#ff5e00' : '#1e2c42', color: '#fff', border: 'none', fontWeight: avatarMode === 'url' ? 'bold' : 'normal' }}>
                                                1. Nhập URL ảnh
                                            </button>
                                            <button type="button" onClick={() => setAvatarMode('upload')} style={{ flex: 1, padding: '6px', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer', backgroundColor: avatarMode === 'upload' ? '#ff5e00' : '#1e2c42', color: '#fff', border: 'none', fontWeight: avatarMode === 'upload' ? 'bold' : 'normal' }}>
                                                2. Tải ảnh (&lt; 2MB)
                                            </button>
                                        </div>

                                        {avatarMode === 'url' ? (
                                            <input type="text" placeholder="https://example.com/avatar.png" value={profileAvatar} onChange={(e) => { setProfileAvatar(e.target.value); setAvatarLoadError(false); }} style={{ width: '100%', padding: '8px 10px', backgroundColor: '#162235', border: '1px solid #304261', borderRadius: '6px', color: '#fff', fontSize: '12.5px', boxSizing: 'border-box' }} />
                                        ) : (
                                            <div>
                                                <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleAvatarFileUpload} style={{ width: '100%', padding: '6px', backgroundColor: '#162235', border: '1px solid #304261', borderRadius: '6px', color: '#8b9bb4', fontSize: '12px', boxSizing: 'border-box' }} />
                                                <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '4px' }}>* Định dạng JPG/PNG tối đa 2MB (AC S2-03).</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12.5px', color: '#8b9bb4' }}>Tên hiện tại: <strong style={{ color: '#58a6ff' }}>{user.name || user.full_name || 'Quang Dũng'}</strong></label>
                                <input type="text" required placeholder="Nhập họ và tên..." value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ width: '100%', marginTop: '6px', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Số điện thoại (Việt Nam) *</label>
                                <input type="text" placeholder="VD: 0912345678" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Chữ ký Email</label>
                                <textarea rows="2" placeholder="Trân trọng, [Họ tên] - Phòng Kinh Doanh..." value={profileSignature} onChange={(e) => setProfileSignature(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }} />
                            </div>

                            <div style={{ marginBottom: '20px', padding: '10px 12px', backgroundColor: '#0d131f', borderRadius: '8px', border: '1px solid #1c2738', fontSize: '12px', color: '#8b9bb4' }}>
                                <div>🔒 Email: <strong style={{ color: '#c9d1d9' }}>{user.email}</strong> (Cố định)</div>
                                <div style={{ marginTop: '4px' }}>🔒 Vai trò: <strong style={{ color: '#c9d1d9' }}>{user.role_name || (isAdmin ? 'Director' : 'Sales Executive')}</strong></div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowProfileModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 22px', backgroundColor: '#ff5e00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Thay Đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: ĐỔI MẬT KHẨU CÓ DI CHUỘT XEM MẬT KHẨU */}
            {showPasswordModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '430px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>🔒 Đổi Mật Khẩu</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mật khẩu hiện tại *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showOldPass ? 'text' : 'password'}
                                        required
                                        placeholder="Nhập mật khẩu đang dùng..."
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        style={{ width: '100%', padding: '9px 38px 9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    <span
                                        className="eye-hover-icon"
                                        onMouseEnter={() => setShowOldPass(true)}
                                        onMouseLeave={() => setShowOldPass(false)}
                                        title="Rê chuột để xem"
                                    >
                                        {showOldPass ? '👁️' : '🙈'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mật khẩu mới *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNewPass ? 'text' : 'password'}
                                        required
                                        placeholder="Tối thiểu 8 ký tự, có chữ và số..."
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        style={{ width: '100%', padding: '9px 38px 9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                    <span
                                        className="eye-hover-icon"
                                        onMouseEnter={() => setShowNewPass(true)}
                                        onMouseLeave={() => setShowNewPass(false)}
                                        title="Rê chuột để xem"
                                    >
                                        {showNewPass ? '👁️' : '🙈'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Xác nhận mật khẩu mới *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPass ? 'text' : 'password'}
                                        required
                                        placeholder="Nhập lại mật khẩu mới..."
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '9px 38px 9px 12px', 
                                            backgroundColor: '#0f1726', 
                                            border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? '#f85149' : '#27374f'}`, 
                                            borderRadius: '8px', 
                                            color: '#fff', 
                                            fontSize: '14px', 
                                            boxSizing: 'border-box' 
                                        }}
                                    />
                                    <span
                                        className="eye-hover-icon"
                                        onMouseEnter={() => setShowConfirmPass(true)}
                                        onMouseLeave={() => setShowConfirmPass(false)}
                                        title="Rê chuột để xem"
                                    >
                                        {showConfirmPass ? '👁️' : '🙈'}
                                    </span>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <div style={{ fontSize: '11.5px', color: '#f85149', marginTop: '5px' }}>
                                        Mật khẩu xác nhận chưa trùng khớp!
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Xác Nhận Đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;