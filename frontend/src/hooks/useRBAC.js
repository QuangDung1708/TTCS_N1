import { useState, useEffect } from 'react';

// Ma trận quyền Module áp dụng vào Menu
const RBAC_MODULE_MATRIX = {
    'CUSTOMERS': { 'Sales Rep': 'W*', 'Marketing': 'W', 'Cust. Success': 'W*', 'Accountant': 'R', 'Team Lead': 'F', 'Director': 'F', 'Admin': 'F' },
    'LEADS': { 'Sales Rep': 'W*', 'Marketing': 'F', 'Cust. Success': '—', 'Accountant': '—', 'Team Lead': 'F', 'Director': 'F', 'Admin': 'F' },
    'PIPELINES': { 'Sales Rep': 'W*', 'Marketing': 'R', 'Cust. Success': 'R*', 'Accountant': 'R', 'Team Lead': 'F', 'Director': 'F', 'Admin': 'F' },
    'PRODUCTS': { 'Sales Rep': 'R', 'Marketing': 'R', 'Cust. Success': 'R', 'Accountant': 'R', 'Team Lead': 'R', 'Director': 'F', 'Admin': 'F' },
    'CATEGORIES': { 'Sales Rep': 'R', 'Marketing': 'R', 'Cust. Success': 'R', 'Accountant': 'R', 'Team Lead': 'R', 'Director': 'F', 'Admin': 'F' },
    'SALES_ORG': { 'Sales Rep': '—', 'Marketing': '—', 'Cust. Success': '—', 'Accountant': '—', 'Team Lead': 'R', 'Director': 'F', 'Admin': 'F' },
    'USERS': { 'Sales Rep': '—', 'Marketing': '—', 'Cust. Success': '—', 'Accountant': '—', 'Team Lead': '—', 'Director': 'R', 'Admin': 'F' },
    'AUDIT_LOG': { 'Sales Rep': '—', 'Marketing': '—', 'Cust. Success': '—', 'Accountant': '—', 'Team Lead': '—', 'Director': 'R', 'Admin': 'F' }
};

export const useRBAC = () => {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setRole(user.role_code);
        }
    }, []);

    // Kiểm tra quyền truy cập module
    const canAccess = (moduleName) => {
        if (!role) return false;
        if (role === 'Admin') return true;
        const permission = RBAC_MODULE_MATRIX[moduleName]?.[role];
        return permission && permission !== '—';
    };

    return { role, canAccess };
};