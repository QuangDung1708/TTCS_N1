import React, { useState } from 'react';
import { 
    Card, 
    Table, 
    Tag, 
    Typography, 
    Space, 
    Tabs, 
    Tooltip, 
    Alert, 
    Badge, 
    Input,
    Row,
    Col
} from 'antd';
import { 
    SafetyCertificateOutlined, 
    TeamOutlined, 
    InfoCircleOutlined, 
    SearchOutlined,
    CheckCircleOutlined,
    EditOutlined,
    EyeOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// 1. DỮ LIỆU 7 VAI TRÒ (Bảng 1 trong tài liệu)
const ROLES_DATA = [
    {
        key: '1',
        stt: 1,
        roleName: 'Nhân viên kinh doanh',
        roleCode: 'Sales Rep',
        badgeColor: 'blue',
        description: 'Người trực tiếp bán hàng, sở hữu một danh mục khách',
        goal: 'Quản lý khách hàng của mình, đẩy cơ hội qua các giai đoạn, ghi nhận hoạt động, soạn báo giá'
    },
    {
        key: '2',
        stt: 2,
        roleName: 'Trưởng nhóm kinh doanh',
        roleCode: 'Team Lead',
        badgeColor: 'cyan',
        description: 'Quản lý một nhóm 5–8 nhân viên',
        goal: 'Theo dõi pipeline của cả nhóm, duyệt chiết khấu trong hạn mức, phân bổ lại lead và cơ hội'
    },
    {
        key: '3',
        stt: 3,
        roleName: 'Giám đốc kinh doanh',
        roleCode: 'Director',
        badgeColor: 'purple',
        description: 'Chủ sở hữu toàn bộ hoạt động kinh doanh',
        goal: 'Xem toàn bộ dữ liệu, duyệt chiết khấu vượt hạn mức, đặt chỉ tiêu, theo dõi dự báo doanh số'
    },
    {
        key: '4',
        stt: 4,
        roleName: 'Nhân viên Marketing',
        roleCode: 'Marketing',
        badgeColor: 'orange',
        description: 'Người tạo ra lead từ các chiến dịch',
        goal: 'Đưa lead vào hệ thống, theo dõi lead của mình đi tới đâu, đo hiệu quả từng nguồn'
    },
    {
        key: '5',
        stt: 5,
        roleName: 'Chăm sóc khách hàng',
        roleCode: 'Cust. Success',
        badgeColor: 'green',
        description: 'Người phụ trách khách sau khi ký hợp đồng',
        goal: 'Xem lịch sử khách hàng, ghi nhận yêu cầu hỗ trợ, cảnh báo khách có rủi ro rời bỏ'
    },
    {
        key: '6',
        stt: 6,
        roleName: 'Kế toán',
        roleCode: 'Accountant',
        badgeColor: 'gold',
        description: 'Người theo dõi hợp đồng và thanh toán',
        goal: 'Xác nhận giá trị hợp đồng đã ký, theo dõi hiệu lực và gia hạn'
    },
    {
        key: '7',
        stt: 7,
        roleName: 'Quản trị hệ thống',
        roleCode: 'Admin',
        badgeColor: 'red',
        description: 'Người vận hành ứng dụng',
        goal: 'Quản lý tài khoản, vai trò, danh mục dùng chung, xem nhật ký hệ thống'
    }
];

// 2. MA TRẬN PHÂN QUYỀN (10 Modules x 7 Roles)
const MATRIX_DATA = [
    { key: '1', module: 'Danh mục & cấu hình bán', salesRep: 'R', marketing: 'R', custSuccess: 'R', accountant: 'R', teamLead: 'R', director: 'F', admin: 'F' },
    { key: '2', module: 'Khách hàng & liên hệ', salesRep: 'W*', marketing: 'W', custSuccess: 'W*', accountant: 'R', teamLead: 'F', director: 'F', admin: 'F' },
    { key: '3', module: 'Lead & phân bổ', salesRep: 'W*', marketing: 'F', custSuccess: '—', accountant: '—', teamLead: 'F', director: 'F', admin: 'F' },
    { key: '4', module: 'Cơ hội & pipeline', salesRep: 'W*', marketing: 'R', custSuccess: 'R*', accountant: 'R', teamLead: 'F', director: 'F', admin: 'F' },
    { key: '5', module: 'Hoạt động & lịch làm việc', salesRep: 'W*', marketing: 'W', custSuccess: 'W*', accountant: '—', teamLead: 'F', director: 'F', admin: 'F' },
    { key: '6', module: 'Báo giá & hợp đồng', salesRep: 'W*', marketing: '—', custSuccess: 'R*', accountant: 'W', teamLead: 'W*', director: 'F', admin: 'F' },
    { key: '7', module: 'Chỉ tiêu & KPI', salesRep: 'R*', marketing: '—', custSuccess: '—', accountant: 'R', teamLead: 'W*', director: 'F', admin: 'F' },
    { key: '8', module: 'Báo cáo & dashboard', salesRep: 'R*', marketing: 'R*', custSuccess: 'R*', accountant: 'R', teamLead: 'R*', director: 'F', admin: 'F' },
    { key: '9', module: 'Tự động hoá & thông báo', salesRep: 'R', marketing: 'W', custSuccess: 'R', accountant: '—', teamLead: 'R', director: 'F', admin: 'F' },
    { key: '10', module: 'Người dùng & nhật ký', salesRep: '—', marketing: '—', custSuccess: '—', accountant: '—', teamLead: '—', director: 'R', admin: 'F' }
];

export default function PermissionMatrix() {
    const [searchText, setSearchText] = useState('');

    // Hiển thị nhãn quyền trực quan
    const renderPermissionTag = (val) => {
        if (!val || val === '—') {
            return <Text type="secondary" style={{ color: '#bfbfbf', fontWeight: 500 }}>—</Text>;
        }

        switch (val) {
            case 'F':
                return (
                    <Tooltip title="Toàn quyền (Full Access)">
                        <Tag color="success" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
                            F
                        </Tag>
                    </Tooltip>
                );
            case 'W':
                return (
                    <Tooltip title="Ghi trong phạm vi được giao (Write Assigned)">
                        <Tag color="processing" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
                            W
                        </Tag>
                    </Tooltip>
                );
            case 'W*':
                return (
                    <Tooltip title="Ghi trên dữ liệu mình sở hữu hoặc nhóm mình quản lý">
                        <Tag color="warning" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
                            W*
                        </Tag>
                    </Tooltip>
                );
            case 'R':
                return (
                    <Tooltip title="Chỉ xem trong phạm vi cho phép (Read Only)">
                        <Tag color="default" style={{ minWidth: 32, textAlign: 'center', fontWeight: 500 }}>
                            R
                        </Tag>
                    </Tooltip>
                );
            case 'R*':
                return (
                    <Tooltip title="Chỉ xem dữ liệu sở hữu hoặc nhóm phụ trách">
                        <Tag color="gold" style={{ minWidth: 32, textAlign: 'center', fontWeight: 500 }}>
                            R*
                        </Tag>
                    </Tooltip>
                );
            default:
                return <Tag>{val}</Tag>;
        }
    };

    const matrixColumns = [
        {
            title: 'Phân Hệ / Module',
            dataIndex: 'module',
            key: 'module',
            fixed: 'left',
            width: 220,
            render: (text) => <Text strong style={{ color: '#1e293b' }}>{text}</Text>
        },
        {
            title: <span style={{ color: '#0958d9' }}>Sales Rep</span>,
            dataIndex: 'salesRep',
            key: 'salesRep',
            align: 'center',
            width: 110,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#d46b08' }}>Marketing</span>,
            dataIndex: 'marketing',
            key: 'marketing',
            align: 'center',
            width: 110,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#389e0d' }}>Cust. Success</span>,
            dataIndex: 'custSuccess',
            key: 'custSuccess',
            align: 'center',
            width: 120,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#d48806' }}>Accountant</span>,
            dataIndex: 'accountant',
            key: 'accountant',
            align: 'center',
            width: 110,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#08979c' }}>Team Lead</span>,
            dataIndex: 'teamLead',
            key: 'teamLead',
            align: 'center',
            width: 110,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#531dab' }}>Director</span>,
            dataIndex: 'director',
            key: 'director',
            align: 'center',
            width: 110,
            render: renderPermissionTag
        },
        {
            title: <span style={{ color: '#cf1322' }}>Admin</span>,
            dataIndex: 'admin',
            key: 'admin',
            align: 'center',
            width: 100,
            render: renderPermissionTag
        }
    ];

    const rolesColumns = [
        {
            title: '#',
            dataIndex: 'stt',
            key: 'stt',
            width: 60,
            align: 'center'
        },
        {
            title: 'Tên Vai Trò',
            dataIndex: 'roleName',
            key: 'roleName',
            width: 200,
            render: (name, r) => (
                <Space>
                    <Badge color={r.badgeColor} />
                    <Text strong>{name}</Text>
                </Space>
            )
        },
        {
            title: 'Mã Vai Trò (Role Code)',
            dataIndex: 'roleCode',
            key: 'roleCode',
            width: 160,
            render: (code, r) => <Tag color={r.badgeColor}>{code}</Tag>
        },
        {
            title: 'Đối Tượng Trong Doanh Nghiệp',
            dataIndex: 'description',
            key: 'description',
            width: 280
        },
        {
            title: 'Mục Tiêu Chính Khi Dùng Hệ Thống',
            dataIndex: 'goal',
            key: 'goal'
        }
    ];

    const filteredMatrix = MATRIX_DATA.filter(item => 
        item.module.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ background: '#ffffff' }}>
            <div style={{ marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                    <SafetyCertificateOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                    Quản Lý Vai Trò & Ma Trận Phân Quyền
                </Title>
                <Text type="secondary">
                    Quy định phạm vi truy cập dữ liệu (RBAC) chuẩn hóa theo 7 chức danh kinh doanh trong doanh nghiệp.
                </Text>
            </div>

            <Tabs
                defaultActiveKey="matrix"
                items={[
                    {
                        key: 'matrix',
                        label: (
                            <span>
                                <SafetyCertificateOutlined /> Ma Trận Phân Quyền Theo Module
                            </span>
                        ),
                        children: (
                            <div>
                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<InfoCircleOutlined />}
                                    message="Quy ước ký hiệu phân quyền dữ liệu:"
                                    description={
                                        <Space wrap size={[16, 8]} style={{ marginTop: 6 }}>
                                            <span><Tag color="success">F</Tag> Toàn quyền hệ thống</span>
                                            <span><Tag color="processing">W</Tag> Ghi trong phạm vi được giao</span>
                                            <span><Tag color="warning">W*</Tag> Ghi trên dữ liệu sở hữu / nhóm quản lý</span>
                                            <span><Tag color="default">R</Tag> Chỉ xem dữ liệu phân bổ</span>
                                            <span><Tag color="gold">R*</Tag> Chỉ xem dữ liệu sở hữu / nhóm quản lý</span>
                                            <span><Text type="secondary"><b>—</b> Không có quyền truy cập</Text></span>
                                        </Space>
                                    }
                                    style={{ marginBottom: 16, borderRadius: 8 }}
                                />

                                <Row justify="end" style={{ marginBottom: 16 }}>
                                    <Col xs={24} sm={8}>
                                        <Input
                                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                            placeholder="Tìm kiếm theo tên phân hệ..."
                                            allowClear
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                        />
                                    </Col>
                                </Row>

                                <Table
                                    columns={matrixColumns}
                                    dataSource={filteredMatrix}
                                    pagination={false}
                                    bordered
                                    scroll={{ x: 900 }}
                                    size="middle"
                                />
                                
                                <div style={{ marginTop: 14 }}>
                                    <Text orientation="left" type="secondary" style={{ fontSize: 13 }}>
                                        * Lưu ý: Các giới hạn quyền dấu sao (<code>*</code>) là ràng buộc lọc bắt buộc ở tầng truy vấn cơ sở dữ liệu phía máy chủ (Server-side SQL Filter), không thực hiện ẩn/hiện tạm thời ở giao diện người dùng[cite: 20].
                                    </Text>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'roles',
                        label: (
                            <span>
                                <TeamOutlined /> Danh Sách 7 Vai Trò Nghiệp Vụ
                            </span>
                        ),
                        children: (
                            <Table
                                columns={rolesColumns}
                                dataSource={ROLES_DATA}
                                pagination={false}
                                bordered
                                size="middle"
                            />
                        )
                    }
                ]}
            />
        </div>
    );
}