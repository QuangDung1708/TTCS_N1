import React, { useState, useEffect } from 'react';
import { 
    Table, Card, Row, Col, Typography, Select, 
    DatePicker, Button, Tag, Space, notification 
} from 'antd';
import { 
    HistoryOutlined, ReloadOutlined, ClearOutlined, 
    KeyOutlined, PercentageOutlined, TrophyOutlined, 
    SwapOutlined, FileExcelOutlined, UserOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AuditLogManagement() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [entityType, setEntityType] = useState('ALL');
    const [dateRange, setDateRange] = useState(null);

    const [api, contextHolder] = notification.useNotification();

    // 1. Tải danh sách nhật ký có bộ lọc (AC S2-04 - AC 3)
  const fetchLogs = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        let url = `http://localhost:5001/api/audit-logs?entity_type=${entityType || 'ALL'}`;
        
        if (dateRange && dateRange[0] && dateRange[1]) {
            url += `&from_date=${dateRange[0].format('YYYY-MM-DD')}&to_date=${dateRange[1].format('YYYY-MM-DD')}`;
        }

        const res = await axios.get(url, { 
            headers: { Authorization: `Bearer ${token}` } 
        });
        setLogs(res.data.data || []);
    } catch (err) {
        api.error({ message: 'Lỗi tải nhật ký', description: 'Không thể kết nối đến máy chủ!' });
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        fetchLogs();
    }, [entityType, dateRange]);

    const handleClearFilter = () => {
        setEntityType('ALL');
        setDateRange(null);
    };

    const actionTagConfig = {
        ROLE_CHANGE: { label: 'Phân quyền vai trò', color: 'purple', icon: <KeyOutlined /> },
        DISCOUNT_CHANGE: { label: 'Sửa chiết khấu', color: 'red', icon: <PercentageOutlined /> },
        TARGET_UPDATE: { label: 'Sửa chỉ tiêu', color: 'green', icon: <TrophyOutlined /> },
        HANDOVER: { label: 'Bàn giao dữ liệu', color: 'orange', icon: <SwapOutlined /> },
        IMPORT_USERS: { label: 'Nhập Excel', color: 'blue', icon: <FileExcelOutlined /> }
    };

    const columns = [
        {
            title: 'Thời Điểm',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: (date) => (
                <Text style={{ fontSize: 13, color: '#475569' }}>
                    {dayjs(date).format('DD/MM/YYYY HH:mm')}
                </Text>
            )
        },
        {
            title: 'Người Thực Hiện',
            dataIndex: 'user_name',
            key: 'user_name',
            width: 190,
            render: (name) => (
                <Space>
                    <UserOutlined style={{ color: '#1677ff' }} />
                    <Text strong style={{ color: '#0f172a' }}>{name}</Text>
                </Space>
            )
        },
        {
            title: 'Hành Động',
            dataIndex: 'action_type',
            key: 'action_type',
            width: 180,
            render: (action) => {
                const conf = actionTagConfig[action] || { label: action, color: 'default' };
                return <Tag color={conf.color} icon={conf.icon} style={{ fontWeight: 600 }}>{conf.label}</Tag>;
            }
        },
        {
            title: 'Loại Đối Tượng',
            dataIndex: 'entity_type',
            key: 'entity_type',
            width: 180,
            render: (t) => <Tag color="geekblue">{t}</Tag>
        },
        {
            title: 'Giá Trị Trước ➔ Sau',
            key: 'before_after',
            width: 280,
            render: (_, record) => {
                if (!record.before_value && !record.after_value) return <Text type="secondary">—</Text>;
                return (
                    <div style={{ fontSize: 12 }}>
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                            {record.before_value}
                        </span>
                        <span style={{ margin: '0 6px', color: '#1677ff', fontWeight: 'bold' }}>➔</span>
                        <span style={{ fontWeight: 600, color: '#059669' }}>
                            {record.after_value}
                        </span>
                    </div>
                );
            }
        },
        {
            title: 'Nội Dung Chi Tiết Thay Đổi (Văn Bản Cụ Thể)',
            dataIndex: 'description',
            key: 'description',
            render: (desc) => <Text style={{ color: '#1e293b' }}>{desc}</Text>
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER - GIAO DIỆN LIGHT MODE CHUẨN ĐỒNG BỘ */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                            <HistoryOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                            Nhật Ký Thay Đổi Dữ Liệu Nhạy Cảm 
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Theo dõi toàn bộ lịch sử can thiệp vào chiết khấu, chỉ tiêu KPI, phân quyền vai trò và bàn giao dữ liệu.
                        </Paragraph>
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
                            Làm mới
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* BỘ LỌC TÌM KIẾM THEO ĐỐI TƯỢNG VÀ THỜI GIAN (AC S2-04 - AC 3) */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row gutter={16} align="middle">
                    <Col xs={24} sm={8}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: '#475569' }}>
                            Loại đối tượng nhạy cảm:
                        </Text>
                        <Select 
                            value={entityType} 
                            onChange={v => setEntityType(v)} 
                            style={{ width: '100%' }}
                        >
                            <Select.Option value="ALL">Tất cả đối tượng</Select.Option>
                            <Select.Option value="Vai trò người dùng">Vai trò người dùng</Select.Option>
                            <Select.Option value="Chiết khấu Deal">Chiết khấu Deal</Select.Option>
                            <Select.Option value="Chỉ tiêu doanh số">Chỉ tiêu doanh số (KPI)</Select.Option>
                            <Select.Option value="Quyền sở hữu KH">Quyền sở hữu khách hàng</Select.Option>
                            <Select.Option value="Nhập liệu hệ thống">Nhập liệu hàng loạt</Select.Option>
                        </Select>
                    </Col>

                    <Col xs={24} sm={10}>
                        <Text strong style={{ display: 'block', marginBottom: 4, color: '#475569' }}>
                            Khoảng thời gian:
                        </Text>
                        <RangePicker 
                            value={dateRange} 
                            onChange={dates => setDateRange(dates)} 
                            format="DD/MM/YYYY" 
                            style={{ width: '100%' }} 
                        />
                    </Col>

                    <Col xs={24} sm={6} style={{ marginTop: 22 }}>
                        <Button icon={<ClearOutlined />} onClick={handleClearFilter}>
                            Xóa bộ lọc
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG LIGHT MODE ĐẦY ĐỦ THÔNG TIN */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showTotal: t => `Tổng cộng ${t} sự kiện thay đổi` }}
                    bordered
                />
            </Card>
        </div>
    );
}