/**
 * Middleware tự động tính toán điều kiện lọc SQL dựa trên data_scope của User
 * Áp dụng cho: Khách hàng (customers), Cơ hội (deals), Báo giá (quotes)...
 */
const buildDataScope = (options = { userField: 'created_by', groupField: 'group_id' }) => {
    return (req, res, next) => {
        const { data_scope, group_id, id } = req.user;

        // Mặc định cho Giám đốc / Admin (ALL): Thấy toàn bộ, không thêm điều kiện chặn
        let sqlFilter = ' 1=1 ';
        let filterParams = [];

        switch (data_scope) {
            case 'ALL':
                break;

            case 'GROUP':
                // Trưởng nhóm: Xem khách hàng thuộc nhóm của mình
                if (!group_id) {
                    return res.status(403).json({
                        message: 'Tài khoản trưởng nhóm chưa được gán vào nhóm kinh doanh nào!'
                    });
                }
                sqlFilter = ` ${options.groupField} = ? `;
                filterParams.push(group_id);
                break;

            case 'OWN':
            default:
                // Nhân viên kinh doanh: Chỉ xem khách hàng do mình tạo ra
                sqlFilter = ` ${options.userField} = ? `;
                filterParams.push(id);
                break;
        }

        // Gắn điều kiện đã sinh vào req để Controller sử dụng
        req.dataScope = {
            sqlFilter,
            filterParams,
            scope: data_scope
        };

        next();
    };
};

/**
 * Hàm kiểm tra quyền khi xem chi tiết 1 bản ghi đơn lẻ
 * Trả về thông báo tiếng Việt nếu người dùng cố tình truy cập trái phép ngoài phạm vi
 */
const checkRecordAccess = (user, record, options = { userField: 'created_by', groupField: 'group_id' }) => {
    if (user.data_scope === 'ALL') return { allowed: true };

    if (user.data_scope === 'GROUP') {
        if (record[options.groupField] === user.group_id) return { allowed: true };
        return {
            allowed: false,
            message: 'Từ chối truy cập: Bản ghi này thuộc nhóm kinh doanh khác, bạn không có quyền xem!'
        };
    }

    if (user.data_scope === 'OWN') {
        if (record[options.userField] === user.id) return { allowed: true };
        return {
            allowed: false,
            message: 'Từ chối truy cập: Đây là dữ liệu riêng của nhân viên khác, bạn không có quyền xem!'
        };
    }

    return { allowed: false, message: 'Bạn không có quyền truy cập dữ liệu này!' };
};

module.exports = { buildDataScope, checkRecordAccess };