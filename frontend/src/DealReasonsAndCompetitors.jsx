import React, { useState, useEffect } from 'react';

const DealReasonsAndCompetitors = () => {
    const [activeTab, setActiveTab] = useState('reasons'); // 'reasons' | 'competitors'
    const [reasons, setReasons] = useState([]);
    const [competitors, setCompetitors] = useState([]);

    // Modal Create/Edit States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('WIN');
    const [description, setDescription] = useState('');

    // State Modal Xác Nhận Xóa Dark Theme
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Dữ liệu mẫu chuẩn AC S2-10
    const defaultReasons = [
        { id: 1, type: 'WIN', name: 'Giá bán cạnh tranh / Chiết khấu tốt', code: 'WIN_PRICE', description: 'Mức giá phù hợp ngân sách khách hàng', is_active: true },
        { id: 2, type: 'WIN', name: 'Giải pháp kỹ thuật vượt trội', code: 'WIN_TECH', description: 'Tính năng đáp ứng sát nhất nhu cầu thực tế', is_active: true },
        { id: 3, type: 'WIN', name: 'Mối quan hệ & Dịch vụ hỗ trợ tốt', code: 'WIN_RELATION', description: 'Đội ngũ tư vấn tận tâm, phản hồi nhanh chóng', is_active: true },
        { id: 4, type: 'LOSS', name: 'Giá quá cao / Vượt ngân sách', code: 'LOSS_PRICE', description: 'Khách hàng không đủ ngân sách chi trả', is_active: true },
        { id: 5, type: 'LOSS', name: 'Thua đối thủ cạnh tranh', code: 'LOSS_COMPETITOR', description: 'Đối thủ có ưu thế giá hoặc mối quan hệ mật thiết hơn', is_active: true },
        { id: 6, type: 'LOSS', name: 'Thiếu tính năng cốt lõi theo yêu cầu', code: 'LOSS_FEATURE', description: 'Hệ thống chưa đáp ứng một số quy trình chuyên biệt', is_active: true },
        { id: 7, type: 'LOSS', name: 'Khách hàng tạm hoãn / Hủy dự án', code: 'LOSS_POSTPONE', description: 'Cơ cấu nội bộ khách hàng thay đổi hoặc cắt giảm chi phí', is_active: true },
        { id: 8, type: 'LOSS', name: 'Khách hàng cắt giảm ngân sách do tái cấu trúc', code: 'LOSS_BUDGET_CUT', description: 'Biến động thị trường', is_active: true }
    ];

    const defaultCompetitors = [
        { id: 1, name: 'Công ty Cổ phần MISA', strengths: 'Thương hiệu phổ biến, giá thành rẻ cho SME', weaknesses: 'Thiếu tính năng tùy biến sâu B2B', is_active: true },
        { id: 2, name: 'Base.vn', strengths: 'Hệ sinh thái nhiều ứng dụng, UI hiện đại', weaknesses: 'Quy trình CRM bán hàng chưa chuyên sâu B2B', is_active: true },
        { id: 3, name: 'HubSpot CRM', strengths: 'Marketing Automation rất mạnh, chuẩn quốc tế', weaknesses: 'Chi phí cực kỳ cao khi tăng số lượng liên hệ', is_active: true },
        { id: 4, name: 'Salesforce', strengths: 'Khả năng tùy biến và mở rộng vô hạn cho tập đoàn', weaknesses: 'Quá phức tạp, chi phí triển khai và bảo trì đắt đỏ', is_active: true }
    ];

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resR, resC] = await Promise.allSettled([
                fetch('http://localhost:5001/api/deal-reasons', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('http://localhost:5001/api/competitors', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (resR.status === 'fulfilled' && resR.value.ok) {
                const d = await resR.value.json();
                const list = Array.isArray(d) ? d : (d.reasons || d.data || []);
                setReasons(list.length > 0 ? list : defaultReasons);
            } else {
                setReasons(defaultReasons);
            }

            if (resC.status === 'fulfilled' && resC.value.ok) {
                const d = await resC.value.json();
                const list = Array.isArray(d) ? d : (d.competitors || d.data || []);
                setCompetitors(list.length > 0 ? list : defaultCompetitors);
            } else {
                setCompetitors(defaultCompetitors);
            }
        } catch (err) {
            setReasons(defaultReasons);
            setCompetitors(defaultCompetitors);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Tạo lý do mới
    const handleCreateReason = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const newR = {
            id: Date.now(),
            type,
            name: name.trim(),
            code: code.trim().toUpperCase() || `REASON_${Date.now()}`,
            description: description.trim() || '—',
            is_active: true
        };

        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:5001/api/deal-reasons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newR)
            });
        } catch (e) {}

        setReasons(prev => [...prev, newR]);
        setShowCreateModal(false);
        setName('');
        setCode('');
        setDescription('');
    };

    // Xóa lý do
    const executeDeleteReason = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:5001/api/deal-reasons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {}

        setReasons(prev => prev.filter(r => r.id !== id));
        setDeleteTarget(null);
    };

    return (
        <div style={{ color: '#e6edf3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#ff5e00' }}>
                        Quản Trị Lý Do Thắng/Thua & Đối Thủ Cạnh Tranh (S2-10)
                    </h2>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#8b9bb4' }}>
                        Đúc kết nguyên nhân chốt đơn và nhận diện đối thủ cạnh tranh để không lặp lại sai lầm trong các chu kỳ bán hàng tiếp theo.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{ padding: '9px 18px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                    + Khai Báo Lý Do Mới
                </button>
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #1e2c42', paddingBottom: '10px' }}>
                <button
                    onClick={() => setActiveTab('reasons')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeTab === 'reasons' ? '#1f2d42' : 'transparent',
                        color: activeTab === 'reasons' ? '#58a6ff' : '#8b9bb4'
                    }}
                >
                    Danh Mục Lý Do Thắng & Thua ({reasons.length})
                </button>
                <button
                    onClick={() => setActiveTab('competitors')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeTab === 'competitors' ? '#1f2d42' : 'transparent',
                        color: activeTab === 'competitors' ? '#58a6ff' : '#8b9bb4'
                    }}
                >
                    Hồ Sơ Đối Thủ Cạnh Tranh ({competitors.length})
                </button>
            </div>

            {/* NỘI DUNG TAB 1: DANH MỤC LÝ DO */}
            {activeTab === 'reasons' && (
                <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0f1726', borderBottom: '1px solid #1e2c42', color: '#8b9bb4' }}>
                                <th style={{ padding: '12px 14px', width: '50px' }}>STT</th>
                                <th style={{ padding: '12px 14px', width: '150px' }}>Phân loại</th>
                                <th style={{ padding: '12px 14px' }}>Tên nguyên nhân / Lý do</th>
                                <th style={{ padding: '12px 14px' }}>Mã định danh</th>
                                <th style={{ padding: '12px 14px' }}>Mô tả giải thích</th>
                                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reasons.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #182233' }}>
                                    <td style={{ padding: '12px 14px', color: '#8b9bb4' }}>{idx + 1}</td>
                                    
                                    {/* CỘT PHÂN LOẠI — ĐÃ FIX TRIỆT ĐỂ LỖI GÃY VIỀN TRÊN DƯỚI */}
                                    <td style={{ padding: '12px 14px' }}>
                                        {item.type === 'WIN' ? (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                whiteSpace: 'nowrap',
                                                backgroundColor: '#0d2818',
                                                color: '#3fb950',
                                                border: '1px solid #238636',
                                                boxSizing: 'border-box'
                                            }}>
                                                🏆 THẮNG (Won)
                                            </span>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                whiteSpace: 'nowrap',
                                                backgroundColor: '#2c0e11',
                                                color: '#f85149',
                                                border: '1px solid #da3633',
                                                boxSizing: 'border-box'
                                            }}>
                                                ❌ THUA (Lost)
                                            </span>
                                        )}
                                    </td>

                                    <td style={{ padding: '12px 14px', fontWeight: '600', color: '#ffffff' }}>{item.name}</td>
                                    <td style={{ padding: '12px 14px', color: '#58a6ff', fontFamily: 'monospace' }}>{item.code}</td>
                                    <td style={{ padding: '12px 14px', color: '#8b9bb4' }}>{item.description || '—'}</td>
                                    <td style={{ padding: '12px 14px', color: '#3fb950' }}>● Đang dùng</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setDeleteTarget(item)}
                                            style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '13px' }}
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* NỘI DUNG TAB 2: ĐỐI THỦ CẠNH TRANH */}
            {activeTab === 'competitors' && (
                <div style={{ backgroundColor: '#121927', border: '1px solid #1e2c42', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0f1726', borderBottom: '1px solid #1e2c42', color: '#8b9bb4' }}>
                                <th style={{ padding: '12px 14px', width: '50px' }}>STT</th>
                                <th style={{ padding: '12px 14px' }}>Tên đối thủ cạnh tranh</th>
                                <th style={{ padding: '12px 14px' }}>Thế mạnh cạnh tranh</th>
                                <th style={{ padding: '12px 14px' }}>Điểm yếu cần khai thác</th>
                                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {competitors.map((c, idx) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #182233' }}>
                                    <td style={{ padding: '12px 14px', color: '#8b9bb4' }}>{idx + 1}</td>
                                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#ffffff' }}>{c.name}</td>
                                    <td style={{ padding: '12px 14px', color: '#3fb950' }}>{c.strengths}</td>
                                    <td style={{ padding: '12px 14px', color: '#f85149' }}>{c.weaknesses}</td>
                                    <td style={{ padding: '12px 14px', color: '#3fb950' }}>● Đang theo dõi</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL 1: TẠO LÝ DO MỚI */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '430px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff' }}>🎯 Khai Báo Lý Do Mới</h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#8b9bb4', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleCreateReason}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Phân loại *</label>
                                <select
                                    value={type} onChange={e => setType(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13.5px', boxSizing: 'border-box' }}
                                >
                                    <option value="WIN">🏆 Lý do Thắng hợp đồng (Won)</option>
                                    <option value="LOSS">❌ Lý do Thua hợp đồng (Lost)</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Tên nguyên nhân / Lý do *</label>
                                <input
                                    type="text" required placeholder="VD: Giá bán cạnh tranh, Thua đối thủ X..."
                                    value={name} onChange={e => setName(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13.5px', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mã định danh (Code)</label>
                                <input
                                    type="text" placeholder="VD: WIN_CUSTOM, LOSS_BUDGET..."
                                    value={code} onChange={e => setCode(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#58a6ff', fontSize: '13.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontSize: '12.5px', color: '#8b9bb4', marginBottom: '6px' }}>Mô tả giải thích</label>
                                <textarea
                                    rows="2" placeholder="Ghi chú thêm chi tiết về nguyên nhân này..."
                                    value={description} onChange={e => setDescription(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', backgroundColor: '#0f1726', border: '1px solid #27374f', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 20px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Lý Do</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: XÁC NHẬN XÓA LÝ DO DARK THEME */}
            {deleteTarget && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#162235', border: '1px solid #27374f', borderRadius: '14px', width: '380px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', marginBottom: '10px' }}></div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#ffffff' }}>Xác Nhận Xóa Lý Do</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: '#8b9bb4' }}>
                            Bạn có chắc chắn muốn xóa lý do <strong>"{deleteTarget.name}"</strong> không?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ padding: '8px 18px', backgroundColor: '#30363d', color: '#c9d1d9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                Hủy
                            </button>
                            <button
                                onClick={() => executeDeleteReason(deleteTarget.id)}
                                style={{ padding: '8px 20px', backgroundColor: '#da3633', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                            >
                                Xác Nhận Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealReasonsAndCompetitors;