// Cấu hình Data Scope cho từng Role trên từng Module
// F = Full (ALL), T = Team (TEAM), O = Own (OWN), R = Read Only, N = None
const PERMISSION_MATRIX = {
    CUSTOMER: {
        ADMIN: { read: 'F', write: 'F', delete: 'F' },
        DIRECTOR: { read: 'F', write: 'F', delete: 'F' },
        TEAM_LEAD: { read: 'T', write: 'T', delete: 'N' },
        SALES: { read: 'O', write: 'O', delete: 'N' },
        MARKETING: { read: 'F', write: 'F', delete: 'N' },
        CS: { read: 'F', write: 'O', delete: 'N' },
        ACCOUNTANT: { read: 'F', write: 'N', delete: 'N' }
    },
    // Thêm các module khác: OPPORTUNITY, ACTIVITY, USER...
};

module.exports = PERMISSION_MATRIX;