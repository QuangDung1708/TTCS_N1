const BASE_URL = 'http://localhost:5001/api';

// ==========================================
// 1. CÁC HÀM XÁC THỰC (AUTH)
// ==========================================
export const login = async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Đăng nhập thất bại');
    return data;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Đổi mật khẩu thất bại');
    return data;
};

export const forgotPassword = async (email) => {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    return response.json();
};

export const resetPassword = async (token, newPassword) => {
    const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
    return data;
};

// ==========================================
// 2. CÁC HÀM QUẢN LÝ NGƯỜI DÙNG (S1-06)
// ==========================================
export const fetchUserMeta = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/meta/options`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const fetchUsers = async ({ page = 1, limit = 20, search = '', role_id = '', status = '' }) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ page, limit, search, role_id, status });
    const response = await fetch(`${BASE_URL}/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const createUser = async (userData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Lỗi khi tạo tài khoản');
    return data;
};

export const updateUser = async (id, userData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Lỗi khi cập nhật tài khoản');
    return data;
};