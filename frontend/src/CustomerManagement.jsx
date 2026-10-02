import React, { useState, useEffect } from 'react';
// Import đúng tên file CustomerContactModal có sẵn trong src/
import CustomerContactModal from './CustomerContactsModal';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    // State lưu khách hàng đang được mở Modal Người liên hệ (S2-02)
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Danh sách danh mục dùng chung (S2-07)
    const [industries, setIndustries] = useState([]);
    const [companySizes, setCompanySizes] = useState([]);
    const [leadSources, setLeadSources] = useState([]);

    // Modal state thêm khách hàng
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCust, setNewCust] = useState({
        name: '',
        tax_code: '',
        phone: '',
        email: '',
        industry_id: '',
        company_size_id: '',
        lead_source_id: ''
    });

    // 1. Tải danh sách khách hàng
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
            console.error('Lỗi tải danh sách khách hàng:', err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Tải danh mục master data đang kích hoạt (is_active = 1)
    const fetchActiveCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [indRes, sizeRes, leadRes] = await Promise.all([
                fetch('http://localhost:5001/api/categories/industries', { headers }),
                fetch('http://localhost:5001/api/categories/company-sizes', { headers }),
                fetch('http://localhost:5001/api/categories/lead-sources', { headers })
            ]);

            const [indData, sizeData, leadData] = await Promise.all([
                indRes.json(), sizeRes.json(), leadRes.json()
            ]);

            if (indRes.ok) setIndustries((indData.data || []).filter(item => item.is_active));
            if (sizeRes.ok) setCompanySizes((sizeData.data || []).filter(item => item.is_active));
            if (leadRes.ok) setLeadSources((leadData.data || []).filter(item => item.is_active));
        } catch (err) {
            console.error('Lỗi nạp danh mục:', err);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchActiveCategories();
    }, []);

    // 3. Thêm mới khách hàng
    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newCust)
            });

            const data = await res.json();
            if (!res.ok) {
                alert('⚠️ ' + (data.message || 'Lỗi khi lưu khách hàng!'));
                return;
            }

            alert('✅ Thêm mới khách hàng thành công!');
            setShowAddModal(false);
            setNewCust({
                name: '', tax_code: '', phone: '', email: '',
                industry_id: '', company_size_id: '', lead_source_id: ''
            });
            fetchCustomers();
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1400px', margin: '0 auto' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', color: '#f0883e' }}>
                        Quản Lý Khách Hàng & Người Liên Hệ (S2-02)
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Quản lý hồ sơ công ty, phân loại danh mục và phân quyền dữ liệu theo cơ cấu tổ chức.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#238636',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        ➕ Thêm Khách Hàng
                    </button>
                    <button
                        onClick={fetchCustomers}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#21262d',
                            color: '#58a6ff',
                            border: '1px solid #30363d',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
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
                            <th style={{ padding: '12px 16px' }}>Email</th>
                            <th style={{ padding: '12px 16px', width: '220px' }}>Phân loại (S2-07)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '160px' }}>Người liên hệ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Đang tải...</td></tr>
                        ) : customers.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có khách hàng nào trong phạm vi quyền hạn của bạn.</td></tr>
                        ) : (
                            customers.map((c) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{c.id}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#e6edf3' }}>{c.name}</td>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{c.tax_code || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>{c.phone || '—'}</td>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{c.email || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span style={{ fontSize: '12px', color: c.industry_name ? '#79c0ff' : '#6e7681' }}>
                                                🏭 {c.industry_name || 'Chưa phân ngành'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: c.company_size_name ? '#a5d6ff' : '#6e7681' }}>
                                                👥 {c.company_size_name || 'Chưa rõ quy mô'}
                                            </span>
                                            {c.lead_source_name && (
                                                <span style={{ fontSize: '11px', color: '#7ee787' }}>
                                                    🎯 {c.lead_source_name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedCustomer(c)}
                                            style={{
                                                padding: '5px 12px',
                                                backgroundColor: '#238636',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            👥 Quản lý người liên hệ
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL QUẢN LÝ NGƯỜI LIÊN HỆ (Bật lên khi click chọn khách hàng) */}
            {selectedCustomer && (
                <CustomerContactsModal
                    customer={selectedCustomer}
                    customerId={selectedCustomer.id}
                    customerName={selectedCustomer.name}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}

            {/* MODAL THÊM KHÁCH HÀNG */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🏢 Thêm Mới Khách Hàng Doanh Nghiệp
                        </h3>
                        <form onSubmit={handleCreateCustomer}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên công ty / Khách hàng *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Công ty TNHH Ánh Dương"
                                    value={newCust.name}
                                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mã số thuế</label>
                                <input
                                    type="text"
                                    placeholder="VD: 0101234567"
                                    value={newCust.tax_code}
                                    onChange={(e) => setNewCust({ ...newCust, tax_code: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Số điện thoại</label>
                                <input
                                    type="text"
                                    placeholder="VD: 0987654321 hoặc 02083855555"
                                    value={newCust.phone}
                                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Email</label>
                                <input
                                    type="email"
                                    placeholder="VD: contact@anhduong.vn"
                                    value={newCust.email}
                                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            {/* 3 DROPDOWN DANH MỤC DÙNG CHUNG */}
                            <div style={{ borderTop: '1px solid #30363d', paddingTop: '12px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#58a6ff', marginBottom: '10px' }}>
                                    🏷 Phân Loại Doanh Nghiệp (S2-07)
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Ngành nghề kinh doanh</label>
                                    <select
                                        value={newCust.industry_id}
                                        onChange={(e) => setNewCust({ ...newCust, industry_id: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    >
                                        <option value="">-- Chọn ngành nghề --</option>
                                        {industries.map(item => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Quy mô nhân sự</label>
                                    <select
                                        value={newCust.company_size_id}
                                        onChange={(e) => setNewCust({ ...newCust, company_size_id: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    >
                                        <option value="">-- Chọn quy mô doanh nghiệp --</option>
                                        {companySizes.map(item => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Nguồn khách hàng (Lead Source)</label>
                                    <select
                                        value={newCust.lead_source_id}
                                        onChange={(e) => setNewCust({ ...newCust, lead_source_id: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    >
                                        <option value="">-- Chọn nguồn tiếp cận --</option>
                                        {leadSources.map(item => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Lưu Khách Hàng
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;