import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, 
    Row, Col, Typography, Modal, Form, notification, 
    Tooltip, Popconfirm, Drawer, List, Avatar 
} from 'antd';
import { 
    ClusterOutlined, PlusOutlined, ReloadOutlined, 
    EditOutlined, DeleteOutlined, UserOutlined, 
    EnvironmentOutlined, TeamOutlined, CrownOutlined, 
    SwapOutlined, FolderOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function SaaSOrgTree() {
    const [treeData, setTreeData] = useState([]);
    const [rawGroups, setRawGroups] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal Thêm/Sửa Nhóm kinh doanh
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupForm] = Form.useForm();
    const [savingGroup, setSavingGroup] = useState(false);

    // Modal Thêm Khu vực địa lý
    const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
    const [regionForm] = Form.useForm();

    // Drawer Quản lý & Điều chuyển thành viên nhóm
    const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null);
    const [isMemberDrawerOpen, setIsMemberDrawerOpen] = useState(false);
    const [selectedUserIdToAssign, setSelectedUserIdToAssign] = useState(null);

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isDirectorOrAdmin = currentUser.role_code === 'Director' || currentUser.role_code === 'Admin';

    // 1. Nạp dữ liệu cây tổ chức và khu vực
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [treeRes, regRes] = await Promise.all([
                axios.get('http://localhost:5001/api/organization/tree', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5001/api/organization/regions', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setTreeData(treeRes.data.treeData || []);
            setRawGroups(treeRes.data.rawGroups || []);
            setAllUsers(treeRes.data.allUsers || []);
            setRegions(regRes.data.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi nạp dữ liệu', description: 'Không thể kết nối API tổ chức!' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Mở Modal Thêm mới / Sửa nhóm
    const handleOpenGroupModal = (record = null) => {
        setEditingGroup(record);
        if (record) {
            groupForm.setFieldsValue({
                name: record.name,
                parent_id: record.parent_id || undefined,
                leader_id: record.leader_id || undefined,
                region_id: record.region_id || undefined,
                description: record.description
            });
        } else {
            groupForm.resetFields();
        }
        setIsGroupModalOpen(true);
    };

    // 3. Lưu nhóm kinh doanh
    const handleSaveGroup = async (values) => {
        setSavingGroup(true);
        try {
            const token = localStorage.getItem('token');
            if (editingGroup) {
                await axios.put(`http://localhost:5001/api/organization/groups/${editingGroup.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Đã cập nhật nhóm kinh doanh!' });
            } else {
                await axios.post('http://localhost:5001/api/organization/groups', values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Đã thêm nhánh mới vào cây tổ chức!' });
            }
            setIsGroupModalOpen(false);
            fetchData();
        } catch (err) {
            api.error({ message: 'Thất bại', description: err.response?.data?.message });
        } finally {
            setSavingGroup(false);
        }
    };

    // 4. Thêm khu vực địa lý
    const handleSaveRegion = async (values) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/organization/regions', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Đã tạo khu vực địa lý mới!' });
            setIsRegionModalOpen(false);
            regionForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi', description: err.response?.data?.message });
        }
    };

    // 5. Xóa nhóm
    const handleDeleteGroup = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`http://localhost:5001/api/organization/groups/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchData();
        } catch (err) {
            api.error({ message: 'Không thể xóa', description: err.response?.data?.message });
        }
    };

    // 6. Điều chuyển nhân sự vào nhóm (AC S2-06)
    const handleAssignMember = async () => {
        if (!selectedUserIdToAssign) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:5001/api/organization/groups/${selectedGroupForMembers.id}/assign-member`, {
                user_id: selectedUserIdToAssign
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Đã điều chuyển nhân sự vào nhóm!' });
            setSelectedUserIdToAssign(null);
            fetchData();
            const updatedGroup = rawGroups.find(g => g.id === selectedGroupForMembers.id);
            setSelectedGroupForMembers(updatedGroup);
        } catch (err) {
            api.error({ message: 'Lỗi điều chuyển' });
        }
    };

    const columns = [
        {
            title: 'Tên Nhóm / Phòng Ban (Cây Phân Cấp)',
            dataIndex: 'name',
            key: 'name',
            render: (text) => (
                <Space>
                    <FolderOutlined style={{ color: '#1677ff' }} />
                    <Text strong style={{ color: '#0f172a' }}>{text}</Text>
                </Space>
            )
        },
        {
            title: (
                <Tooltip title="Mỗi nhóm có một trưởng nhóm phụ trách)">
                    <span>Trưởng Nhóm (Leader) <CrownOutlined style={{ color: '#fa8c16' }} /></span>
                </Tooltip>
            ),
            dataIndex: 'leader_name',
            key: 'leader_name',
            width: 230,
            render: (name, record) => name ? (
                <Space>
                    <Avatar size="small" style={{ backgroundColor: '#fa8c16' }}>{name.charAt(0)}</Avatar>
                    <div>
                        <Text strong style={{ color: '#b45309' }}>{name}</Text>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{record.leader_email}</div>
                    </div>
                </Space>
            ) : <Tag color="default">Chưa bổ nhiệm</Tag>
        },
        {
            title: 'Khu Vực Địa Lý',
            dataIndex: 'region_name',
            key: 'region_name',
            width: 180,
            render: (region) => region ? (
                <Tag icon={<EnvironmentOutlined />} color="cyan">{region}</Tag>
            ) : <Text type="secondary">Chưa gán</Text>
        },
        {
            title: 'Quy Mô Nhân Sự',
            dataIndex: 'member_count',
            key: 'member_count',
            width: 150,
            align: 'center',
            render: (count, record) => (
                <Button 
                    type="link" 
                    size="small" 
                    icon={<TeamOutlined />} 
                    onClick={() => { setSelectedGroupForMembers(record); setIsMemberDrawerOpen(true); }}
                >
                    {count || 0} nhân sự
                </Button>
            )
        },
        {
            title: 'Mô Tả Chức Năng',
            dataIndex: 'description',
            key: 'description',
            render: (t) => t || <Text type="secondary">—</Text>
        },
        {
            title: 'Thao Tác',
            key: 'actions',
            align: 'center',
            width: 130,
            render: (_, record) => isDirectorOrAdmin ? (
                <Space size={6}>
                    <Tooltip title="Chỉnh sửa">
                        <Button size="small" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleOpenGroupModal(record)} />
                    </Tooltip>
                    <Tooltip title="Giải thể nhóm">
                        <Popconfirm 
                            title={`Xóa nhóm "${record.name}"?`} 
                            description="Nhân sự sẽ được đưa về trạng thái Chưa gán." 
                            onConfirm={() => handleDeleteGroup(record.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ) : <Tag color="default">Chỉ xem</Tag>
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                            <ClusterOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                            Cơ Cấu Tổ Chức Kinh Doanh
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Khai báo cây phân cấp phòng ban, bổ nhiệm Trưởng nhóm và phân bổ khu vực địa lý
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
                            {isDirectorOrAdmin && (
                                <>
                                    <Button icon={<EnvironmentOutlined />} onClick={() => setIsRegionModalOpen(true)}>
                                        Khai Báo Khu Vực
                                    </Button>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenGroupModal(null)}>
                                        Thêm Nhóm Kinh Doanh
                                    </Button>
                                </>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG CÂY TỔ CHỨC */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={treeData}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    defaultExpandAllRows={true}
                    bordered
                />
            </Card>

            {/* MODAL 1: THÊM / SỬA NHÓM KINH DOANH */}
            <Modal
                title={editingGroup ? `Chỉnh Sửa: ${editingGroup.name}` : "Thêm Nhóm Kinh Doanh Mới"}
                open={isGroupModalOpen}
                onCancel={() => setIsGroupModalOpen(false)}
                onOk={groupForm.submit}
                confirmLoading={savingGroup}
                okText={editingGroup ? "Lưu thay đổi" : "Tạo nhóm"}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={groupForm} layout="vertical" onFinish={handleSaveGroup} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Tên nhóm / Phòng ban" rules={[{ required: true, message: 'Nhập tên nhóm!' }]}>
                        <Input placeholder="Ví dụ: Phòng Kinh Doanh Hà Nội" />
                    </Form.Item>

                    <Form.Item name="parent_id" label="Trực thuộc Nhóm cấp trên (Cấu trúc cây)">
                        <Select placeholder="Chọn nhóm cha (để trống nếu là cấp cao nhất)" allowClear>
                            {rawGroups.filter(g => g.id !== editingGroup?.id).map(g => (
                                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="leader_id" label="Trưởng nhóm (Team Lead)">
                                <Select placeholder="Chọn Trưởng nhóm" allowClear>
                                    {allUsers.map(u => (
                                        <Select.Option key={u.id} value={u.id}>{u.full_name} ({u.role_code})</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="region_id" label="Khu vực địa lý phụ trách">
                                <Select placeholder="Chọn khu vực" allowClear>
                                    {regions.map(r => (
                                        <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả chức năng">
                        <Input.TextArea rows={2} placeholder="Mô tả thị trường và nhiệm vụ phụ trách..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 2: KHAI BÁO KHU VỰC ĐỊA LÝ */}
            <Modal
                title="Khai Báo Khu Vực Địa Lý Mới"
                open={isRegionModalOpen}
                onCancel={() => setIsRegionModalOpen(false)}
                onOk={regionForm.submit}
                okText="Lưu khu vực"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={regionForm} layout="vertical" onFinish={handleSaveRegion} style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Tên khu vực" rules={[{ required: true, message: 'Nhập tên khu vực!' }]}>
                        <Input placeholder="Ví dụ: Khu vực Miền Bắc" />
                    </Form.Item>
                    <Form.Item name="code" label="Mã định danh" rules={[{ required: true, message: 'Nhập mã!' }]}>
                        <Input placeholder="Ví dụ: NORTH" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả phạm vi tỉnh thành">
                        <Input.TextArea rows={2} placeholder="Bao gồm: Hà Nội, Thái Nguyên, Hải Phòng..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* DRAWER: QUẢN LÝ THÀNH VIÊN TRONG NHÓM */}
            <Drawer
                title={<Space><TeamOutlined /> <span>Nhân Sự Thuộc: {selectedGroupForMembers?.name}</span></Space>}
                open={isMemberDrawerOpen}
                onClose={() => setIsMemberDrawerOpen(false)}
                width={480}
            >
                {isDirectorOrAdmin && (
                    <Card size="small" style={{ marginBottom: 16, background: '#f8fafc' }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Điều chuyển nhân viên vào nhóm này:</Text>
                        <Space.Compact style={{ width: '100%' }}>
                            <Select
    showSearch
    allowClear
    placeholder="Nhập tên để tìm kiếm hoặc lướt chọn..."
    style={{ width: '75%' }}
    value={selectedUserIdToAssign}
    onChange={v => setSelectedUserIdToAssign(v)}
    optionFilterProp="children"
    filterOption={(input, option) =>
        (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
    }
>
    {allUsers.filter(u => u.group_id !== selectedGroupForMembers?.id).map(u => (
        <Select.Option key={u.id} value={u.id}>
            {u.full_name} ({u.role_code}) - {u.email}
        </Select.Option>
    ))}
</Select>
                            <Button type="primary" icon={<SwapOutlined />} onClick={handleAssignMember}>
                                Chuyển
                            </Button>
                        </Space.Compact>
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                            * Mỗi nhân viên thuộc đúng 1 nhóm tại một thời điểm
                        </Text>
                    </Card>
                )}

                <List
                    itemLayout="horizontal"
                    dataSource={allUsers.filter(u => u.group_id === selectedGroupForMembers?.id)}
                    renderItem={user => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar style={{ backgroundColor: user.role_code === 'Team Lead' ? '#fa8c16' : '#1677ff' }}><UserOutlined /></Avatar>}
                                title={<Space><Text strong>{user.full_name}</Text>{user.id === selectedGroupForMembers?.leader_id && <Tag color="warning">Trưởng nhóm</Tag>}</Space>}
                                description={<div><div>{user.email}</div><Tag color="blue">{user.role_code}</Tag></div>}
                            />
                        </List.Item>
                    )}
                />
            </Drawer>
        </div>
    );
}