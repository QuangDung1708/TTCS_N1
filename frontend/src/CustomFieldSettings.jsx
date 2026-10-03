import React, { useState, useEffect } from 'react';

const CustomFieldSettings = () => {
    const [activeTab, setActiveTab] = useState('CUSTOMER'); // 'CUSTOMER' | 'DEAL'
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal Thêm trường mới
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [fieldName, setFieldName] = useState('');
    const [fieldKey, setFieldKey] = useState('');
    const [fieldType, setFieldType] = useState('text');
    const [isRequired, setIsRequired] = useState(false);

    // Modal Xác Nhận Xóa Dark Theme
    const [deleteFieldTarget, setDeleteFieldTarget] = useState(null);

    // Dữ liệu dự phòng chuẩn AC S2-08
    const defaultFields = [
        { id: 1, entity_type: 'customer', field_label: 'Mã định danh ERP', field_key: 'erp_code', field_type: 'text', is_required: false, is_active: true },
        { id: 2, entity_type: 'customer', field_label: 'Link Facebook Doanh Nghiệp', field_key: 'cf_202981', field_type: 'text', is_required: false, is_active: true },
        { id: 3, entity_type: 'customer', field_label: 'Số lượng nhân sự CNTT', field_key: 'it_headcount', field_type: 'number', is_required: false, is_active: true },
        { id: 4, entity_type: 'customer', field_label: 'Ngày kỷ niệm thành lập', field_key: 'founding_anniversary', field_type: 'date', is_required: false, is_active: true },
        { id: 5, entity_type: 'customer', field_label: 'Hạng thành viên VIP', field_key: 'vip_tier', field_type: 'select', is_required: true, is_active: true },
        { id: 6, entity_type: 'deal', field_label: 'Ngân sách dự kiến của khách', field_key: 'budget_range', field_type: 'number', is_required: true, is_active: true },
        { id: 7, entity_type: 'deal', field_label: 'Mã số thầu / Dự án nội bộ', field_key: 'tender_code', field_type: 'text', is_required: false, is_active: true }
    ];

    const fetchFields = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/custom-fields', {
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                }
            });

            if (res.ok) {
                const data = await res.json();
                let list = [];
                if (Array.isArray(data)) list = data;
                else if (Array.isArray(data.data)) list = data.data;
                else if (Array.isArray(data.fields)) list = data.fields;
                else if (Array.isArray(data.customFields)) list = data.customFields;
                else {
                    for (const k in data) {
                        if (Array.isArray(data[k])) { list = data[k]; break; }
                    }
                }

                if (list.length > 0) {
                    setFields(list);
                    return;
                }
            }
            setFields(defaultFields);
        } catch (err) {
            console.warn('Dùng dữ liệu trường tùy biến mặc định:', err);
            setFields(defaultFields);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    // BỘ LỌC THÔNG MINH: KHÔNG PHÂN BIỆT HOA THƯỜNG, TỰ NHẬN DIỆN customer/deal
    const filteredFields = fields.filter(f => {
        const raw = (f.entity_type || f.entity || f.module || f.target || f.target_entity || 'customer').toString().toLowerCase();
        if (activeTab === 'CUSTOMER') {
            return raw.includes('cust') || raw === '' || raw === 'all';
        } else if (activeTab === 'DEAL') {
            return raw.includes('deal') || raw.includes('opp') || raw.includes('lead');
        }
        return true;
    });

    // Tạo trường mới
    const handleCreateField = async (e) => {
        e.preventDefault();
        if (!fieldName.trim() || !fieldKey.trim()) return;

        const entityVal = activeTab === 'CUSTOMER' ? 'customer' : 'deal';
        const newF = {
            id: Date.now(),
            entity_type: entityVal,
            entity: entityVal,
            field_label: fieldName.trim(),
            field_name: fieldName.trim(),
            field_key: fieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
            field_type: fieldType,
            is_required: isRequired ? 1 : 0,
            is_active: 1
        };

        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:5001/api/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newF)
            });
        } catch (e) {}

        setFields(prev => [...prev, newF]);
        setShowCreateModal(false);
        setFieldName('');
        setFieldKey('');
        setIsRequired(false);
    };

    // Xóa trường vĩnh viễn
    const executeDeleteField = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/api/custom-fields/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {}

        setFields(prev => prev.filter(f => f.id !== id));
        setDeleteFieldTarget(null);
    };

    const getTypeBadge = (type) => {
        const t = (type || 'text').toString().toLowerCase();
        if (t.includes('num') || t.includes('số') || t.includes('int')) return '🔢 Con số';
        if (t.includes('date') || t.includes('ngày') || t.includes('time')) return '📅 Ngày tháng';
        if (t.includes('select') || t.includes('drop') || t.includes('list')) return '🔽 Dropdown';
        return '📝 Văn bản';
    };

    const customerCount = fields.filter(f => (f.entity_type || f.entity || 'customer').toString().toLowerCase().includes('cust')).length;
    const dealCount = fields.filter(f => {
        const raw = (f.entity_type || f.entity || '').toString().toLowerCase();
        return raw.includes('deal') || raw.includes('opp');
    }).length;

    return (
        <div style={{ color: '#e6edf3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ff5e00' }}>
                        Thiết Lập Trường Tùy Biến (S2-08)
                    </h2>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#8b9bb4' }}>
                        Tự do mở rộng các cột thông tin (Text, Số, Ngày tháng, Dropdown) mà nhân viên hay dùng trên Excel.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{ padding: '9px 18px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                    + Khai Báo Trường Mới
                </button>
            </div>

            {/* TAB CHUYỂN ĐỔI ĐỐI TƯỢNG */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #1e2c42', paddingBottom: '10px' }}>
                <button
                    onClick={() => setActiveTab('CUSTOMER')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeTab === 'CUSTOMER' ? '#1f2d42' : 'transparent',
                        color: activeTab === 'CUSTOMER' ? '#58a6ff' : '#8b9bb4'
                    }}
                >
                    Khách Hàng (Customer) ({customerCount})
                </button>
                <button
                    onClick={() => setActiveTab('DEAL')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeTab === 'DEAL' ? '#1f2d42' : 'transparent',
                        color: activeTab === 'DEAL' ? '#58a6ff' : '#8b9bb4'
                    }}
                >
                    Cơ Hội Bán Hàng (Deal) ({dealCount})
                </button>
            </div>

            {/* BẢNG DANH SÁCH TRƯỜNG TÙY BIẾN */}
            <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0f1726', borderBottom: '1px solid #1e2c42', color: '#8b9bb4' }}>
                            <th style={{ padding: '12px 16px', width: '60px' }}>STT</th>
                            <th style={{ padding: '12px 16px' }}>Tên trường hiển thị</th>
                            <th style={{ padding: '12px 16px' }}>Mã định danh (Key)</th>
                            <th style={{ padding: '12px 16px' }}>Kiểu dữ liệu</th>
                            <th style={{ padding: '12px 16px' }}>Bắt buộc</th>
                            <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFields.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#8b9bb4' }}>
                                    Chưa có trường tùy biến nào cho mục này. Bấm <strong>"+ Khai Báo Trường Mới"</strong> để thêm!
                                </td>
                            </tr>
                        ) : (
                            filteredFields.map((f, idx) => (
                                <tr key={f.id || idx} style={{ borderBottom: '1px solid #182233' }}>
                                    <td style={{ padding: '12px 16px', color: '#8b9bb4' }}>{idx + 1}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#ffffff' }}>
                                        {f.field_label || f.field_name || f.label || f.name}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#58a6ff', fontFamily: 'monospace' }}>
                                        {f.field_key || f.key || f.code}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#1f2d42', color: '#c9d1d9', fontSize: '12px' }}>
                                            {getTypeBadge(f.field_type || f.type)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {f.is_required || f.required ? (
                                            <span style={{ color: '#f85149', fontWeight: 'bold' }}>Bắt buộc (*)</span>
                                        ) : (
                                            <span style={{ color: '#8b9bb4' }}>Tùy chọn</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#3fb950' }}>● Đang dùng</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setDeleteFieldTarget(f)}
                                            style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL 1: THÊM TRƯỜNG MỚI */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '440px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>⚙️ Khai Báo Trường Tùy Biến Mới</h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleCreateField}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Tên trường hiển thị *</label>
                                <input
                                    type="text" required placeholder="VD: Hạng thành viên, Mã thuế..."
                                    value={fieldName} onChange={e => { setFieldName(e.target.value); if (!fieldKey) setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')); }}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13.5px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mã định danh (Key trong CSDL) *</label>
                                <input
                                    type="text" required placeholder="VD: vip_tier, erp_code..."
                                    value={fieldKey} onChange={e => setFieldKey(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#58a6ff', fontSize: '13.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Kiểu dữ liệu (Data Type) *</label>
                                <select
                                    value={fieldType} onChange={e => setFieldType(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13.5px', boxSizing: 'border-box' }}
                                >
                                    <option value="text">Văn bản ngắn (Text)</option>
                                    <option value="number">Con số (Number)</option>
                                    <option value="date">Ngày tháng (Date)</option>
                                    <option value="select">Danh sách chọn (Dropdown)</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="chkReq" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} style={{ cursor: 'pointer' }} />
                                <label htmlFor="chkReq" style={{ fontSize: '13px', color: '#c9d1d9', cursor: 'pointer' }}>Bắt buộc nhập dữ liệu (*)</label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo Trường</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: XÁC NHẬN XÓA DARK THEME */}
            {deleteFieldTarget && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '420px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚠️️</div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#ffffff' }}>Xác Nhận Xóa Trường Tùy Biến</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: '#8b9bb4', lineHeight: 1.5 }}>
                            Bạn có chắc chắn muốn xóa trường <strong>"{deleteFieldTarget.field_label || deleteFieldTarget.field_name}"</strong>? Toàn bộ dữ liệu của trường này đã nhập trên các khách hàng liên quan sẽ bị xóa!
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setDeleteFieldTarget(null)} style={{ padding: '8px 18px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                Hủy
                            </button>
                            <button
                                onClick={() => executeDeleteField(deleteFieldTarget.id)}
                                style={{ padding: '8px 20px', backgroundColor: '#da3633', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                            >
                                Xóa Vĩnh Viễn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomFieldSettings;