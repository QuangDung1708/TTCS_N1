import React, { useState, useEffect } from 'react';

const DealReasonsAndCompetitors = () => {
    const [activeTab, setActiveTab] = useState('reasons'); // 'reasons' hoặc 'competitors'
    const [reasons, setReasons] = useState([]);
    const [competitors, setCompetitors] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state Lý do Thắng/Thua
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [editingReason, setEditingReason] = useState(null);
    const [reasonForm, setReasonForm] = useState({
        code: '', name: '', type: 'WIN', description: '', sort_order: 1
    });

    // Modal state Đối thủ cạnh tranh
    const [showCompModal, setShowCompModal] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [compForm, setCompForm] = useState({
        code: '', name: '', website: '', strengths: '', weaknesses: '', notes: ''
    });

    // Tải danh sách
    const fetchReasons = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/deal-reasons', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setReasons(data.data || []);
        } catch (err) {
            console.error('Lỗi tải reasons:', err);
        }
    };

    const fetchCompetitors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/competitors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setCompetitors(data.data || []);
        } catch (err) {
            console.error('Lỗi tải competitors:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchReasons(), fetchCompetitors()]);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Thao tác Lưu Lý Do
    const handleSaveReason = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingReason
                ? `http://localhost:5001/api/deal-reasons/${editingReason.id}`
                : 'http://localhost:5001/api/deal-reasons';
            const method = editingReason ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(reasonForm)
            });
            const data = await res.json();
            if (!res.ok) { alert('⚠️ ' + data.message); return; }

            alert(editingReason ? '✅ Đã cập nhật lý do!' : '✅ Đã thêm lý do mới!');
            setShowReasonModal(false);
            fetchReasons();
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    // Thao tác Lưu Đối Thủ
    const handleSaveCompetitor = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingComp
                ? `http://localhost:5001/api/competitors/${editingComp.id}`
                : 'http://localhost:5001/api/competitors';
            const method = editingComp ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(compForm)
            });
            const data = await res.json();
            if (!res.ok) { alert('⚠️ ' + data.message); return; }

            alert(editingComp ? '✅ Đã cập nhật đối thủ!' : '✅ Đã thêm đối thủ mới!');
            setShowCompModal(false);
            fetchCompetitors();
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    const handleDeleteReason = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa lý do này?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/deal-reasons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('✅ Đã xóa!');
                fetchReasons();
            }
        } catch (err) {
            alert('Lỗi khi xóa!');
        }
    };

    const handleDeleteComp = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ đối thủ này?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/competitors/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('✅ Đã xóa!');
                fetchCompetitors();
            }
        } catch (err) {
            alert('Lỗi khi xóa!');
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1400px', margin: '0 auto' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', color: '#f0883e' }}>
                        🎯 Quản Trị Lý Do Thắng/Thua & Đối Thủ Cạnh Tranh (S2-10)
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Đúc kết nguyên nhân chốt đơn và nhận diện đối thủ cạnh tranh để không lặp lại sai lầm trong các chu kỳ bán hàng tiếp theo.
                    </p>
                </div>
                {activeTab === 'reasons' ? (
                    <button
                        onClick={() => {
                            setEditingReason(null);
                            setReasonForm({ code: `REASON_${Date.now()}`, name: '', type: 'WIN', description: '', sort_order: reasons.length + 1 });
                            setShowReasonModal(true);
                        }}
                        style={{ padding: '9px 18px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ➕ Khai Báo Lý Do Mới
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setEditingComp(null);
                            setCompForm({ code: `COMP_${Date.now()}`, name: '', website: '', strengths: '', weaknesses: '', notes: '' });
                            setShowCompModal(true);
                        }}
                        style={{ padding: '9px 18px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ➕ Thêm Đối Thủ Cạnh Tranh
                    </button>
                )}
            </div>

            {/* TAB CHUYỂN ĐỔI (N1-183) */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #30363d', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('reasons')}
                    style={{
                        padding: '10px 18px',
                        backgroundColor: activeTab === 'reasons' ? '#161b22' : 'transparent',
                        color: activeTab === 'reasons' ? '#58a6ff' : '#8b949e',
                        border: '1px solid',
                        borderColor: activeTab === 'reasons' ? '#30363d #30363d transparent #30363d' : 'transparent',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    🏆 Danh Mục Lý Do Thắng & Thua ({reasons.length})
                </button>
                <button
                    onClick={() => setActiveTab('competitors')}
                    style={{
                        padding: '10px 18px',
                        backgroundColor: activeTab === 'competitors' ? '#161b22' : 'transparent',
                        color: activeTab === 'competitors' ? '#58a6ff' : '#8b949e',
                        border: '1px solid',
                        borderColor: activeTab === 'competitors' ? '#30363d #30363d transparent #30363d' : 'transparent',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    ⚔️ Hồ Sơ Đối Thủ Cạnh Tranh ({competitors.length})
                </button>
            </div>

            {/* NỘI DUNG TAB 1: LÝ DO THẮNG / THUA */}
            {activeTab === 'reasons' && (
                <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                                <th style={{ padding: '12px 16px', width: '60px' }}>STT</th>
                                <th style={{ padding: '12px 16px', width: '150px' }}>Phân loại</th>
                                <th style={{ padding: '12px 16px' }}>Tên nguyên nhân / Lý do</th>
                                <th style={{ padding: '12px 16px', width: '150px' }}>Mã định danh</th>
                                <th style={{ padding: '12px 16px' }}>Mô tả giải thích</th>
                                <th style={{ padding: '12px 16px', width: '110px' }}>Trạng thái</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>Đang tải...</td></tr>
                            ) : reasons.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>Chưa có lý do nào được khai báo.</td></tr>
                            ) : (
                                reasons.map((r, idx) => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #21262d' }}>
                                        <td style={{ padding: '12px 16px', color: '#8b949e' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {r.type === 'WIN' ? (
                                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#23863622', color: '#3fb950', border: '1px solid #238636', fontWeight: 'bold' }}>
                                                    🏆 THẮNG (Won)
                                                </span>
                                            ) : (
                                                <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#da363322', color: '#f85149', border: '1px solid #da3633', fontWeight: 'bold' }}>
                                                    ❌ THUA (Lost)
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#e6edf3' }}>{r.name}</td>
                                        <td style={{ padding: '12px 16px', color: '#79c0ff', fontFamily: 'monospace' }}>{r.code}</td>
                                        <td style={{ padding: '12px 16px', color: '#8b949e' }}>{r.description || '—'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {r.is_active ? <span style={{ color: '#3fb950' }}>● Đang dùng</span> : <span style={{ color: '#8b949e' }}>○ Tạm khóa</span>}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingReason(r);
                                                        setReasonForm({ code: r.code, name: r.name, type: r.type, description: r.description || '', sort_order: r.sort_order });
                                                        setShowReasonModal(true);
                                                    }}
                                                    style={{ padding: '3px 8px', backgroundColor: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReason(r.id)}
                                                    style={{ padding: '3px 8px', backgroundColor: '#21262d', color: '#f85149', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* NỘI DUNG TAB 2: ĐỐI THỦ CẠNH TRANH */}
            {activeTab === 'competitors' && (
                <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                                <th style={{ padding: '12px 16px', width: '60px' }}>STT</th>
                                <th style={{ padding: '12px 16px', width: '220px' }}>Tên đối thủ</th>
                                <th style={{ padding: '12px 16px', width: '180px' }}>Website</th>
                                <th style={{ padding: '12px 16px', width: '240px' }}>💪 Điểm mạnh</th>
                                <th style={{ padding: '12px 16px', width: '240px' }}>🎯 Điểm yếu</th>
                                <th style={{ padding: '12px 16px' }}>💡 Chiến lược ứng phó</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>Đang tải...</td></tr>
                            ) : competitors.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>Chưa có đối thủ nào được ghi nhận.</td></tr>
                            ) : (
                                competitors.map((c, idx) => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                                        <td style={{ padding: '12px 16px', color: '#8b949e' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#e6edf3' }}>
                                            {c.name}
                                            <div style={{ fontSize: '11px', color: '#79c0ff', fontFamily: 'monospace' }}>{c.code}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {c.website ? (
                                                <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>
                                                    🔗 {c.website.replace('https://', '').replace('http://', '')}
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#7ee787' }}>{c.strengths || '—'}</td>
                                        <td style={{ padding: '12px 16px', color: '#f85149' }}>{c.weaknesses || '—'}</td>
                                        <td style={{ padding: '12px 16px', color: '#d2a8ff' }}>{c.notes || '—'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingComp(c);
                                                        setCompForm({ code: c.code, name: c.name, website: c.website || '', strengths: c.strengths || '', weaknesses: c.weaknesses || '', notes: c.notes || '' });
                                                        setShowCompModal(true);
                                                    }}
                                                    style={{ padding: '3px 8px', backgroundColor: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteComp(c.id)}
                                                    style={{ padding: '3px 8px', backgroundColor: '#21262d', color: '#f85149', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL LÝ DO THẮNG / THUA (N1-184) */}
            {showReasonModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '480px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            {editingReason ? '✏️ Cập Nhật Lý Do' : '➕ Khai Báo Lý Do Thắng/Thua Mới'}
                        </h3>
                        <form onSubmit={handleSaveReason}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Phân loại kết quả *</label>
                                <select
                                    value={reasonForm.type}
                                    onChange={(e) => setReasonForm({ ...reasonForm, type: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                >
                                    <option value="WIN">🏆 THẮNG (Chốt hợp đồng thành công)</option>
                                    <option value="LOSS">❌ THUA (Thất bại / Khách hàng từ chối)</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Tên lý do nguyên nhân *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Giá bán cạnh tranh, Đối thủ chiết khấu sâu hơn..."
                                    value={reasonForm.name}
                                    onChange={(e) => setReasonForm({ ...reasonForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Mã định danh (Code)</label>
                                <input
                                    type="text"
                                    disabled={Boolean(editingReason)}
                                    placeholder="Tự động sinh nếu để trống"
                                    value={reasonForm.code}
                                    onChange={(e) => setReasonForm({ ...reasonForm, code: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: editingReason ? '#21262d' : '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Mô tả giải thích chi tiết</label>
                                <textarea
                                    rows="2"
                                    placeholder="Hướng dẫn cho nhân viên bán hàng khi chọn lý do này..."
                                    value={reasonForm.description}
                                    onChange={(e) => setReasonForm({ ...reasonForm, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px', resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowReasonModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Dữ Liệu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ĐỐI THỦ CẠNH TRANH (N1-184) */}
            {showCompModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '520px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            {editingComp ? '✏️ Cập Nhật Hồ Sơ Đối Thủ' : '➕ Khai Báo Đối Thủ Cạnh Tranh Mới'}
                        </h3>
                        <form onSubmit={handleSaveCompetitor}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Tên đối thủ cạnh tranh *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Tập đoàn VNPT, Base CRM..."
                                    value={compForm.name}
                                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Website / Trang chủ</label>
                                <input
                                    type="text"
                                    placeholder="VD: https://vnpt.com.vn"
                                    value={compForm.website}
                                    onChange={(e) => setCompForm({ ...compForm, website: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>💪 Điểm mạnh cốt lõi</label>
                                <input
                                    type="text"
                                    placeholder="VD: Giá rẻ, thương hiệu mạnh, nhiều chi nhánh..."
                                    value={compForm.strengths}
                                    onChange={(e) => setCompForm({ ...compForm, strengths: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>🎯 Điểm yếu có thể khai thác</label>
                                <input
                                    type="text"
                                    placeholder="VD: Chăm sóc khách hàng chậm, phần mềm khó dùng..."
                                    value={compForm.weaknesses}
                                    onChange={(e) => setCompForm({ ...compForm, weaknesses: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>💡 Chiến thuật bán hàng ứng phó</label>
                                <textarea
                                    rows="2"
                                    placeholder="Chiến lược cho Sales khi gặp đối thủ này trong quá trình đấu thầu/chào giá..."
                                    value={compForm.notes}
                                    onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px', resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowCompModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Đối Thủ</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealReasonsAndCompetitors;