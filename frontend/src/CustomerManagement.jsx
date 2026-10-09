import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, 
    Row, Col, Typography, Modal, Form, notification, 
    Tooltip, Popconfirm, DatePicker, InputNumber, Divider 
} from 'antd';
import { 
    PlusOutlined, ReloadOutlined, SearchOutlined, 
    EditOutlined, DeleteOutlined, FileExcelOutlined, 
    UserOutlined, PhoneOutlined, MailOutlined, 
    ApartmentOutlined, CalendarOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export default function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    
    // Modal Thêm & Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isDirectorOrAdmin = currentUser.role_code === 'Director' || currentUser.role_code === 'Admin';

    // 1. Tải danh sách khách hàng & trường tùy biến (AC S2-08)
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [custRes, fieldRes] = await Promise.all([
                axios.get('http://localhost:5001/api/customers', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5001/api/custom-fields?entity_type=customer', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setCustomers(custRes.data.data || custRes.data || []);
            // Chỉ lấy các trường có trạng thái active
            const activeFields = (fieldRes.data.data || []).filter(f => f.status === 'active');
            setCustomFields(activeFields);
        } catch (err) {
            api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể kết nối đến máy chủ API Khách hàng!' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Mở Modal Thêm mới
    const handleOpenAddModal = () => {
        setEditingCustomer(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    // 3. Mở Modal Chỉnh sửa
    const handleOpenEditModal = (record) => {
        setEditingCustomer(record);
        
        // Parse custom_fields nếu đang ở dạng chuỗi JSON
        let cfValues = {};
        if (record.custom_fields) {
            try {
                cfValues = typeof record.custom_fields === 'string' 
                    ? JSON.parse(record.custom_fields) 
                    : record.custom_fields;
            } catch (_) {
                cfValues = {};
            }
        }

        // Xử lý các trường ngày tháng cho Form
        const formattedCF = { ...cfValues };
        customFields.forEach(f => {
            if (f.data_type === 'date' && formattedCF[f.field_key]) {
                formattedCF[f.field_key] = dayjs(formattedCF[f.field_key]);
            }
        });

        form.setFieldsValue({
            name: record.name,
            phone: record.phone,
            email: record.email,
            company_name: record.company_name,
            address: record.address,
            custom_fields: formattedCF
        });
        setIsModalOpen(true);
    };

    // 4. Lưu khách hàng (Lưu cả thông tin cơ bản và các trường tùy biến)
    const handleSaveCustomer = async (values) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...values };

            // Chuẩn hóa định dạng ngày trong custom_fields trước khi lưu
            if (payload.custom_fields) {
                const cfData = { ...payload.custom_fields };
                customFields.forEach(f => {
                    if (f.data_type === 'date' && cfData[f.field_key]) {
                        cfData[f.field_key] = dayjs(cfData[f.field_key]).format('YYYY-MM-DD');
                    }
                });
                payload.custom_fields = cfData;
            }

            if (editingCustomer) {
                await axios.put(`http://localhost:5001/api/customers/${editingCustomer.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Cập nhật thông tin khách hàng thành công!' });
            } else {
                await axios.post('http://localhost:5001/api/customers', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                api.success({ message: 'Thêm mới khách hàng thành công!' });
            }

            setIsModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Thất bại', description: err.response?.data?.message || 'Lỗi lưu thông tin khách hàng' });
        } finally {
            setSaving(false);
        }
    };

    // 5. Xóa khách hàng
    const handleDeleteCustomer = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5001/api/customers/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Đã xóa khách hàng thành công!' });
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi xóa khách hàng', description: err.response?.data?.message });
        }
    };

    // 6. XUẤT EXCEL TỰ ĐỘNG KÈM THEO CÁC CỘT TÙY BIẾN (AC S2-08 - AC 3)
    const handleExportExcel = () => {
        // Tiêu đề các cột cố định + các cột tùy biến đang active
        const headers = ['Mã KH', 'Tên Khách Hàng', 'Số Điện Thoại', 'Email', 'Công Ty / Đơn Vị'];
        customFields.forEach(cf => headers.push(cf.field_name));

        // Dữ liệu từng dòng
        const rows = filteredCustomers.map(c => {
            let cfData = {};
            if (c.custom_fields) {
                try {
                    cfData = typeof c.custom_fields === 'string' ? JSON.parse(c.custom_fields) : c.custom_fields;
                } catch (_) {}
            }

            const cfValues = customFields.map(cf => cfData[cf.field_key] || '');
            return [
                c.code || `KH-00${c.id}`,
                c.name || '',
                c.phone || '',
                c.email || '',
                c.company_name || '',
                ...cfValues
            ];
        });

        // Ghép thành file bảng tính Excel (HTML XML) chuẩn UTF-8
        const excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
            <body>
                <table border="1">
                    <thead>
                        <tr style="background-color: #1677ff; color: #ffffff; font-weight: bold; height: 35px;">
                            ${headers.map(h => `<th style="padding: 6px 12px;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>${r.map(v => `<td style="padding: 6px 10px;">${v}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\uFEFF' + excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Danh_Sach_Khach_Hang_${dayjs().format('YYYY-MM-DD')}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Bộ lọc tìm kiếm
    const filteredCustomers = customers.filter(c => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return (
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.company_name?.toLowerCase().includes(q)
        );
    });

    // 7. XÂY DỰNG CÁC CỘT CHO BẢNG: CỘT MẶC ĐỊNH + CỘT ĐỘNG (AC 3)
    const baseColumns = [
        {
            title: 'Mã KH',
            key: 'code',
            width: 110,
            render: (_, r) => <Text code style={{ color: '#1677ff' }}>{r.code || `KH-00${r.id}`}</Text>
        },
        {
            title: 'Khách Hàng',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <Text strong style={{ color: '#0f172a' }}>{text}</Text>
                    {record.company_name && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            <ApartmentOutlined style={{ marginRight: 4 }} />{record.company_name}
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Liên Hệ',
            key: 'contact',
            width: 220,
            render: (_, record) => (
                <div style={{ fontSize: 13 }}>
                    {record.phone && <div><PhoneOutlined style={{ color: '#059669', marginRight: 6 }} />{record.phone}</div>}
                    {record.email && <div><MailOutlined style={{ color: '#1677ff', marginRight: 6 }} />{record.email}</div>}
                </div>
            )
        }
    ];

    // Tạo các cột từ bảng custom_fields tự động (AC S2-08)
    const dynamicCustomColumns = customFields.map(cf => ({
        title: (
            <span>
                {cf.field_name}
                {cf.is_required ? <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span> : null}
            </span>
        ),
        key: cf.field_key,
        render: (_, record) => {
            let cfData = {};
            if (record.custom_fields) {
                try {
                    cfData = typeof record.custom_fields === 'string' ? JSON.parse(record.custom_fields) : record.custom_fields;
                } catch (_) {}
            }
            const val = cfData[cf.field_key];
            if (val === undefined || val === null || val === '') return <span style={{ color: '#cbd5e1' }}>—</span>;

            // Hiển thị đẹp theo kiểu dữ liệu
            if (cf.data_type === 'select') return <Tag color="blue">{val}</Tag>;
            if (cf.data_type === 'number') return <Text strong style={{ color: '#059669' }}>{Number(val).toLocaleString('vi-VN')}</Text>;
            if (cf.data_type === 'date') return <Text type="secondary"><CalendarOutlined style={{ marginRight: 4 }} />{dayjs(val).format('DD/MM/YYYY')}</Text>;
            return String(val);
        }
    }));

    const actionColumn = {
        title: 'Thao Tác',
        key: 'actions',
        width: 120,
        align: 'center',
        render: (_, record) => (
            <Space size={6}>
                <Tooltip title="Chỉnh sửa">
                    <Button size="small" icon={<EditOutlined style={{ color: '#1677ff' }} />} onClick={() => handleOpenEditModal(record)} />
                </Tooltip>
                <Tooltip title="Xóa">
                    <Popconfirm
                        title={`Xóa khách hàng "${record.name}"?`}
                        onConfirm={() => handleDeleteCustomer(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Tooltip>
            </Space>
        )
    };

    const finalColumns = [...baseColumns, ...dynamicCustomColumns, actionColumn];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                            Quản Lý Khách Hàng & Doanh Nghiệp
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Theo dõi thông tin 360 độ và các trường dữ liệu tùy biến mở rộng (S2-08)
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<FileExcelOutlined style={{ color: '#059669' }} />} onClick={handleExportExcel}>
                                Xuất Excel
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                                Thêm Khách Hàng
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* BỘ LỌC TÌM KIẾM */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Tìm kiếm theo tên, SĐT, email, công ty..."
                            allowClear
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </Col>
                </Row>
            </Card>

            {/* BẢNG DỮ LIỆU ĐỘNG */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={finalColumns}
                    dataSource={filteredCustomers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8, showTotal: t => `Tổng cộng ${t} khách hàng` }}
                    bordered
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* MODAL THÊM / SỬA KHÁCH HÀNG (AC 3: FORM RENDER ĐỘNG) */}
            <Modal
                title={editingCustomer ? "Chỉnh Sửa Thông Tin Khách Hàng" : "Thêm Khách Hàng Doanh Nghiệp Mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={form.submit}
                confirmLoading={saving}
                okText={editingCustomer ? "Lưu thay đổi" : "Thêm khách hàng"}
                cancelText="Hủy"
                width={700}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveCustomer} style={{ marginTop: 16 }}>
                    {/* 1. CÁC TRƯỜNG CƠ BẢN */}
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên khách hàng / Người đại diện" rules={[{ required: true, message: 'Nhập tên khách hàng!' }]}>
                                <Input placeholder="Ví dụ: Nguyễn Văn A" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="company_name" label="Tên công ty / Doanh nghiệp">
                                <Input placeholder="Ví dụ: Công ty Cổ phần Techcom" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại!' }]}>
                                <Input placeholder="Ví dụ: 0912345678" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Địa chỉ Email">
                                <Input placeholder="Ví dụ: contact@congty.com" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="address" label="Địa chỉ">
                        <Input placeholder="Địa chỉ trụ sở / văn phòng..." />
                    </Form.Item>

                    {/* 2. CÁC TRƯỜNG TÙY BIẾN SINH TỰ ĐỘNG (AC S2-08) */}
                    {customFields.length > 0 && (
                        <>
                            <Divider orientation="left" style={{ borderColor: '#e2e8f0', fontSize: 13, color: '#1677ff' }}>
                                Trường Tùy Biến Mở Rộng (Khai Báo Bởi Admin)
                            </Divider>

                            <Row gutter={12}>
                                {customFields.map((field) => (
                                    <Col span={12} key={field.field_key}>
                                        <Form.Item
                                            name={['custom_fields', field.field_key]}
                                            label={
                                                <span>
                                                    {field.field_name}
                                                    {field.is_required ? <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span> : null}
                                                </span>
                                            }
                                            rules={field.is_required ? [{ required: true, message: `Vui lòng nhập ${field.field_name}!` }] : []}
                                        >
                                            {/* Kiểu Văn bản */}
                                            {field.data_type === 'text' && (
                                                <Input placeholder={`Nhập ${field.field_name.toLowerCase()}...`} />
                                            )}

                                            {/* Kiểu Số */}
                                            {field.data_type === 'number' && (
                                                <InputNumber 
                                                    style={{ width: '100%' }} 
                                                    placeholder="Nhập số..." 
                                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                                                />
                                            )}

                                            {/* Kiểu Ngày tháng */}
                                            {field.data_type === 'date' && (
                                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày..." />
                                            )}

                                            {/* Kiểu Dropdown / Lựa chọn */}
                                            {field.data_type === 'select' && (
                                                <Select placeholder={`-- Chọn ${field.field_name.toLowerCase()} --`} allowClear>
                                                    {(field.options || '').split(',').map((opt, idx) => {
                                                        const clean = opt.trim();
                                                        return <Select.Option key={idx} value={clean}>{clean}</Select.Option>;
                                                    })}
                                                </Select>
                                            )}
                                        </Form.Item>
                                    </Col>
                                ))}
                            </Row>
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
}