import React, { useState, useEffect } from 'react';
import { Popover, Badge, Button, Tag, Typography, List, Divider } from 'antd';
import { 
    BellOutlined, ReloadOutlined, KeyOutlined, 
    PercentageOutlined, TrophyOutlined, SwapOutlined, 
    FileExcelOutlined, ClockCircleOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const getActionMeta = (action) => {
    switch (action) {
        case 'ROLE_CHANGE':
            return { title: 'Thay đổi vai trò người dùng', color: 'purple', icon: <KeyOutlined /> };
        case 'DISCOUNT_CHANGE':
            return { title: 'Điều chỉnh mức chiết khấu', color: 'red', icon: <PercentageOutlined /> };
        case 'TARGET_UPDATE':
            return { title: 'Cập nhật chỉ tiêu doanh số', color: 'green', icon: <TrophyOutlined /> };
        case 'HANDOVER':
            return { title: 'Bàn giao quyền sở hữu dữ liệu', color: 'orange', icon: <SwapOutlined /> };
        case 'IMPORT_USERS':
            return { title: 'Nhập dữ liệu hàng loạt từ Excel', color: 'blue', icon: <FileExcelOutlined /> };
        default:
            return { title: 'Nhật ký thay đổi hệ thống', color: 'default', icon: <BellOutlined /> };
    }
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    // 1. NẠP THÔNG BÁO VÀ CHỈ ĐẾM SỐ THÔNG BÁO CHƯA ĐỌC
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/audit-logs/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const list = res.data.data || [];
            setNotifications(list);

            // Lấy mốc thời gian lần cuối người dùng mở chuông
            const lastSeenTime = Number(localStorage.getItem('crm_last_seen_noti_time') || 0);

            // Chỉ đếm số đỏ đối với thông báo mới hơn thời điểm đã xem
            const unread = list.filter(item => new Date(item.created_at).getTime() > lastSeenTime).length;
            setUnreadCount(unread);
        } catch (_) {}
    };

    // 2. TỰ ĐỘNG CẬP NHẬT MỖI 3 GIÂY (POLLING THỜI GIAN THỰC)
    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 3000);
        return () => clearInterval(intervalId);
    }, []);

    // 3. KHI BẤM MỞ CHUÔNG: ĐÁNH DẤU ĐÃ XEM VÀ XÓA SỐ ĐỎ NGAY LẬP TỨC
    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
            localStorage.setItem('crm_last_seen_noti_time', Date.now().toString());
            setUnreadCount(0); // Số đỏ biến mất ngay
        }
    };

    // 4. KHI BẤM "XEM TOÀN BỘ": TẮT CHUÔNG VÀ CHUYỂN TRANG
    const handleViewAll = () => {
        setOpen(false);
        navigate('/audit-logs');
    };

    const notificationContent = (
        <div style={{ width: 380, maxHeight: 460, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>Nhật Ký Thao Tác Nhạy Cảm</Text>
                <Button size="small" type="link" icon={<ReloadOutlined />} onClick={fetchNotifications}>
                    Làm mới
                </Button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={item => {
                        const meta = getActionMeta(item.action_type);
                        return (
                            <List.Item 
                                style={{ padding: '10px 8px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                                onClick={handleViewAll}
                            >
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <Tag color={meta.color} icon={meta.icon} style={{ margin: 0, fontWeight: 600 }}>
                                            {meta.title}
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            <ClockCircleOutlined style={{ marginRight: 3 }} />
                                            {dayjs(item.created_at).format('HH:mm DD/MM/YYYY')}
                                        </Text>
                                    </div>
                                    <Paragraph style={{ margin: '4px 0 2px', fontSize: 13, color: '#1e293b' }}>
                                        {item.description}
                                    </Paragraph>
                                    {item.before_value && item.after_value && (
                                        <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '3px 6px', borderRadius: 4 }}>
                                            <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{item.before_value}</span>
                                            <span style={{ margin: '0 4px', color: '#1677ff' }}>➔</span>
                                            <span style={{ fontWeight: 600, color: '#059669' }}>{item.after_value}</span>
                                        </div>
                                    )}
                                </div>
                            </List.Item>
                        );
                    }}
                />
            </div>

            <Divider style={{ margin: 0 }} />
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <Button type="link" onClick={handleViewAll} style={{ fontWeight: 600 }}>
                    Xem toàn bộ nhật ký hệ thống
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={notificationContent}
            trigger="click"
            open={open}
            onOpenChange={handleOpenChange}
            placement="bottomRight"
        >
            <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 6]}>
                <Button 
                    type="text" 
                    icon={<BellOutlined style={{ fontSize: 18, color: '#64748b' }} />} 
                    style={{ borderRadius: '50%' }} 
                />
            </Badge>
        </Popover>
    );
}