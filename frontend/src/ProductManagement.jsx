import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, 
    Row, Col, Typography, Modal, Form, notification, 
    InputNumber, Tooltip, Popconfirm, Badge, Statistic 
} from 'antd';
import { 
    PlusOutlined, ReloadOutlined, SearchOutlined, 
    EditOutlined, StopOutlined, CheckCircleOutlined, 
    SafetyCertificateOutlined, LockOutlined, DollarOutlined, 
    ShoppingOutlined, SyncOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function ProductManagement() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modal Thêm & Sửa sản phẩm
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isDirectorOrAdmin = currentUser.role_code === 'Director' || currentUser.role_code === 'Admin';

    // 1. Tải danh sách sản phẩm từ MySQL
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5001/api/products', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(res.data.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể kết nối đến API sản phẩm!' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Hàm nhận diện trạng thái an toàn tuyệt đối (hỗ trợ cả active/inactive lẫn 1/0)
    const isProductActive = (p) => {
        if (!p) return false;
        return p.status !== 'inactive' && p.status !== 0 && p.status !== '0' && p.status !== false;
    };

    // 2. Mở Modal Thêm mới
    const handleOpenAddModal = () => {
        setEditingProduct(null);
        form.resetFields();
        form.setFieldsValue({
            type: 'Sản phẩm một lần',
            unit: 'Gói',
            list_price: 10000000,
            floor_price: 8000000,
            cost_price: 5000000
        });
        setIsModalOpen(true);
    };

    // 3. Mở Modal Chỉnh sửa
    const handleOpenEditModal = (record) => {
        setEditingProduct(record);
        form.setFieldsValue({
            code: record.code,
            name: record.name,
            type: record.type,
            unit: record.unit,
            list_price: Number(record.list_price),
            floor_price: Number(record.floor_price),
            cost_price: Number(record.cost_price || 0)
        });
        setIsModalOpen(true);
    };

    // 4. Lưu sản phẩm
    const handleSaveProduct = async (values) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (editingProduct) {
                const res = await axios.put(`http://localhost:5001/api/products/${editingProduct.id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Cập nhật thành công', description: res.data.message });
            } else {
                const res = await axios.post('http://localhost:5001/api/products', values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Tạo sản phẩm thành công', description: res.data.message });
            }
            setIsModalOpen(false);
            form.resetFields();
            fetchProducts();
        } catch (err) {
            api.error({ 
                message: 'Không thể lưu sản phẩm', 
                description: err.response?.data?.message || 'Có lỗi xảy ra khi lưu vào hệ thống!' 
            });
        } finally {
            setSaving(false);
        }
    };

    // 5. Chuyển đổi trạng thái kinh doanh (AC S2-05)
    const handleToggleStatus = async (record) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/products/${record.id}/toggle-status`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchProducts();
        } catch (err) {
            api.error({ message: 'Lỗi', description: err.response?.data?.message });
        }
    };

    // Tính toán chỉ số thống kê (duy nhất 1 lần)
    const totalActive = products.filter(isProductActive).length;
    const totalSubscription = products.filter(p => p.type === 'Dịch vụ thuê bao').length;
    const totalOneTime = products.filter(p => p.type !== 'Dịch vụ thuê bao').length;

    // Bộ lọc
    const filteredProducts = products.filter(p => {
        const matchText = !searchText || (
            p.code?.toLowerCase().includes(searchText.toLowerCase()) || 
            p.name?.toLowerCase().includes(searchText.toLowerCase())
        );
        const matchType = !typeFilter || p.type === typeFilter;
        const active = isProductActive(p);
        const matchStatus = !statusFilter || (statusFilter === 'active' ? active : !active);
        return matchText && matchType && matchStatus;
    });

    const columns = [
        {
            title: 'Mã SP',
            dataIndex: 'code',
            key: 'code',
            width: 140,
            render: (text, record) => (
                <Text code strong style={{ color: text ? '#1677ff' : '#94a3b8' }}>
                    {text || `SP-00${record.id}`}
                </Text>
            )
        },
        {
            title: 'Tên Sản Phẩm / Dịch Vụ',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong style={{ color: '#0f172a' }}>{text}</Text>
        },
        {
            title: 'Hình Thức',
            dataIndex: 'type',
            key: 'type',
            width: 170,
            render: (type) => (
                <Tag color={type === 'Dịch vụ thuê bao' ? 'purple' : 'blue'}>
                    {type}
                </Tag>
            )
        },
        {
            title: 'ĐVT',
            dataIndex: 'unit',
            key: 'unit',
            width: 110,
            align: 'center'
        },
        {
            title: 'Giá Niêm Yết',
            dataIndex: 'list_price',
            key: 'list_price',
            width: 150,
            align: 'right',
            render: (v) => <Text strong style={{ color: '#059669' }}>{Number(v || 0).toLocaleString('vi-VN')} đ</Text>
        },
        {
            title: (
                <Tooltip title="Ngưỡng duyệt chiết khấu tự động ">
                    <span>Giá Sàn (Floor) <SafetyCertificateOutlined style={{ color: '#fa8c16' }} /></span>
                </Tooltip>
            ),
            dataIndex: 'floor_price',
            key: 'floor_price',
            width: 150,
            align: 'right',
            render: (v) => <Text strong style={{ color: '#d97706' }}>{Number(v || 0).toLocaleString('vi-VN')} đ</Text>
        },
        // BẢO MẬT: CHỈ GIÁM ĐỐC KINH DOANH VÀ ADMIN MỚI ĐƯỢC XEM GIÁ VỐN (AC S2-05)
        ...(isDirectorOrAdmin ? [{
            title: (
                <Tooltip title="Giá vốn bảo mật - Chỉ Giám đốc kinh doanh xem và sửa được">
                    <span>Giá Vốn (Bảo Mật) <LockOutlined style={{ color: '#dc2626' }} /></span>
                </Tooltip>
            ),
            dataIndex: 'cost_price',
            key: 'cost_price',
            width: 150,
            align: 'right',
            render: (v) => <Text strong style={{ color: '#dc2626' }}>{Number(v || 0).toLocaleString('vi-VN')} đ</Text>
        }] : []),
        {
            title: 'Trạng Thái',
            key: 'status',
            width: 160,
            align: 'center',
            render: (_, record) => {
                const active = isProductActive(record);
                return (
                    <Badge 
                        status={active ? 'success' : 'error'} 
                        text={active ? 'Đang kinh doanh' : 'Ngừng kinh doanh'} 
                    />
                );
            }
        },
        {
            title: 'Thao Tác',
            key: 'actions',
            align: 'center',
            width: 140,
            render: (_, record) => {
                const active = isProductActive(record);
                return isDirectorOrAdmin ? (
                    <Space size={6}>
                        <Tooltip title="Chỉnh sửa bảng giá">
                            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
                        </Tooltip>
                        <Tooltip title={active ? "Chuyển sang Ngừng kinh doanh" : "Kích hoạt kinh doanh lại"}>
                            <Popconfirm
                                title={active ? "Ngừng kinh doanh sản phẩm này?" : "Kích hoạt lại sản phẩm này?"}
                                onConfirm={() => handleToggleStatus(record)}
                                okText="Đồng ý"
                                cancelText="Hủy"
                            >
                                <Button 
                                    size="small" 
                                    danger={active}
                                    style={!active ? { color: '#059669', borderColor: '#059669' } : {}}
                                    icon={active ? <StopOutlined /> : <CheckCircleOutlined />} 
                                />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                ) : <Tag color="default">Chỉ xem</Tag>;
            }
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER & THẺ KPI */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                            Danh Mục Sản Phẩm & Bảng Giá Chuẩn
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Mọi báo giá kinh doanh bắt buộc xuất phát từ bảng giá niêm yết này thay vì giá tự tính.
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            {isDirectorOrAdmin && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                                    Thêm Sản Phẩm Mới
                                </Button>
                            )}
                            <Button icon={<ReloadOutlined />} onClick={fetchProducts} />
                        </Space>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#f8fafc', borderRadius: 8 }}>
                            <Statistic
                                title={<Text strong style={{ color: '#64748b' }}>SẢN PHẨM ĐANG KINH DOANH</Text>}
                                value={totalActive}
                                suffix={`/ ${products.length} mã`}
                                prefix={<ShoppingOutlined style={{ color: '#1677ff', marginRight: 6 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#f5f3ff', borderRadius: 8 }}>
                            <Statistic
                                title={<Text strong style={{ color: '#6b21a8' }}>DỊCH VỤ THUÊ BAO ĐỊNH KỲ</Text>}
                                value={totalSubscription}
                                suffix="dịch vụ"
                                prefix={<SyncOutlined style={{ color: '#9333ea', marginRight: 6 }} />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#ecfdf5', borderRadius: 8 }}>
                            <Statistic
                                title={<Text strong style={{ color: '#065f46' }}>SẢN PHẨM MỘT LẦN / TRIỂN KHAI</Text>}
                                value={totalOneTime}
                                suffix="sản phẩm"
                                prefix={<DollarOutlined style={{ color: '#059669', marginRight: 6 }} />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* BỘ LỌC TÌM KIẾM */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Tìm theo mã hoặc tên sản phẩm..."
                            allowClear
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={6} md={5}>
                        <Select
                            placeholder="Lọc theo hình thức"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={v => setTypeFilter(v)}
                        >
                            <Select.Option value="Sản phẩm một lần">Sản phẩm một lần</Select.Option>
                            <Select.Option value="Dịch vụ thuê bao">Dịch vụ thuê bao</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={6} md={5}>
                        <Select
                            placeholder="Lọc theo trạng thái"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={v => setStatusFilter(v)}
                        >
                            <Select.Option value="active">Đang kinh doanh</Select.Option>
                            <Select.Option value="inactive">Ngừng kinh doanh</Select.Option>
                        </Select>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG SẢN PHẨM */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={filteredProducts}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8, showTotal: (t) => `Tổng cộng ${t} sản phẩm` }}
                    bordered
                />
            </Card>

            {/* MODAL THÊM & SỬA SẢN PHẨM */}
            <Modal
                title={editingProduct ? "Chỉnh Sửa Bảng Giá Sản Phẩm" : "Thêm Sản Phẩm Dịch Vụ Mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={form.submit}
                confirmLoading={saving}
                okText={editingProduct ? "Lưu thay đổi" : "Tạo sản phẩm"}
                cancelText="Hủy"
                width={620}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveProduct} style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={10}>
                            <Form.Item 
    name="code" 
    label="Mã sản phẩm" 
    rules={[
        { required: true, message: 'Vui lòng nhập mã sản phẩm!' },
        {
            validator(_, value) {
                if (!editingProduct && value) {
                    const isDuplicate = products.some(
                        p => p.code?.toUpperCase() === value.trim().toUpperCase()
                    );
                    if (isDuplicate) {
                        return Promise.reject(new Error(`Mã "${value.trim().toUpperCase()}" đã có trong bảng, vui lòng chọn mã khác!`));
                    }
                }
                return Promise.resolve();
            }
        }
    ]}
>
    <Input 
        disabled={!!editingProduct} 
        placeholder="Ví dụ: CRM_TEST" 
        onChange={e => form.setFieldsValue({ code: e.target.value.toUpperCase() })}
    />
</Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item 
                                name="name" 
                                label="Tên sản phẩm / Dịch vụ" 
                                rules={[{ required: true, message: 'Nhập tên SP!' }]}
                            >
                                <Input placeholder="Tên gói sản phẩm..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="type" label="Hình thức kinh doanh" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="Sản phẩm một lần">Sản phẩm một lần</Select.Option>
                                    <Select.Option value="Dịch vụ thuê bao">Dịch vụ thuê bao</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="unit" label="Đơn vị tính (ĐVT)" rules={[{ required: true }]}>
                                <Input placeholder="Gói / Năm, Tháng, Người dùng..." />
                            </Form.Item>
                        </Col>
                    </Row>

                   <Row gutter={12}>
    <Col span={12}>
        <Form.Item 
            name="list_price" 
            label="Giá niêm yết (VNĐ)" 
            rules={[
                { required: true, message: 'Nhập giá niêm yết!' },
                { type: 'number', min: 1000, message: 'Giá niêm yết phải lớn hơn 0!' }
            ]}
        >
            <InputNumber 
                style={{ width: '100%' }} 
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
            />
        </Form.Item>
    </Col>
    <Col span={12}>
        {/* RÀNG BUỘC AC S2-05: GIÁ SÀN KHÔNG ĐƯỢC LỚN HƠN GIÁ NIÊM YẾT */}
        <Form.Item 
            name="floor_price" 
            label="Giá sàn tối thiểu (VNĐ)" 
            extra="Ngưỡng duyệt chiết khấu tự động"
            dependencies={['list_price']}
            rules={[
                { required: true, message: 'Nhập giá sàn!' },
                ({ getFieldValue }) => ({
                    validator(_, value) {
                        const listPrice = getFieldValue('list_price');
                        if (!value || !listPrice || value <= listPrice) {
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('Giá sàn không được vượt quá Giá niêm yết!'));
                    },
                }),
            ]}
        >
            <InputNumber 
                style={{ width: '100%' }} 
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
            />
        </Form.Item>
    </Col>
</Row>

                    {isDirectorOrAdmin && (
                        <Form.Item 
                            name="cost_price" 
                            label={<Space><LockOutlined style={{ color: '#dc2626' }} /> <Text strong>Giá vốn bảo mật (VNĐ)</Text></Space>} 
                            rules={[{ required: true, message: 'Nhập giá vốn!' }]}
                        >
                            <InputNumber 
                                style={{ width: '100%' }} 
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}