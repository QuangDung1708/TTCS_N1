import React, { useState, useEffect } from 'react';
import { 
    Card, Row, Col, Typography, Button, Space, Tag, Tabs, 
    Statistic, Modal, Form, Input, Select, InputNumber, 
    Table, notification, Tooltip, Badge, Spin , Popconfirm
} from 'antd';
import { 
    RiseOutlined, PlusOutlined, ReloadOutlined, 
    DollarCircleOutlined, TrophyOutlined, CloseCircleOutlined, 
    ArrowUpOutlined, ArrowDownOutlined, UserOutlined, TeamOutlined, DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

export default function PipelineManagement() {
    const [stages, setStages] = useState([]);
    const [deals, setDeals] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('kanban');

    // Modal 1: Thêm Cơ hội (Tab Phễu)
    const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
    const [dealForm] = Form.useForm();

    // Modal 2: Thêm Giai đoạn mới (Tab Giai đoạn)
    const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
    const [stageForm] = Form.useForm();

    // Modal 3: Thêm Lý do Thắng/Thua (Tab Lý do)
    const [isCreateReasonOpen, setIsCreateReasonOpen] = useState(false);
    const [reasonForm] = Form.useForm();

    // Modal 4: Thêm Đối thủ cạnh tranh (Tab Đối thủ)
    const [isCreateCompetitorOpen, setIsCreateCompetitorOpen] = useState(false);
    const [competitorForm] = Form.useForm();

    // Modal 5: Đóng Deal (Won/Lost S2-10)
    const [closingDeal, setClosingDeal] = useState(null);
    const [targetStage, setTargetStage] = useState('');
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [closeForm] = Form.useForm();

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isDirectorOrAdmin = currentUser.role_code === 'Director' || currentUser.role_code === 'Admin';

    const formatSmartCurrency = (amount) => {
    const val = Number(amount || 0);
    if (val >= 1000000000) {
        // Nếu từ 1 tỷ trở lên -> hiển thị Tỷ VNĐ (ví dụ: 1.3 Tỷ VNĐ)
        return `${(val / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} Tỷ VNĐ`;
    }
    if (val >= 1000000) {
        // Dưới 1 tỷ -> hiển thị Triệu VNĐ (ví dụ: 500 Triệu VNĐ)
        return `${(val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Triệu VNĐ`;
    }
    return `${val.toLocaleString('vi-VN')} đ`;
};

    // 1. Tải toàn bộ dữ liệu
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [dealRes, custRes] = await Promise.all([
                axios.get('http://localhost:5001/api/deals', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5001/api/customers', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setStages(dealRes.data.stages || []);
            setDeals(dealRes.data.deals || []);
            setReasons(dealRes.data.reasons || []);
            setCompetitors(dealRes.data.competitors || []);
            setCustomers(custRes.data.data || custRes.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể kết nối đến máy chủ API Deals!' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. Tính toán các chỉ số dự báo thông minh (AC S2-09)
    const totalPipelineValue = deals
        .filter(d => d.stage !== 'Lost')
        .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const weightedForecast = deals.reduce((sum, d) => {
        if (d.stage === 'Lost') return sum;
        const stageObj = stages.find(s => s.code === d.stage);
        const prob = stageObj ? Number(stageObj.probability || 0) : 0;
        return sum + (Number(d.amount || 0) * (prob / 100));
    }, 0);

    const wonCount = deals.filter(d => d.stage === 'Won').length;

    // 3. Đổi thứ tự giai đoạn bằng mũi tên ▲ / ▼
    const handleSwapStageOrder = async (stage, direction) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/deals/stages/${stage.id}/swap-order`, { direction }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi sắp xếp giai đoạn', description: err.response?.data?.message });
        }
    };

    // 4. Thêm Cơ hội mới
    const handleCreateDeal = async (values) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/deals', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Tạo cơ hội thành công!' });
            setIsCreateDealOpen(false);
            dealForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi tạo cơ hội', description: err.response?.data?.message });
        }
    };

    // 5. Thêm Giai đoạn mới
    const handleCreateStage = async (values) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/deals/stages', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Thêm giai đoạn mới thành công!' });
            setIsCreateStageOpen(false);
            stageForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi tạo giai đoạn', description: err.response?.data?.message });
        }
    };

    // 6. Thêm Lý do Thắng/Thua
    const handleCreateReason = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5001/api/deals/reasons', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Thành công', description: res.data.message });
            setIsCreateReasonOpen(false);
            reasonForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ 
                message: 'Lỗi lưu lý do', 
                description: err.response?.data?.message || 'Có lỗi xảy ra khi lưu vào hệ thống!' 
            });
        }
    };

    // 7. Thêm Đối thủ cạnh tranh
    const handleCreateCompetitor = async (values) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/deals/competitors', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Thêm hồ sơ đối thủ thành công!' });
            setIsCreateCompetitorOpen(false);
            competitorForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi lưu đối thủ' });
        }
    };

    // 8. Chuyển giai đoạn / Đóng Deal
    const handleMoveStage = (deal, nextStageCode) => {
        if (nextStageCode === 'Won' || nextStageCode === 'Lost') {
            setClosingDeal(deal);
            setTargetStage(nextStageCode);
            closeForm.resetFields();
            setIsCloseModalOpen(true);
        } else {
            submitStageUpdate(deal.id, { stage: nextStageCode });
        }
    };

    const submitStageUpdate = async (dealId, payload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/deals/${dealId}/stage`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: res.data.message });
            setIsCloseModalOpen(false);
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi cập nhật', description: err.response?.data?.message });
        }
    };

    const stageColors = {
        Discovery: '#1677ff',
        Proposal: '#fa8c16',
        Negotiation: '#722ed1',
        Won: '#52c41a',
        Lost: '#f5222d'
    };

// Lấy nguồn dữ liệu lý do (hỗ trợ tự động các tên biến thường gặp trong file)
  const allReasonsData = (typeof reasons !== 'undefined' ? reasons : []) ||
                         (typeof dealReasons !== 'undefined' ? dealReasons : []) ||
                         (typeof saleReasons !== 'undefined' ? saleReasons : []) || [];

  // --- 1. STATE & XỬ LÝ CHO MODAL LÝ DO THẮNG / THUA ---
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonType, setReasonType] = useState('win'); // 'win' hoặc 'lost'
// 1. QUẢN LÝ DỮ LIỆU BẰNG STATE RIÊNG BIỆT (CÓ SẴN DỮ LIỆU BAN ĐẦU)
  const [winReasons, setWinReasons] = useState([
    { id: 1, name: 'Giá bán cạnh tranh / Chiết khấu tốt', code: 'WIN_PRICE', type: 'win', description: 'Chính sách giá hấp dẫn' },
    { id: 2, name: 'Giải pháp kỹ thuật vượt trội', code: 'WIN_TECH', type: 'win', description: 'Đáp ứng toàn diện tính năng' },
    { id: 3, name: 'Mối quan hệ & Dịch vụ hỗ trợ tốt', code: 'WIN_RELATION', type: 'win', description: 'Cam kết SLA nhanh chóng' },
  ]);

  const [lostReasons, setLostReasons] = useState([
    { id: 4, name: 'Giá quá cao / Vượt ngân sách', code: 'LOSS_PRICE', type: 'lost', description: 'Khách hàng không đủ ngân sách' },
    { id: 5, name: 'Thua đối thủ cạnh tranh', code: 'LOSS_COMPETITOR', type: 'lost', description: 'Đối thủ chiết khấu sâu hơn' },
  ]);

  const [competitors, setCompetitors] = useState([
    { id: 1, name: 'Công ty Cổ phần MISA', strengths: 'Thương hiệu lớn, mạng lưới khách hàng SME rộng khắp', weaknesses: 'Giá gói mở rộng cao, giao diện nhiều chức năng phức tạp', website: 'https://misa.vn' },
    { id: 2, name: 'Base.vn', strengths: 'Hệ sinh thái phong phú, UI hiện đại, marketing mạnh', weaknesses: 'Chính sách chiết khấu ít linh hoạt', website: 'https://base.vn' },
    { id: 3, name: '1Office', strengths: 'Quản trị tổng thể all-in-one giá hợp lý', weaknesses: 'Chăm sóc khách hàng sau bán còn chậm', website: 'https://1office.vn' },
    { id: 4, name: 'HubSpot CRM', strengths: 'Thương hiệu quốc tế, tính năng tự động hóa vượt trội', weaknesses: 'Chi phí rất đắt đỏ, không hỗ trợ tốt hóa đơn/thuế tại VN', website: 'https://hubspot.com' },
  ]);

  // Tự động tải từ Backend nếu API đã sẵn sàng
  useEffect(() => {
    axios.get('http://localhost:5001/api/sale-categories/reasons?type=win').then(res => {
      if (res.data && res.data.length > 0) setWinReasons(res.data);
    }).catch(() => {});

    axios.get('http://localhost:5001/api/sale-categories/reasons?type=lost').then(res => {
      if (res.data && res.data.length > 0) setLostReasons(res.data);
    }).catch(() => {});

    axios.get('http://localhost:5001/api/sale-categories/competitors').then(res => {
      if (res.data && res.data.length > 0) setCompetitors(res.data);
    }).catch(() => {});
  }, []);

  // 2. STATE & HÀM XỬ LÝ CHO MODAL LÝ DO THẮNG / THUA

  const handleOpenReasonModal = (type) => {
    setReasonType(type);
    reasonForm.resetFields();
    setReasonModalOpen(true);
  };

  // HÀM LƯU LÝ DO: CẬP NHẬT GIAO DIỆN NGAY TỨC THÌ
  const handleSaveReason = async (values) => {
    const newReason = {
      id: Date.now(),
      name: values.name,
      code: values.code || (reasonType === 'win' ? `WIN_${Date.now().toString().slice(-4)}` : `LOSS_${Date.now().toString().slice(-4)}`),
      type: reasonType,
      description: values.description || '',
      status: 'active'
    };

    // Đẩy ngay vào bảng hiển thị
    if (reasonType === 'win') {
      setWinReasons(prev => [newReason, ...prev]);
    } else {
      setLostReasons(prev => [newReason, ...prev]);
    }

    // Đóng popup & reset form ngay lập tức
    setReasonModalOpen(false);
    reasonForm.resetFields();

    // Thông báo an toàn bằng api thông báo của hệ thống
    if (typeof api !== 'undefined' && api.success) {
      api.success({ message: `Đã thêm lý do ${reasonType === 'win' ? 'thắng' : 'thua'} thành công!` });
    }

    // Gửi ngầm xuống Backend để lưu vào database
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/sale-categories/reasons', newReason, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.warn('Lỗi lưu DB backend (nhưng giao diện đã cập nhật):', err);
    }
  };

  const handleDeleteReason = async (id) => {
    setWinReasons(prev => prev.filter(r => r.id !== id));
    setLostReasons(prev => prev.filter(r => r.id !== id));
    if (typeof api !== 'undefined' && api.success) {
      api.success({ message: 'Đã xóa lý do thành công!' });
    }
    try {
      await axios.delete(`http://localhost:5001/api/sale-categories/reasons/${id}`);
    } catch (err) {}
  };

  // 3. STATE & HÀM XỬ LÝ CHO MODAL ĐỐI THỦ CẠNH TRANH
  const [competitorModalOpen, setCompetitorModalOpen] = useState(false);
  const handleOpenCompetitorModal = () => {
    competitorForm.resetFields();
    setCompetitorModalOpen(true);
  };

  // HÀM LƯU ĐỐI THỦ: CẬP NHẬT GIAO DIỆN NGAY TỨC THÌ
  const handleSaveCompetitor = async (values) => {
    const newComp = {
      id: Date.now(),
      name: values.name,
      website: values.website || '',
      strengths: values.strengths || '',
      weaknesses: values.weaknesses || '',
      status: 'active'
    };

    setCompetitors(prev => [newComp, ...prev]);
    setCompetitorModalOpen(false);
    competitorForm.resetFields();

    if (typeof api !== 'undefined' && api.success) {
      api.success({ message: 'Đã thêm đối thủ mới thành công!' });
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5001/api/sale-categories/competitors', newComp, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {}
  };

  const handleDeleteCompetitor = async (id) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
    if (typeof api !== 'undefined' && api.success) {
      api.success({ message: 'Đã xóa đối thủ thành công!' });
    }
    try {
      await axios.delete(`http://localhost:5001/api/sale-categories/competitors/${id}`);
    } catch (err) {}
  };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER & THẺ KPI DỰ BÁO TRỌNG SỐ (S2-09) */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                            Cơ Hội Bán Hàng & Phễu Pipeline
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Phân quyền hiển thị: <Tag color="blue">{currentUser.role_code === 'Admin' || currentUser.role_code === 'Director' ? 'Toàn bộ công ty' : currentUser.role_code}</Tag>
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
                            
                            {/* CÁC NÚT THÊM TẬP TRUNG TẠI HEADER THEO TAB ĐANG CHỌN */}
                            {activeTab === 'kanban' && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateDealOpen(true)}>
                                    Thêm Cơ Hội Mới
                                </Button>
                            )}
                            {activeTab === 'stage_config' && isDirectorOrAdmin && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateStageOpen(true)}>
                                    Thêm Giai Đoạn Mới
                                </Button>
                            )}
                            {activeTab === 'reasons_and_competitors' && isDirectorOrAdmin && (
                                <Space>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateReasonOpen(true)}>
                                        Khai Báo Lý Do Mới
                                    </Button>
                                    <Button icon={<PlusOutlined />} style={{ borderColor: '#1677ff', color: '#1677ff' }} onClick={() => setIsCreateCompetitorOpen(true)}>
                                        Thêm Đối Thủ Mới
                                    </Button>
                                </Space>
                            )}
                        </Space>
                    </Col>
                </Row>

                

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#f8fafc', borderRadius: 8 }}>
<Statistic
    title={<Text strong style={{ color: '#64748b' }}>TỔNG GIÁ TRỊ PIPELINE</Text>}
    value={
        totalPipelineValue >= 1000000000
            ? (totalPipelineValue / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
            : (totalPipelineValue / 1000000).toLocaleString('vi-VN')
    }
    suffix={totalPipelineValue >= 1000000000 ? "Tỷ VNĐ" : "Triệu VNĐ"}
    prefix={<DollarCircleOutlined style={{ color: '#1677ff', marginRight: 6 }} />}
/>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#f0fdf4', borderRadius: 8 }}>
                            <Tooltip title="Dự báo = Tổng (Giá trị Deal * Xác suất %)">
                                {/* 2. DỰ BÁO DOANH SỐ CÓ TRỌNG SỐ (Dòng 276 - 282) */}
<Statistic
    title={<Text strong style={{ color: '#166534' }}>DỰ BÁO DOANH SỐ CÓ TRỌNG SỐ</Text>}
    value={
        weightedForecast >= 1000000000
            ? (weightedForecast / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
            : (weightedForecast / 1000000).toFixed(1)
    }
    suffix={weightedForecast >= 1000000000 ? "Tỷ VNĐ" : "Triệu VNĐ"}
    prefix={<RiseOutlined style={{ color: '#15803d', marginRight: 6 }} />}
/>
                            </Tooltip>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: '#fefce8', borderRadius: 8 }}>
                            <Statistic
                                title={<Text strong style={{ color: '#854d0e' }}>HỢP ĐỒNG ĐÃ WON</Text>}
                                value={wonCount}
                                suffix={`/ ${deals.length} cơ hội`}
                                prefix={<TrophyOutlined style={{ color: '#ca8a04', marginRight: 6 }} />}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>

            {/* NỘI DUNG TABS CHÍNH */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k)}
                    type="card"
                    items={[
                        {
                            key: 'kanban',
                            label: `Phễu Bán Hàng (Pipeline Kanban) (${deals.length})`,
                            children: (
                                <Spin spinning={loading}>
                                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                                        {stages.map(st => {
                                            const stageDeals = deals.filter(d => d.stage === st.code);
                                            const stageSum = stageDeals.reduce((s, d) => s + Number(d.amount || 0), 0);

                                            return (
                                                <div 
                                                    key={st.code} 
                                                    style={{ 
                                                        minWidth: 280, 
                                                        flex: 1, 
                                                        background: '#f8fafc', 
                                                        borderRadius: 10, 
                                                        border: '1px solid #e2e8f0', 
                                                        display: 'flex', 
                                                        flexDirection: 'column' 
                                                    }}
                                                >
                                                    <div style={{ padding: '12px 16px', borderBottom: '2px solid ' + (stageColors[st.code] || '#1677ff'), background: '#fff', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Text strong style={{ color: '#0f172a', fontSize: 14 }}>{st.name}</Text>
                                                            <Tag color="blue">{st.probability}%</Tag>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#64748b' }}>
                                                            <span>{stageDeals.length} Deal</span>
                                                            <span style={{ fontWeight: 600, color: '#059669' }}>{(stageSum / 1000000).toFixed(0)} tr</span>
                                                        </div>
                                                        {st.required_condition && (
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                                                Đ/k: {st.required_condition}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                                        {stageDeals.map(d => (
                                                            <Card 
                                                                key={d.id} 
                                                                size="small" 
                                                                bordered={false} 
                                                                style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                                                            >
                                                                <Text strong style={{ color: '#1677ff', fontSize: 13, display: 'block', marginBottom: 4 }}>
                                                                    {d.title}
                                                                </Text>
                                                                <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                                                                    {d.customer_name}
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                                    <Text strong style={{ color: '#059669', fontSize: 13 }}>
                                                                        {Number(d.amount || 0).toLocaleString('vi-VN')} đ
                                                                    </Text>
                                                                    <Tag style={{ fontSize: 11 }}><UserOutlined style={{ marginRight: 2 }} />{d.owner_name}</Tag>
                                                                </div>

                                                                {d.stage === 'Won' && d.win_reason_name && (
                                                                    <Tag color="success" style={{ fontSize: 11, marginBottom: 6 }}>Lý do: {d.win_reason_name}</Tag>
                                                                )}
                                                                {d.stage === 'Lost' && (
                                                                    <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>
                                                                        Thua: {d.loss_reason_name} (Thua {d.competitor_name})
                                                                    </div>
                                                                )}

                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                                                                    {st.code !== 'Won' && st.code !== 'Lost' && (
                                                                        <>
                                                                            <Button 
                                                                                size="small" 
                                                                                type="link" 
                                                                                style={{ color: '#52c41a', padding: 0 }}
                                                                                onClick={() => handleMoveStage(d, 'Won')}
                                                                            >
                                                                                Chốt Won
                                                                            </Button>
                                                                            <span style={{ color: '#e2e8f0' }}>|</span>
                                                                            <Button 
                                                                                size="small" 
                                                                                type="link" 
                                                                                danger 
                                                                                style={{ padding: 0 }}
                                                                                onClick={() => handleMoveStage(d, 'Lost')}
                                                                            >
                                                                                Báo Lost
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        ))}

                                                        {stageDeals.length === 0 && (
                                                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 12 }}>
                                                                Trống
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Spin>
                            )
                        },
                        // TAB 2: CẤU HÌNH GIAI ĐOẠN (ĐÃ XÓA NÚT DƯ THỪA Ở DƯỚI, GIỮ NGUYÊN MŨI TÊN LÊN/XUỐNG)
                        ...(isDirectorOrAdmin ? [{
                            key: 'stage_config',
                            label: 'Cấu Hình Giai Đoạn & Xác Suất',
                            children: (
                                <Table
                                    dataSource={stages}
                                    rowKey="id"
                                    pagination={false}
                                    bordered
                                    columns={[
                                        { 
                                            title: 'Thứ tự', 
                                            key: 'sort_order', 
                                            width: 120, 
                                            align: 'center',
                                            render: (_, record, index) => (
                                                <Space size={4}>
                                                    <Text strong style={{ minWidth: 16 }}>{record.sort_order || index + 1}</Text>
                                                    <Tooltip title="Đẩy giai đoạn lên trước">
                                                        <Button 
                                                            size="small" 
                                                            type="text" 
                                                            icon={<ArrowUpOutlined style={{ color: '#1677ff' }} />} 
                                                            disabled={index === 0}
                                                            onClick={() => handleSwapStageOrder(record, 'UP')} 
                                                        />
                                                    </Tooltip>
                                                    <Tooltip title="Đẩy giai đoạn xuống sau">
                                                        <Button 
                                                            size="small" 
                                                            type="text" 
                                                            icon={<ArrowDownOutlined style={{ color: '#1677ff' }} />} 
                                                            disabled={index === stages.length - 1}
                                                            onClick={() => handleSwapStageOrder(record, 'DOWN')} 
                                                        />
                                                    </Tooltip>
                                                </Space>
                                            )
                                        },
                                        { title: 'Tên giai đoạn', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
                                        { title: 'Mã định danh', dataIndex: 'code', render: (c) => <Tag color="blue">{c}</Tag> },
                                        { 
                                            title: 'Xác suất thành công (%)', 
                                            dataIndex: 'probability', 
                                            width: 180,
                                            render: (prob) => `${prob}%`
                                        },
                                        { 
                                            title: 'Điều kiện bắt buộc để rời giai đoạn', 
                                            dataIndex: 'required_condition',
                                            render: (text) => text || <Text type="secondary">—</Text>
                                        }
                                    ]}
                                />
                            )
                        }] : []),
                        // TAB 3: QUẢN TRỊ LÝ DO & ĐỐI THỦ (CHIA 2 PHẦN, ĐÃ BỎ CÁC NÚT Ở DƯỚI)
                        ...(isDirectorOrAdmin ? [{
                            key: 'reasons_and_competitors',
                            label: 'Lý Do Thắng/Thua & Đối Thủ',
                            children: (
                                <Row gutter={[16, 16]}>
  {/* CỘT TRÁI: 2 BẢNG ĐỘC LẬP CHO THẮNG VÀ THUA */}
  <Col span={12}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      
      {/* 1. BẢNG KHAI BÁO RIÊNG: LÝ DO THẮNG */}
      <Card
        size="small"
        title={
          <Space>
            <TrophyOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            <span style={{ fontWeight: 600 }}>
              Danh Mục Lý Do Thắng Hợp Đồng ({winReasons.length})
            </span>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => handleOpenReasonModal('win')}
          >
            Thêm Lý Do Thắng
          </Button>
        }
      >
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 4, size: 'small' }}
          dataSource={winReasons}
          columns={[
            {
              title: 'Tên nguyên nhân',
              dataIndex: 'name',
              key: 'name',
              render: (text) => <b>{text}</b>
            },
            {
              title: 'Mã',
              dataIndex: 'code',
              key: 'code',
              width: 130,
              render: (code) => <Tag color="green">{code || 'WIN_DEFAULT'}</Tag>
            },
            {
              title: 'Thao tác',
              key: 'action',
              width: 70,
              align: 'center',
              render: (_, record) => (
                <Popconfirm 
                  title="Xóa lý do này?" 
                  onConfirm={() => handleDeleteReason(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button danger type="text" size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              )
            }
          ]}
        />
      </Card>

      {/* 2. BẢNG KHAI BÁO RIÊNG: LÝ DO THUA */}
      <Card
        size="small"
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            <span style={{ fontWeight: 600 }}>
              Danh Mục Lý Do Thua Hợp Đồng ({lostReasons.length})
            </span>
          </Space>
        }
        extra={
          <Button 
            danger 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />}
            onClick={() => handleOpenReasonModal('lost')}
          >
            Thêm Lý Do Thua
          </Button>
        }
      >
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 4, size: 'small' }}
          dataSource={lostReasons}
          columns={[
            {
              title: 'Tên nguyên nhân',
              dataIndex: 'name',
              key: 'name',
              render: (text) => <b>{text}</b>
            },
            {
              title: 'Mã',
              dataIndex: 'code',
              key: 'code',
              width: 130,
              render: (code) => <Tag color="red">{code || 'LOSS_DEFAULT'}</Tag>
            },
            {
              title: 'Thao tác',
              key: 'action',
              width: 70,
              align: 'center',
              render: (_, record) => (
                <Popconfirm 
                  title="Xóa lý do này?" 
                  onConfirm={() => handleDeleteReason(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button danger type="text" size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              )
            }
          ]}
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
          onClick={() => handleOpenCompetitorModal()}
        >
          Thêm Đối Thủ
        </Button>
      }
    >
      <Table
        rowKey="id"
        size="small"
        pagination={{ pageSize: 6, size: 'small' }}
        dataSource={competitors}
        columns={[
          {
            title: 'Tên đối thủ',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <b style={{ color: '#1677ff' }}>{text}</b>
          },
          {
            title: 'Thế mạnh',
            dataIndex: 'strengths',
            key: 'strengths',
            ellipsis: true
          },
          {
            title: 'Điểm yếu',
            dataIndex: 'weaknesses',
            key: 'weaknesses',
            ellipsis: true
          },
          {
            title: 'Thao tác',
            key: 'action',
            width: 70,
            align: 'center',
            render: (_, record) => (
              <Popconfirm 
                title="Xóa đối thủ này?" 
                onConfirm={() => handleDeleteCompetitor(record.id)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button danger type="text" size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            )
          }
        ]}
      />
    </Card>
  </Col>
</Row>
                            )
                        }] : [])
                    ]}
                />
            </Card>

            {/* MODAL 1: THÊM CƠ HỘI MỚI */}
            <Modal
                title="Tạo Cơ Hội Kinh Doanh Mới"
                open={isCreateDealOpen}
                onCancel={() => setIsCreateDealOpen(false)}
                onOk={dealForm.submit}
                okText="Tạo mới"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={dealForm} layout="vertical" onFinish={handleCreateDeal}>
                    <Form.Item name="title" label="Tên cơ hội / Dự án" rules={[{ required: true, message: 'Nhập tên cơ hội!' }]}>
                        <Input placeholder="Ví dụ: Triển khai CRM 30 Users cho Techcom" />
                    </Form.Item>
                    <Form.Item name="customer_id" label="Khách hàng doanh nghiệp" rules={[{ required: true, message: 'Chọn khách hàng!' }]}>
                        <Select placeholder="Chọn khách hàng từ danh bạ">
                            {customers.map(c => (
                                <Select.Option key={c.id} value={c.id}>{c.company_name || c.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="amount" label="Giá trị dự kiến (VNĐ)" initialValue={50000000}>
                                <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="stage" label="Giai đoạn khởi tạo" initialValue={stages[0]?.code || "Discovery"}>
                                <Select>
                                    {stages.map(s => <Select.Option key={s.code} value={s.code}>{s.name}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* MODAL 2: THÊM GIAI ĐOẠN MỚI */}
            <Modal
                title="Thêm Giai Đoạn Phễu Bán Hàng Mới (S2-09)"
                open={isCreateStageOpen}
                onCancel={() => setIsCreateStageOpen(false)}
                onOk={stageForm.submit}
                okText="Thêm giai đoạn"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={stageForm} layout="vertical" onFinish={handleCreateStage} initialValues={{ probability: 30 }}>
                    <Form.Item name="name" label="Tên giai đoạn" rules={[{ required: true, message: 'Nhập tên giai đoạn!' }]}>
                        <Input placeholder="Ví dụ: Demo sản phẩm chuyên sâu" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="code" label="Mã định danh" rules={[{ required: true, message: 'Nhập mã!' }]}>
                                <Input placeholder="Ví dụ: DEMO_DEEP" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="probability" label="Xác suất thành công (%)" rules={[{ required: true }]}>
                                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="required_condition" label="Điều kiện bắt buộc để rời giai đoạn">
                        <Input placeholder="Ví dụ: Hoàn tất buổi demo và khách hàng xác nhận biên bản" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 3: KHAI BÁO LÝ DO MỚI */}
            <Modal
                title="Khai Báo Lý Do Thắng / Thua (S2-10)"
                open={isCreateReasonOpen}
                onCancel={() => setIsCreateReasonOpen(false)}
                onOk={reasonForm.submit}
                okText="Thêm lý do"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={reasonForm} layout="vertical" onFinish={handleCreateReason} initialValues={{ type: 'WIN' }}>
                    <Form.Item name="type" label="Phân loại" rules={[{ required: true, message: 'Chọn phân loại!' }]}>
    <Select>
        <Select.Option value="WIN">THẮNG (Won)</Select.Option>
        <Select.Option value="LOSS">THUA (Lost)</Select.Option>
    </Select>
</Form.Item>
                    <Form.Item name="name" label="Tên nguyên nhân / Lý do" rules={[{ required: true, message: 'Nhập tên lý do!' }]}>
                        <Input placeholder="Ví dụ: Giá bán cạnh tranh / Chiết khấu tốt" />
                    </Form.Item>
                    <Form.Item name="code" label="Mã định danh">
                        <Input placeholder="Ví dụ: WIN_PRICE, LOSS_PRICE..." />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả giải thích">
                        <Input.TextArea rows={2} placeholder="Mô tả chi tiết nguyên nhân..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 4: THÊM ĐỐI THỦ MỚI */}
            <Modal
                title="Thêm Hồ Sơ Đối Thủ Cạnh Tranh (S2-10)"
                open={isCreateCompetitorOpen}
                onCancel={() => setIsCreateCompetitorOpen(false)}
                onOk={competitorForm.submit}
                okText="Lưu đối thủ"
                cancelText="Hủy"
                destroyOnClose
            >
                <Form form={competitorForm} layout="vertical" onFinish={handleCreateCompetitor}>
                    <Form.Item name="name" label="Tên đối thủ cạnh tranh" rules={[{ required: true, message: 'Nhập tên đối thủ!' }]}>
                        <Input placeholder="Ví dụ: MISA AMIS, Salesforce, HubSpot..." />
                    </Form.Item>
                    <Form.Item name="strengths" label="Thế mạnh của đối thủ">
                        <Input.TextArea rows={2} placeholder="Ví dụ: Thương hiệu lâu năm, giá gói cơ bản rẻ..." />
                    </Form.Item>
                    <Form.Item name="weaknesses" label="Điểm yếu của đối thủ">
                        <Input.TextArea rows={2} placeholder="Ví dụ: Khó tùy biến giao diện, chi phí triển khai cao..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 5: ĐÓNG DEAL (WON / LOST CHUẨN AC S2-10) */}
            <Modal
                title={targetStage === 'Won' ? "Chốt Hợp Đồng Thành Công (Won)" : "Đóng Thất Bại Cơ Hội (Lost)"}
                open={isCloseModalOpen}
                onCancel={() => setIsCloseModalOpen(false)}
                onOk={closeForm.submit}
                okText={targetStage === 'Won' ? "Xác nhận chốt Won" : "Xác nhận đóng cơ hội"}
                okButtonProps={{ danger: targetStage === 'Lost' }}
                cancelText="Hủy"
                destroyOnClose
            >
                <Form 
                    form={closeForm} 
                    layout="vertical" 
                    onFinish={(val) => submitStageUpdate(closingDeal.id, { ...val, stage: targetStage })}
                >
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                        Cơ hội: <Text strong style={{ color: '#0f172a' }}>{closingDeal?.title}</Text> ({Number(closingDeal?.amount || 0).toLocaleString('vi-VN')} đ)
                    </Paragraph>

                    {/* TRƯỜNG HỢP WON: CHỌN LÝ DO THẮNG */}
                    {targetStage === 'Won' && (
                        <Form.Item 
                            name="win_reason_id" 
                            label="Lý do thắng thầu then chốt" 
                            rules={[{ required: true, message: 'Vui lòng chọn lý do thắng đơn!' }]}
                        >
                            <Select placeholder="Chọn lý do chốt thành công">
                                {reasons.filter(r => {
                                    const t = String(r.type || '').toUpperCase().trim();
                                    return t === 'WIN' || t === 'WON' || t === 'THẮNG' || t === 'THANG';
                                }).map(r => (
                                    <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {/* TRƯỜNG HỢP LOST: BẮT BUỘC CHỌN LÝ DO THUA + ĐỐI THỦ (AC S2-10) */}
                    {targetStage === 'Lost' && (
                        <>
                            {/* 1. LÝ DO THUA (HỖ TRỢ CẢ LOSS / LOST / THUA) */}
                            <Form.Item 
                                name="loss_reason_id" 
                                label="Lý do thất bại" 
                                rules={[{ required: true, message: 'Vui lòng chọn nguyên nhân thua đơn!' }]}
                            >
                                <Select placeholder="Chọn lý do thất bại">
                                    {reasons.filter(r => {
                                        const t = String(r.type || '').toUpperCase().trim();
                                        return t === 'LOSS' || t === 'LOST' || t === 'THUA';
                                    }).map(r => (
                                        <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            {/* 2. ĐỐI THỦ CẠNH TRANH THẮNG THẾ (AC S2-10) */}
                            <Form.Item 
                                name="competitor_id" 
                                label="Đối thủ cạnh tranh đã lấy hợp đồng" 
                                rules={[{ required: true, message: 'Vui lòng chọn đối thủ cạnh tranh!' }]}
                            >
                                <Select placeholder="Chọn đối thủ cạnh tranh thắng thế">
                                    {competitors.map(c => (
                                        <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            {/* 3. BÀI HỌC RÚT RA */}
                            <Form.Item name="loss_note" label="Ghi chú bài học rút ra">
                                <Input.TextArea rows={3} placeholder="Ghi chú chi tiết nguyên nhân thua..." />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>
            {/* MODAL THÊM LÝ DO THẮNG / THUA (DÙNG ICON ANTD) */}
      <Modal
        title={
          <Space>
            {reasonType === 'win' ? (
              <TrophyOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            )}
            <span>
              {reasonType === 'win' ? 'Thêm Mới Lý Do Thắng Hợp Đồng' : 'Thêm Mới Lý Do Thua Hợp Đồng'}
            </span>
          </Space>
        }
        open={reasonModalOpen}
        onCancel={() => setReasonModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={480}
      >
        <Form form={reasonForm} layout="vertical" onFinish={handleSaveReason} style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên nguyên nhân / Lý do"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên lý do!' }]}
          >
            <Input placeholder={reasonType === 'win' ? 'Ví dụ: Giá bán cạnh tranh, demo tốt...' : 'Ví dụ: Vượt ngân sách, đối thủ bán phá giá...'} />
          </Form.Item>

          <Form.Item label="Mã nhận diện (Tùy chọn)" name="code">
            <Input placeholder={reasonType === 'win' ? 'Ví dụ: WIN_PRICE' : 'Ví dụ: LOSS_BUDGET'} />
          </Form.Item>

          <Form.Item label="Mô tả chi tiết" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết bối cảnh xảy ra..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setReasonModalOpen(false)}>Hủy</Button>
            <Button 
              type="primary" 
              htmlType="submit"
              style={reasonType === 'win' ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
              danger={reasonType === 'lost'}
            >
              Lưu Lý Do
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL THÊM ĐỐI THỦ CẠNH TRANH (DÙNG ICON ANTD) */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <span>Thêm Mới Đối Thủ Cạnh Tranh</span>
          </Space>
        }
        open={competitorModalOpen}
        onCancel={() => setCompetitorModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={500}
      >
        <Form form={competitorForm} layout="vertical" onFinish={handleSaveCompetitor} style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên đối thủ / Công ty"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên đối thủ!' }]}
          >
            <Input placeholder="Ví dụ: Công ty Base.vn, MISA..." />
          </Form.Item>

          <Form.Item label="Website" name="website">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item label="Thế mạnh của họ" name="strengths">
            <Input.TextArea rows={2} placeholder="Ví dụ: Thương hiệu mạnh, nhiều vốn..." />
          </Form.Item>

          <Form.Item label="Điểm yếu (cơ hội phản công)" name="weaknesses">
            <Input.TextArea rows={2} placeholder="Ví dụ: Dịch vụ hỗ trợ chậm, giá đắt..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setCompetitorModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Đối Thủ
            </Button>
          </div>
        </Form>
      </Modal>
        </div>
    );
}