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
// Lấy số khách hàng của nhân viên cần bàn giao
export const fetchUserCustomerCount = async (userId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/${userId}/customers-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

// Khóa tài khoản và bàn giao dữ liệu (S1-10)
export const lockUserAccount = async (userId, receiverId, reason) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/${userId}/lock`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiver_id: receiverId, reason })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Lỗi khi khóa tài khoản');
    return data;
};
// ==========================================
// S2-01: CÁC HÀM IMPORT NGƯỜI DÙNG BẰNG EXCEL
// ==========================================

// 1. Tải tệp Excel mẫu chuẩn
export const downloadUserTemplate = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/import/template`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Không thể tải file mẫu!');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mau_Import_Nhan_Su.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// 2. Tải file Excel lên để xem trước và kiểm tra lỗi từng dòng
export const previewUserExcel = async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/users/import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Lỗi khi đọc file Excel!');
    return data;
};

// 3. Thực thi nhập các dòng hợp lệ vào cơ sở dữ liệu
export const executeUserImport = async (usersToImport) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/users/import/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ usersToImport })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Lỗi khi thực thi nhập dữ liệu!');
    return data;
};