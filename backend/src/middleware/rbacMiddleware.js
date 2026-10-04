const { getSubtreeGroupIds } = require('../utils/groupTree');

/**
 * Middleware tự động tính toán điều kiện lọc SQL dựa trên data_scope của User
 * Áp dụng cho: Khách hàng (customers), Cơ hội (deals), Báo giá (quotes)...
 * Đã cập nhật S2-06: Trưởng nhóm cấp trên được xem dữ liệu của toàn bộ nhóm con trực thuộc trong nhánh cây
 */
const buildDataScope = (options = { userField: 'created_by', groupField: 'group_id' }) => {
    return async (req, res, next) => {
        try {
            const { data_scope, group_id, id } = req.user;

            // Mặc định cho Giám đốc / Admin (ALL): Thấy toàn bộ, không thêm điều kiện chặn
            let sqlFilter = ' 1=1 ';
            let filterParams = [];
            let allowedGroupIds = [];

            switch (data_scope) {
                case 'ALL':
                    break;

                case 'GROUP':
                    // Trưởng nhóm: Xem dữ liệu nhóm của mình và toàn bộ nhóm con trực thuộc trong nhánh cây
                    if (!group_id) {
                        return res.status(403).json({
                            message: 'Tài khoản trưởng nhóm chưa được gán vào nhóm kinh doanh nào!'
                        });
                    }
                    allowedGroupIds = await getSubtreeGroupIds(group_id);
                    if (allowedGroupIds.length === 1) {
                        sqlFilter = ` ${options.groupField} = ? `;
                        filterParams.push(allowedGroupIds[0]);
                    } else if (allowedGroupIds.length > 1) {
                        const placeholders = allowedGroupIds.map(() => '?').join(', ');
                        sqlFilter = ` ${options.groupField} IN (${placeholders}) `;
                        filterParams.push(...allowedGroupIds);
                    } else {
                        sqlFilter = ` ${options.groupField} = ? `;
                        filterParams.push(group_id);
                    }
                    break;

                case 'OWN':
                default:
                    // Nhân viên kinh doanh: Chỉ xem khách hàng do mình tạo ra
                    sqlFilter = ` ${options.userField} = ? `;
                    filterParams.push(id);
                    break;
            }

            // Gán danh sách nhóm được phép vào user để tái sử dụng
            req.user.allowedGroupIds = allowedGroupIds;

            // Gắn điều kiện đã sinh vào req để Controller sử dụng
            req.dataScope = {
                sqlFilter,
                filterParams,
                scope: data_scope,
                allowedGroupIds
            };

            next();
        } catch (error) {
            console.error('Lỗi tính toán Data Scope:', error);
            return res.status(500).json({ message: 'Lỗi server khi tính toán phạm vi dữ liệu!' });
        }
    };
};

/**
 * Hàm kiểm tra quyền khi xem chi tiết 1 bản ghi đơn lẻ
 * Trả về thông báo tiếng Việt nếu người dùng cố tình truy cập trái phép ngoài phạm vi
 */
const checkRecordAccess = async (user, record, options = { userField: 'created_by', groupField: 'group_id' }) => {
    if (user.data_scope === 'ALL') return { allowed: true };

    if (user.data_scope === 'GROUP') {
        if (!user.group_id) {
            return {
                allowed: false,
                message: 'Tài khoản trưởng nhóm chưa được gán vào nhóm kinh doanh nào!'
            };
        }
        let allowedGroupIds = user.allowedGroupIds;
        if (!allowedGroupIds || allowedGroupIds.length === 0) {
            allowedGroupIds = await getSubtreeGroupIds(user.group_id);
        }
        if (allowedGroupIds.includes(record[options.groupField])) return { allowed: true };
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