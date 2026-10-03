import React, { useState, useEffect } from 'react';
import CustomerContactsModal from './CustomerContactsModal';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Danh mục master data S2-07
    const [industries, setIndustries] = useState([]);
    const [companySizes, setCompanySizes] = useState([]);
    const [leadSources, setLeadSources] = useState([]);

    // [N1-173] Danh sách các trường tùy biến động của Customer (S2-08)
    const [customFields, setCustomFields] = useState([]);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCust, setNewCust] = useState({
        name: '', tax_code: '', phone: '', email: '',
        industry_id: '', company_size_id: '', lead_source_id: ''
    });
    // Lưu các giá trị trường tùy biến động đang nhập trên form
    const [dynamicValues, setDynamicValues] = useState({});

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setCustomers(data.data || []);
        } catch (err) {
            console.error('Lỗi tải khách hàng:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [indRes, sizeRes, leadRes, cfRes] = await Promise.all([
                fetch('http://localhost:5001/api/categories/industries', { headers }),
                fetch('http://localhost:5001/api/categories/company-sizes', { headers }),
                fetch('http://localhost:5001/api/categories/lead-sources', { headers }),
                fetch('http://localhost:5001/api/custom-fields?entity_type=customer', { headers })
            ]);

            const [indData, sizeData, leadData, cfData] = await Promise.all([
                indRes.json(), sizeRes.json(), leadRes.json(), cfRes.json()
            ]);

            if (indRes.ok) setIndustries((indData.data || []).filter(item => item.is_active));
            if (sizeRes.ok) setCompanySizes((sizeData.data || []).filter(item => item.is_active));
            if (leadRes.ok) setLeadSources((leadData.data || []).filter(item => item.is_active));
            if (cfRes.ok) setCustomFields((cfData.data || []).filter(f => f.is_active));
        } catch (err) {
            console.error('Lỗi nạp metadata:', err);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchMetadata();
    }, []);

    // Xử lý tạo mới khách hàng
    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...newCust,
                custom_values: dynamicValues
            };

            const res = await fetch('http://localhost:5001/api/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                alert('⚠️ ' + (data.message || 'Lỗi khi lưu khách hàng!'));
                return;
            }

            alert('✅ Thêm mới khách hàng thành công!');
            setShowAddModal(false);
            setNewCust({ name: '', tax_code: '', phone: '', email: '', industry_id: '', company_size_id: '', lead_source_id: '' });
            setDynamicValues({});
            fetchCustomers();
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    // [N1-174] XUẤT EXCEL TẢI VỀ TRỰC TIẾP TỪ TRÌNH DUYỆT
    const handleExportExcel = () => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:5001/api/customers/export-excel', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Danh_Sach_Khach_Hang_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => alert('Lỗi tải file Excel!'));
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', color: '#f0883e' }}>
                        Quản Lý Khách Hàng & Người Liên Hệ (S2-02 / S2-07 / S2-08)
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Tự động tích hợp phân loại ngành nghề và các trường tùy biến động của doanh nghiệp
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleExportExcel}
                        style={{
                            padding: '8px 14px', backgroundColor: '#1f6feb', color: '#fff',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        📥 Xuất Excel
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            padding: '8px 16px', backgroundColor: '#238636', color: '#fff',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        ➕ Thêm Khách Hàng
                    </button>
                    <button
                        onClick={fetchCustomers}
                        style={{
                            padding: '8px 14px', backgroundColor: '#21262d', color: '#58a6ff',
                            border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer'
                        }}
                    >
                        🔄 Làm mới
                    </button>
                </div>
            </div>

            {/* BẢNG KHÁCH HÀNG */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                            <th style={{ padding: '12px 16px', width: '50px' }}>ID</th>
                            <th style={{ padding: '12px 16px' }}>Tên công ty</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>Mã số thuế</th>
                            <th style={{ padding: '12px 16px', width: '130px' }}>Số điện thoại</th>
                            <th style={{ padding: '12px 16px' }}>Phân loại</th>
                            <th style={{ padding: '12px 16px', width: '220px' }}>Thuộc tính tùy biến (S2-08)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '160px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Đang tải...</td></tr>
                        ) : customers.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có khách hàng nào.</td></tr>
                        ) : (
                            customers.map((c) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{c.id}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{c.name}</td>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{c.tax_code || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>{c.phone || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', color: '#79c0ff' }}>🏢 {c.industry_name || '—'}</span>
                                            <span style={{ fontSize: '11px', color: '#8b949e' }}>👥 {c.company_size_name || '—'}</span>
                                        </div>
                                    </td>
                                    {/* CỘT HIỂN THỊ CÁC GIÁ TRỊ TÙY BIẾN */}
                                    <td style={{ padding: '12px 16px' }}>
                                        {c.custom_values && Object.keys(c.custom_values).length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {Object.entries(c.custom_values).map(([k, v]) => (
                                                    <span key={k} style={{ padding: '2px 6px', backgroundColor: '#21262d', borderRadius: '4px', fontSize: '11px', border: '1px solid #30363d', color: '#a5d6ff' }}>
                                                        <b>{k}:</b> {v}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#6e7681', fontSize: '12px' }}>Chưa có</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedCustomer(c)}
                                            style={{ padding: '5px 12px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            👥 Người liên hệ
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL LIÊN HỆ */}
            {selectedCustomer && (
                <CustomerContactsModal
                    customer={selectedCustomer}
                    customerId={selectedCustomer.id}
                    customerName={selectedCustomer.name}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}

            {/* MODAL THÊM KHÁCH HÀNG: RENDER ĐỘNG TRƯỜNG TÙY BIẾN */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>🏢 Thêm Mới Khách Hàng Doanh Nghiệp</h3>
                        <form onSubmit={handleCreateCustomer}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên công ty *</label>
                                <input
                                    type="text" required
                                    value={newCust.name}
                                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Số điện thoại</label>
                                <input
                                    type="text"
                                    value={newCust.phone}
                                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            {/* [N1-173] KHỐI RENDER ĐỘNG CÁC TRƯỜNG TÙY BIẾN S2-08 */}
                            {customFields.length > 0 && (
                                <div style={{ borderTop: '1px solid #30363d', paddingTop: '12px', marginTop: '14px', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e3b341', marginBottom: '10px' }}>
                                        ⚙️ Thuộc Tính Tùy Biến (Custom Fields)
                                    </div>
                                    {customFields.map((cf) => (
                                        <div key={cf.id} style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#c9d1d9' }}>
                                                {cf.name} {cf.is_required ? <span style={{ color: '#f85149' }}>*</span> : ''}
                                            </label>

                                            {/* Text input */}
                                            {cf.data_type === 'text' && (
                                                <input
                                                    type="text"
                                                    required={Boolean(cf.is_required)}
                                                    value={dynamicValues[cf.field_key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [cf.field_key]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                                />
                                            )}

                                            {/* Number input */}
                                            {cf.data_type === 'number' && (
                                                <input
                                                    type="number"
                                                    required={Boolean(cf.is_required)}
                                                    value={dynamicValues[cf.field_key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [cf.field_key]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                                />
                                            )}

                                            {/* Date input */}
                                            {cf.data_type === 'date' && (
                                                <input
                                                    type="date"
                                                    required={Boolean(cf.is_required)}
                                                    value={dynamicValues[cf.field_key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [cf.field_key]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                                />
                                            )}

                                            {/* Select Dropdown */}
                                            {cf.data_type === 'select' && (
                                                <select
                                                    required={Boolean(cf.is_required)}
                                                    value={dynamicValues[cf.field_key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [cf.field_key]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                                >
                                                    <option value="">-- Chọn {cf.name} --</option>
                                                    {(cf.options || '').split(',').map((opt, i) => (
                                                        <option key={i} value={opt.trim()}>{opt.trim()}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Khách Hàng</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;