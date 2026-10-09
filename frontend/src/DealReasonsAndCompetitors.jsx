import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Space, Tag, Modal, Form, Input, Typography, Popconfirm, message, Tooltip } from 'antd';
import { 
  TrophyOutlined, CloseCircleOutlined, TeamOutlined, PlusOutlined, 
  DeleteOutlined, EditOutlined, ReloadOutlined, GlobalOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function DealReasonsAndCompetitors() {
  const [loading, setLoading] = useState(false);
  
  // Phân tách 3 nguồn dữ liệu độc lập theo đúng AC
  const [winReasons, setWinReasons] = useState([]);
  const [lostReasons, setLostReasons] = useState([]);
  const [competitors, setCompetitors] = useState([]);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'win' | 'lost' | 'competitor'
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  // Nạp dữ liệu từ backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resWin, resLost, resComp] = await Promise.all([
        axios.get('http://localhost:5001/api/sale-categories/reasons?type=win'),
        axios.get('http://localhost:5001/api/sale-categories/reasons?type=lost'),
        axios.get('http://localhost:5001/api/sale-categories/competitors')
      ]);
      setWinReasons(resWin.data || []);
      setLostReasons(resLost.data || []);
      setCompetitors(resComp.data || []);
    } catch (err) {
      message.error('Lỗi khi nạp dữ liệu danh mục!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal thêm/sửa
  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    form.resetFields();
    if (item) {
      form.setFieldsValue(item);
    }
  };

  // Lưu dữ liệu
  const handleSave = async (values) => {
    try {
      if (modalType === 'competitor') {
        if (editingItem) {
          await axios.put(`http://localhost:5001/api/sale-categories/competitors/${editingItem.id}`, values);
          message.success('Cập nhật đối thủ thành công!');
        } else {
          await axios.post('http://localhost:5001/api/sale-categories/competitors', values);
          message.success('Thêm đối thủ thành công!');
        }
      } else {
        const payload = { ...values, type: modalType };
        if (editingItem) {
          await axios.put(`http://localhost:5001/api/sale-categories/reasons/${editingItem.id}`, payload);
          message.success(`Cập nhật lý do ${modalType === 'win' ? 'thắng' : 'thua'} thành công!`);
        } else {
          await axios.post('http://localhost:5001/api/sale-categories/reasons', payload);
          message.success(`Thêm lý do ${modalType === 'win' ? 'thắng' : 'thua'} thành công!`);
        }
      }
      setModalType(null);
      fetchData();
    } catch (err) {
      message.error('Lỗi khi lưu dữ liệu!');
    }
  };

  // Xóa dữ liệu
  const handleDelete = async (type, id) => {
    try {
      if (type === 'competitor') {
        await axios.delete(`http://localhost:5001/api/sale-categories/competitors/${id}`);
      } else {
        await axios.delete(`http://localhost:5001/api/sale-categories/reasons/${id}`);
      }
      message.success('Đã xóa bản ghi!');
      fetchData();
    } catch (err) {
      message.error('Lỗi khi xóa!');
    }
  };

  // Cột bảng lý do (dùng chung cho bảng Thắng và bảng Thua)
  const getReasonColumns = (type) => [
    {
      title: 'Tên lý do',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">---</Text>
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
            onClick={() => handleOpenModal(type, record)} 
          />
          <Popconfirm
            title="Xóa lý do này?"
            onConfirm={() => handleDelete(type, record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Cột bảng đối thủ cạnh tranh
  const competitorColumns = [
    {
      title: 'Tên đối thủ',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong style={{ color: '#0958d9' }}>{text}</Text>
          {record.website && (
            <div>
              <a href={record.website} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                <GlobalOutlined style={{ marginRight: 4 }} />
                {record.website}
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Điểm mạnh / Lợi thế',
      dataIndex: 'strengths',
      key: 'strengths',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">---</Text>
    },
    {
      title: 'Điểm yếu / Cơ hội',
      dataIndex: 'weaknesses',
      key: 'weaknesses',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">---</Text>
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined style={{ color: '#1677ff' }} />} 
            onClick={() => handleOpenModal('competitor', record)} 
          />
          <Popconfirm
            title="Xóa đối thủ này?"
            onConfirm={() => handleDelete('competitor', record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <Row gutter={[16, 16]}>
        {/* CỘT TRÁI: TÁCH BIỆT RẠCH RÒI 2 BẢNG THẮNG & THUA */}
        <Col span={12}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {/* 1. BẢNG KHAI BÁO RIÊNG LÝ DO THẮNG */}
            <Card
              size="small"
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <span style={{ fontWeight: 600 }}>Lý Do Thắng Hợp Đồng ({winReasons.length})</span>
                </Space>
              }
              extra={
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />} 
                  style={{ backgroundColor: '#52c41a' }}
                  onClick={() => handleOpenModal('win')}
                >
                  Thêm Lý Do Thắng
                </Button>
              }
              styles={{ header: { backgroundColor: '#f6ffed' } }}
            >
              <Table
                rowKey="id"
                size="small"
                columns={getReasonColumns('win')}
                dataSource={winReasons}
                loading={loading}
                pagination={{ pageSize: 4, size: 'small' }}
              />
            </Card>

            {/* 2. BẢNG KHAI BÁO RIÊNG LÝ DO THUA */}
            <Card
              size="small"
              title={
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                  <span style={{ fontWeight: 600 }}>Lý Do Thua Hợp Đồng ({lostReasons.length})</span>
                </Space>
              }
              extra={
                <Button 
                  type="primary" 
                  danger 
                  size="small" 
                  icon={<PlusOutlined />} 
                  onClick={() => handleOpenModal('lost')}
                >
                  Thêm Lý Do Thua
                </Button>
              }
              styles={{ header: { backgroundColor: '#fff1f0' } }}
            >
              <Table
                rowKey="id"
                size="small"
                columns={getReasonColumns('lost')}
                dataSource={lostReasons}
                loading={loading}
                pagination={{ pageSize: 4, size: 'small' }}
              />
            </Card>
          </Space>
        </Col>

        {/* CỘT PHẢI: BẢNG KHAI BÁO ĐỐI THỦ CẠNH TRANH */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Space>
                <TeamOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                <span style={{ fontWeight: 600 }}>Hồ Sơ Đối Thủ Cạnh Tranh ({competitors.length})</span>
              </Space>
            }
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={() => handleOpenModal('competitor')}
              >
                Thêm Đối Thủ
              </Button>
            }
            styles={{ header: { backgroundColor: '#e6f4ff' } }}
          >
            <Table
              rowKey="id"
              size="small"
              columns={competitorColumns}
              dataSource={competitors}
              loading={loading}
              pagination={{ pageSize: 8, size: 'small' }}
            />
          </Card>
        </Col>
      </Row>

      {/* MODAL THÊM / SỬA */}
      <Modal
        title={
          modalType === 'competitor'
            ? (editingItem ? 'Chỉnh Sửa Đối Thủ' : 'Thêm Mới Đối Thủ Cạnh Tranh')
            : modalType === 'win'
            ? (editingItem ? 'Chỉnh Sửa Lý Do Thắng' : 'Thêm Mới Lý Do Thắng')
            : (editingItem ? 'Chỉnh Sửa Lý Do Thua' : 'Thêm Mới Lý Do Thua')
        }
        open={!!modalType}
        onCancel={() => setModalType(null)}
        footer={null}
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          {modalType === 'competitor' ? (
            <>
              <Form.Item label="Tên đối thủ" name="name" rules={[{ required: true, message: 'Nhập tên đối thủ!' }]}>
                <Input placeholder="Ví dụ: Công ty Base.vn, MISA..." />
              </Form.Item>
              <Form.Item label="Website" name="website">
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item label="Điểm mạnh chính" name="strengths">
                <Input.TextArea rows={2} placeholder="Giá rẻ, thương hiệu mạnh..." />
              </Form.Item>
              <Form.Item label="Điểm yếu" name="weaknesses">
                <Input.TextArea rows={2} placeholder="Dịch vụ hỗ trợ chậm..." />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item 
                label={`Tên lý do ${modalType === 'win' ? 'thắng' : 'thua'}`} 
                name="name" 
                rules={[{ required: true, message: 'Vui lòng nhập tên lý do!' }]}
              >
                <Input placeholder={modalType === 'win' ? 'Ví dụ: Giá cạnh tranh, Demo tốt...' : 'Ví dụ: Vượt ngân sách, Thiếu tính năng...'} />
              </Form.Item>
              <Form.Item label="Mô tả chi tiết" name="description">
                <Input.TextArea rows={3} placeholder="Nhập bối cảnh chi tiết..." />
              </Form.Item>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setModalType(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Lại
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}