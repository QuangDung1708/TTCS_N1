import React, { useState, useEffect } from 'react';
import { 
  Tabs, Card, Table, Button, Space, Tag, Modal, Form, Input, 
  Select, Typography, Popconfirm, message, Tooltip, Badge, Row, Col 
} from 'antd';
import { 
  TrophyOutlined, CloseCircleOutlined, TeamOutlined, PlusOutlined, 
  EditOutlined, DeleteOutlined, ReloadOutlined, CheckCircleOutlined, 
  StopOutlined, GlobalOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function CategoryManagement() {
  const [activeTab, setActiveTab] = useState('win'); // 'win' | 'lost' | 'competitors'
  const [loading, setLoading] = useState(false);

  // Danh sách dữ liệu
  const [winReasons, setWinReasons] = useState([]);
  const [lostReasons, setLostReasons] = useState([]);
  const [competitors, setCompetitors] = useState([]);

  // Phân quyền theo ma trận: Chỉ Admin và Director có quyền Full (F)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = currentUser.role_code === 'Admin' || currentUser.role_code === 'Director';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  // Tải dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resWin, resLost, resComp] = await Promise.all([
        axios.get('http://localhost:5001/api/sale-categories/reasons?type=win'),
        axios.get('http://localhost:5001/api/sale-categories/reasons?type=lost'),
        axios.get('http://localhost:5001/api/sale-categories/competitors')
      ]);
      setWinReasons(resWin.data);
      setLostReasons(resLost.data);
      setCompetitors(resComp.data);
    } catch (err) {
      message.error('Lỗi khi nạp dữ liệu danh mục bán hàng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal Thêm mới / Chỉnh sửa
  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    form.resetFields();
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.setFieldsValue({
        status: 'active',
        threat_level: 'medium',
        type: activeTab === 'competitors' ? undefined : activeTab
      });
    }
    setIsModalOpen(true);
  };

  // Lưu dữ liệu (Submit Modal)
  const handleSubmit = async (values) => {
    try {
      if (activeTab === 'competitors') {
        if (editingItem) {
          await axios.put(`http://localhost:5001/api/sale-categories/competitors/${editingItem.id}`, values);
          message.success('Cập nhật đối thủ thành công!');
        } else {
          await axios.post('http://localhost:5001/api/sale-categories/competitors', values);
          message.success('Thêm đối thủ mới thành công!');
        }
      } else {
        const payload = { ...values, type: activeTab };
        if (editingItem) {
          await axios.put(`http://localhost:5001/api/sale-categories/reasons/${editingItem.id}`, payload);
          message.success('Cập nhật lý do thành công!');
        } else {
          await axios.post('http://localhost:5001/api/sale-categories/reasons', payload);
          message.success('Thêm lý do mới thành công!');
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      message.error('Lỗi khi lưu dữ liệu!');
    }
  };

  // Xóa bản ghi
  const handleDelete = async (id) => {
    try {
      if (activeTab === 'competitors') {
        await axios.delete(`http://localhost:5001/api/sale-categories/competitors/${id}`);
      } else {
        await axios.delete(`http://localhost:5001/api/sale-categories/reasons/${id}`);
      }
      message.success('Đã xóa bản ghi thành công!');
      fetchData();
    } catch (err) {
      message.error('Lỗi khi xóa!');
    }
  };

  // Cấu hình bảng cho Lý do Thắng / Thua
  const reasonColumns = [
    {
      title: 'Tên lý do',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Mô tả chi tiết',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || <Text type="secondary">Chưa có mô tả</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Đang áp dụng' : 'Tạm ngưng'}
        </Tag>
      )
    },
    ...(canManage ? [{
      title: 'Hành động',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
            onClick={() => handleOpenModal(record)} 
          />
          <Popconfirm
            title="Xóa lý do này?"
            description="Dữ liệu sẽ bị xóa trực tiếp khỏi database!"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : [])
  ];

  // Cấu hình bảng cho Đối thủ cạnh tranh
  const competitorColumns = [
    {
      title: 'Tên đối thủ',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.website && (
            <div>
              <a href={record.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1677ff' }}>
                <GlobalOutlined style={{ marginRight: 4 }} />
                {record.website}
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Mức độ đe dọa',
      dataIndex: 'threat_level',
      key: 'threat_level',
      width: 150,
      render: (level) => {
        const config = {
          high: { color: 'error', label: 'Rất cao (Nguy hiểm)' },
          medium: { color: 'warning', label: 'Trung bình' },
          low: { color: 'default', label: 'Thấp' }
        };
        const current = config[level] || config.medium;
        return <Tag color={current.color}>{current.label}</Tag>;
      }
    },
    {
      title: 'Điểm mạnh chính',
      dataIndex: 'strengths',
      key: 'strengths',
      render: (text) => text || <Text type="secondary">Chưa ghi nhận</Text>
    },
    {
      title: 'Điểm yếu / Nhược điểm',
      dataIndex: 'weaknesses',
      key: 'weaknesses',
      render: (text) => text || <Text type="secondary">Chưa ghi nhận</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={status === 'active' ? 'processing' : 'default'}>
          {status === 'active' ? 'Đang theo dõi' : 'Đã ngưng'}
        </Tag>
      )
    },
    ...(canManage ? [{
      title: 'Hành động',
      key: 'action',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
            onClick={() => handleOpenModal(record)} 
          />
          <Popconfirm
            title="Xóa đối thủ này?"
            description="Bản ghi sẽ bị xóa vĩnh viễn khỏi database!"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : [])
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* TIÊU ĐỀ TRANG VÀ NÚT TÁC VỤ */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Cấu Hình Danh Mục Thắng Thua & Đối Thủ (S2-10)
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Khai báo độc lập lý do thắng, lý do thua và danh sách đối thủ cạnh tranh phục vụ đóng cơ hội (Sprint 5).
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                Làm mới
              </Button>
              {canManage && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => handleOpenModal()}
                >
                  {activeTab === 'competitors' ? 'Thêm Đối Thủ' : 'Thêm Lý Do'}
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* GIAO DIỆN CHÍNH: 3 TABS PHÂN TÁCH ĐỘC LẬP THEO AC */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          type="card"
          items={[
            {
              key: 'win',
              label: (
                <span>
                  <TrophyOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                  Lý Do Thắng Hợp Đồng ({winReasons.length})
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  columns={reasonColumns}
                  dataSource={winReasons}
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                />
              )
            },
            {
              key: 'lost',
              label: (
                <span>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
                  Lý Do Thua Hợp Đồng ({lostReasons.length})
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  columns={reasonColumns}
                  dataSource={lostReasons}
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                />
              )
            },
            {
              key: 'competitors',
              label: (
                <span>
                  <TeamOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                  Đối Thủ Cạnh Tranh ({competitors.length})
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  columns={competitorColumns}
                  dataSource={competitors}
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                />
              )
            }
          ]}
        />
      </Card>

      {/* MODAL THÊM / SỬA CHUẨN FORM */}
      <Modal
        title={
          editingItem 
            ? (activeTab === 'competitors' ? 'Chỉnh Sửa Đối Thủ' : 'Chỉnh Sửa Lý Do')
            : (activeTab === 'competitors' ? 'Thêm Mới Đối Thủ Cạnh Tranh' : `Thêm Mới Lý Do ${activeTab === 'win' ? 'Thắng' : 'Thua'}`)
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          {activeTab === 'competitors' ? (
            <>
              <Form.Item
                label="Tên công ty / Đối thủ"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên đối thủ!' }]}
              >
                <Input placeholder="Ví dụ: Công ty Base.vn, MISA..." />
              </Form.Item>

              <Form.Item label="Website đối thủ" name="website">
                <Input placeholder="https://example.com" />
              </Form.Item>

              <Form.Item label="Mức độ đe dọa / Cạnh tranh" name="threat_level">
                <Select
                  options={[
                    { value: 'high', label: 'Rất cao (Thường xuyên đụng độ)' },
                    { value: 'medium', label: 'Trung bình' },
                    { value: 'low', label: 'Thấp (Ít gặp)' }
                  ]}
                />
              </Form.Item>

              <Form.Item label="Điểm mạnh của họ" name="strengths">
                <Input.TextArea rows={2} placeholder="Ví dụ: Giá rẻ, thương hiệu mạnh..." />
              </Form.Item>

              <Form.Item label="Điểm yếu (cơ hội phản công)" name="weaknesses">
                <Input.TextArea rows={2} placeholder="Ví dụ: Dịch vụ bảo hành chậm, giao diện cũ..." />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="Tên lý do"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên lý do!' }]}
              >
                <Input placeholder={activeTab === 'win' ? 'Ví dụ: Tính năng vượt trội, Giá hợp lý...' : 'Ví dụ: Giá cao, Thiếu tính năng...'} />
              </Form.Item>

              <Form.Item label="Mô tả bổ sung" name="description">
                <Input.TextArea rows={3} placeholder="Mô tả chi tiết hoàn cảnh xảy ra..." />
              </Form.Item>
            </>
          )}

          <Form.Item label="Trạng thái áp dụng" name="status">
            <Select
              options={[
                { value: 'active', label: activeTab === 'competitors' ? 'Đang theo dõi' : 'Đang áp dụng' },
                { value: 'inactive', label: activeTab === 'competitors' ? 'Đã ngưng theo dõi' : 'Tạm ngưng' }
              ]}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Danh Mục
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}