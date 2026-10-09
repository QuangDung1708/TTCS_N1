// Bảng ma trận số hóa chính xác 100% từ tài liệu (F: Full, W: Write, R: Read, N: None)
// Dấu * (Owner/Group Scope) sẽ được xử lý riêng tại tầng Database Query.
const ROLE_MATRIX = {
    'CATEGORY': { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'R', 'Sales Rep': 'R', 'Marketing': 'R', 'Cust. Success': 'R', 'Accountant': 'R' },
    'CUSTOMER': { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'F', 'Sales Rep': 'W*', 'Marketing': 'W', 'Cust. Success': 'W*', 'Accountant': 'R' },
    'LEAD':     { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'F', 'Sales Rep': 'W*', 'Marketing': 'F', 'Cust. Success': 'N', 'Accountant': 'N' },
    'DEAL':     { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'F', 'Sales Rep': 'W*', 'Marketing': 'R', 'Cust. Success': 'R*', 'Accountant': 'R' },
    'ACTIVITY': { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'F', 'Sales Rep': 'W*', 'Marketing': 'W', 'Cust. Success': 'W*', 'Accountant': 'N' },
    'QUOTE':    { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'W*', 'Sales Rep': 'W*', 'Marketing': 'N', 'Cust. Success': 'R*', 'Accountant': 'W' },
    'KPI':      { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'W*', 'Sales Rep': 'R*', 'Marketing': 'N', 'Cust. Success': 'N', 'Accountant': 'R' },
    'REPORT':   { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'R*', 'Sales Rep': 'R*', 'Marketing': 'R*', 'Cust. Success': 'R*', 'Accountant': 'R' },
    'AUTO':     { 'Admin': 'F', 'Director': 'F', 'Team Lead': 'R', 'Sales Rep': 'R', 'Marketing': 'W', 'Cust. Success': 'R', 'Accountant': 'N' },
    'USER_LOG': { 'Admin': 'F', 'Director': 'R', 'Team Lead': 'N', 'Sales Rep': 'N', 'Marketing': 'N', 'Cust. Success': 'N', 'Accountant': 'N' }
};

module.exports = ROLE_MATRIX;