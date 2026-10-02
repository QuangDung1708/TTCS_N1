import React, { useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Modal, Space, Card, Typography } from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const AuditLogPage = () => {
    const [searchText, setSearchText] = useState('');
    const [selectedObjectType, setSelectedObjectType] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentDiff, setCurrentDiff] = useState(null);

    // Dữ liệu mẫu (mock data) cho nhật ký thay đổi
    const dataSource = [
        {
            key: '1',
            timestamp: '2026-10-01 14:30:22',
            username: 'Nguyen Van A',
            action: 'UPDATE',
            objectType: 'ROOM',
            objectId: 'P-102',
            oldData: { status: 'Available', price: 500000 },
            newData: { status: 'Booked', price: 550000 },
        },
        {
            key: '2',
            timestamp: '2026-10-01 15:10:05',
            username: 'Tran Thi B',
            action: 'CREATE',
            objectType: 'CUSTOMER',
            objectId: 'KH-889',
            oldData: null,
            newData: { name: 'Le Van C', phone: '0987654321' },
        },
    ];

    const handleViewDiff = (record) => {
        setCurrentDiff(record);
        setIsModalVisible(true);
    };

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'timestamp',
            key: 'timestamp',
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        },
        {
            title: 'Người dùng',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            key: 'action',
            render: (action) => (
                <span style={{ color: action === 'CREATE' ? 'green' : action === 'UPDATE' ? 'blue' : 'red', fontWeight: 'bold' }}>
                    {action}
                </span>
            ),
        },
        {
            title: 'Loại đối tượng',
            dataIndex: 'objectType',
            key: 'objectType',
        },
        {
            title: 'Mã đối tượng',
            dataIndex: 'objectId',
            key: 'objectId',
        },
        {
            title: 'Thao tác',
            key: 'actionBtn',
            render: (_, record) => (
                <Button icon={<EyeOutlined />} onClick={() => handleViewDiff(record)}>
                    Xem Diff
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={3}>Nhật ký hệ thống (Audit Log)</Title>

            {/* Khu vực Bộ lọc (Filters) */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap size="middle">
                    <Input
                        placeholder="Tìm theo người dùng..."
                        prefix={<SearchOutlined />}
                        style={{ width: 220 }}
                        allowClear
                    />
                    <Select
                        placeholder="Chọn loại đối tượng"
                        style={{ width: 180 }}
                        allowClear
                        options={[
                            { value: 'ROOM', label: 'Phòng (Room)' },
                            { value: 'CUSTOMER', label: 'Khách hàng (Customer)' },
                            { value: 'BOOKING', label: 'Đặt phòng (Booking)' },
                        ]}
                    />
                    <RangePicker showTime />
                    <Button type="primary" icon={<SearchOutlined />}>Lọc</Button>
                    <Button icon={<ReloadOutlined />}>Đặt lại</Button>
                </Space>
            </Card>

            {/* Bảng dữ liệu chính */}
            <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 5 }} />

            {/* Modal Diff-view xem chi tiết thay đổi */}
            <Modal
                title={`Chi tiết thay đổi - ${currentDiff?.objectId || ''}`}
                open={isModalVisible}
                onOk={() => setIsModalVisible(false)}
                onCancel={() => setIsModalVisible(false)}
                width={700}
            >
                {currentDiff && (
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1, background: '#fff1f0', padding: '12px', borderRadius: '6px' }}>
                            <h4>Dữ liệu cũ (Old Data)</h4>
                            <pre>{JSON.stringify(currentDiff.oldData, null, 2)}</pre>
                        </div>
                        <div style={{ flex: 1, background: '#f6ffed', padding: '12px', borderRadius: '6px' }}>
                            <h4>Dữ liệu mới (New Data)</h4>
                            <pre>{JSON.stringify(currentDiff.newData, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AuditLogPage;