import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, 
    Row, Col, Typography, Modal, Form, notification, 
    Tooltip, Popconfirm, Tabs, Badge 
} from 'antd';
import { 
    TagsOutlined, PlusOutlined, ReloadOutlined, 
    ArrowUpOutlined, ArrowDownOutlined, EditOutlined, 
    DeleteOutlined, CheckCircleOutlined, StopOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function CategoryManagement() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('industry');

    // Modal Thêm & Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    // Phân quyền theo ma trận RBAC: Giám đốc (Director) và Admin có toàn quyền (F)
    const isDirectorOrAdmin = currentUser.role_code === 'Director' || currentUser.role_code === 'Admin';

    const tabConfig = {
        industry: { label: 'Ngành Nghề Kinh Doanh', addText: 'Thêm Ngành Nghề' },
        company_size: { label: 'Quy Mô Doanh Nghiệp', addText: 'Thêm Quy Mô' },
        lead_source: { label: 'Nguồn Khách Hàng (Lead)', addText: 'Thêm Nguồn Lead' },
        activity_type: { label: 'Loại Hoạt Động', addText: 'Thêm Loại Hoạt Động' }
    };

    // 1. Tải danh sách danh mục theo Tab đang chọn
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5001/api/categories?type=${activeTab}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(res.data.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi tải danh mục', description: 'Không thể kết nối đến máy chủ.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [activeTab]);

    // 2. Mở Modal Thêm mới
    const handleOpenAddModal = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ status: 'active' });
        setIsModalOpen(true);
    };

    // 3. Mở Modal Sửa
    const handleOpenEditModal = (record) => {
        setEditingItem(record);
        form.setFieldsValue({
            name: record.name,
            code: record.code,
            description: record.description,
            status: record.status
        });
        setIsModalOpen(true);
    };

    // 4. Lưu danh mục
    const handleSaveCategory = async (values) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (editingItem) {
                const res = await axios.put(`http://localhost:5001/api/categories/${editingItem.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Thành công', description: res.data.message });
            } else {
                const res = await axios.post('http://localhost:5001/api/categories', {
                    ...values,
                    type: activeTab
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Thành công', description: res.data.message });
            }
            setIsModalOpen(false);
            form.resetFields();
            fetchCategories();
        } catch (err) {
            api.error({ 
                message: 'Thao tác thất bại', 
                description: err.response?.data?.message || 'Có lỗi xảy ra!' 
            });
        } finally {
            setSaving(false);
        }
    };

    // 5. Đổi thứ tự hiển thị Lên / Xuống (AC 3)
    const handleSwapOrder = async (record, direction) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/categories/${record.id}/swap-order`, { direction }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchCategories();
        } catch (err) {
            api.error({ message: 'Lỗi sắp xếp', description: err.response?.data?.message });
        }
    };

    // 6. Xóa danh mục kèm chặn tham chiếu (AC 2)
    const handleDeleteCategory = async (record) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`http://localhost:5001/api/categories/${record.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchCategories();
        } catch (err) {
            api.error({ 
                message: 'Không thể xóa danh mục này', 
                description: err.response?.data?.message || 'Giá trị đang được sử dụng ở module khác!' 
            });
        }
    };

    const columns = [
        {
            title: 'Thứ tự',
            key: 'order',
            width: 110,
            align: 'center',
            render: (_, record, index) => (
                <Space size={4}>
                    <Text strong style={{ minWidth: 16 }}>{record.sort_order || index + 1}</Text>
                    {isDirectorOrAdmin && (
                        <>
                            <Tooltip title="Đẩy lên trước">
                                <Button 
                                    size="small" 
                                    type="text" 
                                    icon={<ArrowUpOutlined style={{ color: '#1677ff' }} />} 
                                    disabled={index === 0}
                                    onClick={() => handleSwapOrder(record, 'UP')} 
                                />
                            </Tooltip>
                            <Tooltip title="Đẩy xuống sau">
                                <Button 
                                    size="small" 
                                    type="text" 
                                    icon={<ArrowDownOutlined style={{ color: '#1677ff' }} />} 
                                    disabled={index === categories.length - 1}
                                    onClick={() => handleSwapOrder(record, 'DOWN')} 
                                />
                            </Tooltip>
                        </>
                    )}
                </Space>
            )
        },
        {
            title: 'Tên hiển thị',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong style={{ color: '#0f172a' }}>{text}</Text>
        },
        {
            title: 'Mã viết tắt',
            dataIndex: 'code',
            key: 'code',
            width: 160,
            render: (code) => <Tag color="blue" style={{ fontWeight: 600 }}>{code}</Tag>
        },
        {
            title: 'Mô tả giải thích',
            dataIndex: 'description',
            key: 'description',
            render: (text) => text || <Text type="secondary">—</Text>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            align: 'center',
            render: (st) => (
                <Badge 
                    status={st === 'inactive' ? 'error' : 'success'} 
                    text={st === 'inactive' ? 'Tạm ngưng' : 'Đang dùng'} 
                />
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            align: 'center',
            width: 130,
            render: (_, record) => isDirectorOrAdmin ? (
                <Space size={8}>
                    <Tooltip title="Chỉnh sửa">
                        <Button 
                            size="small" 
                            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
                            onClick={() => handleOpenEditModal(record)} 
                        />
                    </Tooltip>
                    <Tooltip title="Xóa danh mục">
                        <Popconfirm
                            title={`Xóa danh mục "${record.name}"?`}
                            description="Hệ thống sẽ kiểm tra ràng buộc trước khi xóa."
                            onConfirm={() => handleDeleteCategory(record)}
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
                            <TagsOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                            Khai Báo Danh Mục Dùng Chung
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Chuẩn hóa danh mục ngành nghề, quy mô, nguồn lead và loại hoạt động để đồng bộ báo cáo toàn công ty
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            {isDirectorOrAdmin && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                                    {tabConfig[activeTab]?.addText}
                                </Button>
                            )}
                            <Button icon={<ReloadOutlined />} onClick={fetchCategories} />
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* TABS 4 NHÓM DANH MỤC & BẢNG LIGHT MODE */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k)}
                    type="line"
                    size="large"
                    items={[
                        { key: 'industry', label: `1. ${tabConfig.industry.label}` },
                        { key: 'company_size', label: `2. ${tabConfig.company_size.label}` },
                        { key: 'lead_source', label: `3. ${tabConfig.lead_source.label}` },
                        { key: 'activity_type', label: `4. ${tabConfig.activity_type.label}` }
                    ]}
                />

                <Table
                    columns={columns}
                    dataSource={categories}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    bordered
                    style={{ marginTop: 8 }}
                />
            </Card>

            {/* MODAL THÊM & SỬA */}
            <Modal
                title={editingItem ? `Chỉnh Sửa: ${editingItem.name}` : tabConfig[activeTab]?.addText}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={form.submit}
                confirmLoading={saving}
                okText={editingItem ? "Lưu thay đổi" : "Thêm mới"}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveCategory} style={{ marginTop: 16 }}>
                    <Form.Item 
                        name="name" 
                        label="Tên hiển thị" 
                        rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
                    >
                        <Input placeholder="Ví dụ: Công nghệ thông tin..." />
                    </Form.Item>

                    <Form.Item 
                        name="code" 
                        label="Mã viết tắt / Định danh" 
                        rules={[{ required: true, message: 'Nhập mã viết tắt!' }]}
                    >
                        <Input disabled={!!editingItem} placeholder="Ví dụ: IT, SME, WEB..." />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả giải thích">
                        <Input.TextArea rows={3} placeholder="Mô tả phạm vi hoặc đối tượng áp dụng..." />
                    </Form.Item>

                    {editingItem && (
                        <Form.Item name="status" label="Trạng thái sử dụng" rules={[{ required: true }]}>
                            <Select>
                                <Select.Option value="active">Đang dùng</Select.Option>
                                <Select.Option value="inactive">Tạm ngưng</Select.Option>
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}