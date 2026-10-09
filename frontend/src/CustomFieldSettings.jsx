import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, 
    Row, Col, Typography, Modal, Form, notification, 
    Tooltip, Popconfirm, Badge, Switch, Tabs 
} from 'antd';
import { 
    SettingOutlined, PlusOutlined, ReloadOutlined, 
    EditOutlined, DeleteOutlined, FontColorsOutlined, 
    NumberOutlined, CalendarOutlined, UnorderedListOutlined, 
    CheckCircleOutlined, StopOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function CustomFieldSettings() {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('customer');

    // Modal Thêm & Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [selectedDataType, setSelectedDataType] = useState('text');
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    // Phân quyền chuẩn RBAC: Chỉ Admin mới có quyền cấu hình (S2-08)
    const isAdmin = currentUser.role_code === 'Admin';

    // 1. Tải danh sách trường tùy biến theo Tab
    const fetchFields = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5001/api/custom-fields?entity_type=${activeTab}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFields(res.data.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi nạp dữ liệu', description: 'Không thể kết nối đến API trường tùy biến!' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, [activeTab]);

    // 2. Mở Modal Thêm mới
    const handleOpenAddModal = () => {
        setEditingField(null);
        setSelectedDataType('text');
        form.resetFields();
        form.setFieldsValue({
            data_type: 'text',
            is_required: false,
            status: 'active'
        });
        setIsModalOpen(true);
    };

    // 3. Mở Modal Chỉnh sửa
    const handleOpenEditModal = (record) => {
        setEditingField(record);
        setSelectedDataType(record.data_type);
        form.setFieldsValue({
            field_name: record.field_name,
            field_key: record.field_key,
            data_type: record.data_type,
            options: record.options,
            is_required: Boolean(record.is_required),
            status: record.status
        });
        setIsModalOpen(true);
    };

    // 4. Lưu trường tùy biến
    const handleSaveField = async (values) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (editingField) {
                const res = await axios.put(`http://localhost:5001/api/custom-fields/${editingField.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Thành công', description: res.data.message });
            } else {
                const res = await axios.post('http://localhost:5001/api/custom-fields', {
                    ...values,
                    entity_type: activeTab
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Thành công', description: res.data.message });
            }
            setIsModalOpen(false);
            fetchFields();
        } catch (err) {
            api.error({ 
                message: 'Lỗi lưu trường tùy biến', 
                description: err.response?.data?.message || 'Có lỗi xảy ra!' 
            });
        } finally {
            setSaving(false);
        }
    };

    // 5. Xóa trường tùy biến
    const handleDeleteField = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`http://localhost:5001/api/custom-fields/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchFields();
        } catch (err) {
            api.error({ message: 'Lỗi xóa trường' });
        }
    };

    // Render tag kiểu dữ liệu chuẩn AC 1
    const renderDataTypeTag = (type, options) => {
        switch (type) {
            case 'number':
                return <Tag icon={<NumberOutlined />} color="green">Số</Tag>;
            case 'date':
                return <Tag icon={<CalendarOutlined />} color="orange">Ngày tháng</Tag>;
            case 'select':
                return (
                    <Tooltip title={options ? `Các lựa chọn: ${options}` : 'Chưa có options'}>
                        <Tag icon={<UnorderedListOutlined />} color="purple">Danh sách chọn</Tag>
                    </Tooltip>
                );
            case 'text':
            default:
                return <Tag icon={<FontColorsOutlined />} color="blue">Văn bản</Tag>;
        }
    };

    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 70,
            align: 'center',
            render: (_, __, idx) => idx + 1
        },
        {
            title: 'Tên trường hiển thị',
            dataIndex: 'field_name',
            key: 'field_name',
            render: (text) => <Text strong style={{ color: '#0f172a' }}>{text}</Text>
        },
        {
            title: 'Mã định danh (Key)',
            dataIndex: 'field_key',
            key: 'field_key',
            width: 190,
            render: (key) => <Text code style={{ color: '#1677ff' }}>{key}</Text>
        },
        {
            title: 'Kiểu dữ liệu (AC 1)',
            dataIndex: 'data_type',
            key: 'data_type',
            width: 180,
            render: (type, record) => renderDataTypeTag(type, record.options)
        },
        {
            title: 'Chi tiết / Lựa chọn',
            dataIndex: 'options',
            key: 'options',
            render: (opts, record) => {
                if (record.data_type !== 'select') return <Text type="secondary">—</Text>;
                if (!opts) return <Text type="danger">Chưa nhập options</Text>;
                return (
                    <Space size={[4, 4]} wrap>
                        {opts.split(',').map((opt, i) => (
                            <Tag key={i} color="geekblue">{opt.trim()}</Tag>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: 'Bắt buộc (AC 2)',
            dataIndex: 'is_required',
            key: 'is_required',
            width: 130,
            align: 'center',
            render: (req) => req ? (
                <Tag color="red" style={{ fontWeight: 600 }}>Bắt buộc (*)</Tag>
            ) : (
                <Tag color="default">Tùy chọn</Tag>
            )
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
            width: 120,
            render: (_, record) => isAdmin ? (
                <Space size={6}>
                    <Tooltip title="Chỉnh sửa trường">
                        <Button size="small" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleOpenEditModal(record)} />
                    </Tooltip>
                    <Tooltip title="Xóa trường">
                        <Popconfirm 
                            title={`Xóa trường "${record.field_name}"?`}
                            description="Dữ liệu liên kết trường này có thể bị ẩn."
                            onConfirm={() => handleDeleteField(record.id)}
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
                            <SettingOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                            Thiết Lập Trường Tùy Biến
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Tự do mở rộng các cột thông tin (Văn bản, Số, Ngày tháng, Dropdown) mà nhân viên hay dùng trên Excel.
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchFields} loading={loading}>Làm mới</Button>
                            {isAdmin && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                                    Khai Báo Trường Mới
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG LIGHT MODE ĐƯỢC PHÂN THEO 2 TABS */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k)}
                    type="line"
                    size="large"
                    items={[
                        { key: 'customer', label: `Khách Hàng (Customer) (${activeTab === 'customer' ? fields.length : ''})` },
                        { key: 'deal', label: `Cơ Hội Bán Hàng (Deal) (${activeTab === 'deal' ? fields.length : ''})` }
                    ]}
                />

                <Table
                    columns={columns}
                    dataSource={fields}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    bordered
                    style={{ marginTop: 8 }}
                />
            </Card>

            {/* MODAL THÊM & SỬA TRƯỜNG TÙY BIẾN */}
            <Modal
                title={editingField ? `Chỉnh Sửa Trường: ${editingField.field_name}` : `Khai Báo Trường Tùy Biến (${activeTab === 'customer' ? 'Khách Hàng' : 'Cơ Hội'})`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={form.submit}
                confirmLoading={saving}
                okText={editingField ? "Lưu thay đổi" : "Tạo trường"}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveField} style={{ marginTop: 16 }}>
                    <Form.Item 
                        name="field_name" 
                        label="Tên trường hiển thị" 
                        rules={[{ required: true, message: 'Vui lòng nhập tên trường!' }]}
                    >
                        <Input 
                            placeholder="Ví dụ: Hạng thành viên VIP, Ngân sách CNTT..." 
                            onChange={(e) => {
                                if (!editingField) {
                                    // Tự gợi ý key dạng snake_case
                                    const autoKey = e.target.value
                                        .toLowerCase()
                                        .normalize('NFD')
                                        .replace(/[\u0300-\u036f]/g, '')
                                        .replace(/[^a-z0-9]/g, '_')
                                        .replace(/_+/g, '_');
                                    form.setFieldsValue({ field_key: autoKey });
                                }
                            }}
                        />
                    </Form.Item>

                    <Form.Item 
                        name="field_key" 
                        label="Mã định danh (Key)" 
                        extra="Dùng để lưu trữ và xuất Excel (chữ thường, không dấu, nối bởi dấu _)"
                        rules={[{ required: true, message: 'Nhập mã định danh!' }]}
                    >
                        <Input disabled={!!editingField} placeholder="Ví dụ: vip_tier, it_budget..." />
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            {/* AC 1: 4 KIỂU DỮ LIỆU */}
                            <Form.Item name="data_type" label="Kiểu dữ liệu (AC 1)" rules={[{ required: true }]}>
                                <Select onChange={(v) => setSelectedDataType(v)}>
                                    <Select.Option value="text">Văn bản (Text)</Select.Option>
                                    <Select.Option value="number">Số (Number)</Select.Option>
                                    <Select.Option value="date">Ngày tháng (Date)</Select.Option>
                                    <Select.Option value="select">Danh sách chọn (Dropdown)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* AC 2: BẮT BUỘC HAY TÙY CHỌN */}
                            <Form.Item name="is_required" label="Bắt buộc nhập (AC 2)" valuePropName="checked">
                                <Switch checkedChildren="Bắt buộc (*)" unCheckedChildren="Tùy chọn" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* HIỂN THỊ Ô OPTIONS KHI CHỌN KIỂU DROPDOWN */}
                    {selectedDataType === 'select' && (
                        <Form.Item 
                            name="options" 
                            label="Các giá trị lựa chọn (cách nhau bằng dấu phẩy)" 
                            rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 lựa chọn!' }]}
                            extra="Ví dụ: Hạng Kim Cương, Hạng Vàng, Hạng Bạc, Tiêu Chuẩn"
                        >
                            <Input.TextArea rows={2} placeholder="Nhập các lựa chọn cách nhau bởi dấu phẩy (,)..." />
                        </Form.Item>
                    )}

                    {editingField && (
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