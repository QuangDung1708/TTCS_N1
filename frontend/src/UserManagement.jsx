import React, { useState, useEffect } from 'react';
import { fetchUsers, fetchUserMeta, createUser, updateUser } from './api';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ roles: [], groups: [] });

    // Bộ lọc & phân trang (mặc định 20 dòng)
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ email: '', full_name: '', role_id: '', group_id: '' });
    const [editData, setEditData] = useState({ full_name: '', role_id: '', group_id: '', status: '' });
    const [notification, setNotification] = useState({ type: '', message: '' });

    // Tải danh mục Metadata (Roles & Groups)
    useEffect(() => {
        fetchUserMeta().then(res => {
            if (res.roles) setMeta(res);
        }).catch(err => console.error(err));
    }, []);

    // Tải danh sách người dùng khi bộ lọc hoặc trang thay đổi
    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetchUsers({
                page,
                limit,
                search,
                role_id: roleFilter,
                status: statusFilter
            });
            if (res.data) {
                setUsers(res.data);
                setPagination(res.pagination);
            }
        } catch (err) {
            showToast('error', 'Không thể tải danh sách người dùng!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [page, roleFilter, statusFilter]);

    const showToast = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ type: '', message: '' }), 5000);
    };

    // Xử lý Tìm kiếm
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        loadUsers();
    };

    // Xử lý Tạo tài khoản
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await createUser(formData);
            showToast('success', `${res.message} (Mật khẩu tạm: ${res.tempPassword})`);
            setShowCreateModal(false);
            setFormData({ email: '', full_name: '', role_id: '', group_id: '' });
            setPage(1);
            loadUsers();
        } catch (err) {
            showToast('error', err.message);
        }
    };

    // Mở Modal Sửa
    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditData({
            full_name: user.full_name,
            role_id: user.role_id,
            group_id: user.group_id || '',
            status: user.status || 'ACTIVE'
        });
        setShowEditModal(true);
    };

    // Xử lý Cập nhật tài khoản
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUser(selectedUser.id, editData);
            showToast('success', 'Cập nhật tài khoản thành công!');
            setShowEditModal(false);
            loadUsers();
        } catch (err) {
            showToast('error', err.message);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Thanh tiêu đề */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
                        Quản Lý Tài Khoản Người Dùng
                    </h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
                        Cấp quyền, phân nhóm và quản trị trạng thái truy cập của nhân viên
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                        backgroundColor: '#ff6b00',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    + Tạo Tài Khoản Mới
                </button>
            </div>

            {/* Thông báo thông tin (Toast/Alert) */}
            {notification.message && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    backgroundColor: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: notification.type === 'error' ? '#991b1b' : '#166534',
                    border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                }}>
                    {notification.message}
                </div>
            )}

            {/* Khu vực Tìm kiếm & Bộ lọc */}
            <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px' }}>
                    <input
                        type="text"
                        placeholder="Tìm theo tên, email, nhóm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0f172a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Tìm
                    </button>
                </form>

                {/* Lọc theo Vai trò */}
                <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                    <option value="">-- Tất cả vai trò --</option>
                    {meta.roles.map(r => (
                        <option key={r.id} value={r.id}>{r.role_name} ({r.data_scope})</option>
                    ))}
                </select>

                {/* Lọc theo Trạng thái */}
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                    <option value="">-- Tất cả trạng thái --</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                </select>

                {(search || roleFilter || statusFilter) && (
                    <button
                        onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}
                        style={{ padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Xóa lọc
                    </button>
                )}
            </div>

            {/* Bảng dữ liệu người dùng */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <tr>
                            <th style={{ padding: '12px 16px' }}>#</th>
                            <th style={{ padding: '12px 16px' }}>Họ và tên</th>
                            <th style={{ padding: '12px 16px' }}>Email</th>
                            <th style={{ padding: '12px 16px' }}>Vai trò</th>
                            <th style={{ padding: '12px 16px' }}>Nhóm</th>
                            <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Không có tài khoản nào phù hợp</td></tr>
                        ) : (
                            users.map((u, index) => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{(page - 1) * limit + index + 1}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{u.full_name}</td>
                                    <td style={{ padding: '12px 16px', color: '#475569' }}>{u.email}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            backgroundColor: u.role_id === 1 ? '#fef3c7' : u.role_id === 2 ? '#e0e7ff' : '#f1f5f9',
                                            color: u.role_id === 1 ? '#b45309' : u.role_id === 2 ? '#3730a3' : '#334155'
                                        }}>
                                            {u.role_name || `Role #${u.role_id}`}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#475569' }}>{u.group_name || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            backgroundColor: u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                                            color: u.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                                        }}>
                                            {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Bị khóa' : 'Ngừng'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => openEditModal(u)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px'
                                            }}
                                        >
                                            Chỉnh sửa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Phân trang (Mặc định 20 dòng) */}
                <div style={{
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '14px',
                    color: '#64748b'
                }}>
                    <span>Tổng số: <strong>{pagination.total}</strong> người dùng (Hiển thị 20/trang)</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                backgroundColor: page <= 1 ? '#f8fafc' : '#fff',
                                cursor: page <= 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Trang trước
                        </button>
                        <span>Trang {page} / {pagination.totalPages || 1}</span>
                        <button
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                backgroundColor: page >= pagination.totalPages ? '#f8fafc' : '#fff',
                                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Trang sau
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal 1: Tạo Tài Khoản Mới */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px' }}>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Tạo Tài Khoản Nhân Viên Mới</h2>
                        <form onSubmit={handleCreateSubmit}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Họ và tên *</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Nguyễn Văn A"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Email đăng nhập *</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="nhanvien@congty.com"
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Vai trò hệ thống *</label>
                                <select
                                    required
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                >
                                    <option value="">-- Chọn vai trò --</option>
                                    {meta.roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.role_name} (Scope: {r.data_scope})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Nhóm kinh doanh</label>
                                <select
                                    value={formData.group_id}
                                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                >
                                    <option value="">-- Trực thuộc công ty (Không thuộc nhóm) --</option>
                                    {meta.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 18px', background: '#ff6b00', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Tạo & Gửi Mật Khẩu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Chỉnh Sửa Thông Tin & Trạng Thái */}
            {showEditModal && selectedUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px' }}>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Cập Nhật Tài Khoản ({selectedUser.email})</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Họ và tên</label>
                                <input
                                    type="text"
                                    value={editData.full_name}
                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Vai trò</label>
                                <select
                                    value={editData.role_id}
                                    onChange={(e) => setEditData({ ...editData, role_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                >
                                    {meta.roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.role_name} (Scope: {r.data_scope})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Nhóm kinh doanh</label>
                                <select
                                    value={editData.group_id}
                                    onChange={(e) => setEditData({ ...editData, group_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                >
                                    <option value="">-- Trực thuộc công ty --</option>
                                    {meta.groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Trạng thái tài khoản</label>
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                >
                                    <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                                    <option value="LOCKED">Tạm thời khóa (LOCKED)</option>
                                    <option value="INACTIVE">Ngừng sử dụng (INACTIVE)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Lưu Thay Đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}