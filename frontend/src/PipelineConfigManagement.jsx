import React, { useState, useEffect } from 'react';

const PipelineConfigManagement = () => {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingStage, setEditingStage] = useState(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        win_probability: 20,
        exit_condition: 'none',
        is_active: true
    });

    // 1. Tải danh sách giai đoạn
    const fetchStages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/pipeline-stages', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setStages(data.data || []);
        } catch (err) {
            console.error('Lỗi nạp giai đoạn pipeline:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStages();
    }, []);

    // 2. Mở modal thêm hoặc sửa
    const handleOpenModal = (stage = null) => {
        if (stage) {
            setEditingStage(stage);
            setFormData({
                code: stage.code,
                name: stage.name,
                description: stage.description || '',
                win_probability: stage.win_probability,
                exit_condition: stage.exit_condition || 'none',
                is_active: Boolean(stage.is_active)
            });
        } else {
            setEditingStage(null);
            setFormData({
                code: `STAGE_${stages.length + 1}`,
                name: '',
                description: '',
                win_probability: 20,
                exit_condition: 'none',
                is_active: true
            });
        }
        setShowModal(true);
    };

    // 3. Lưu cấu hình giai đoạn (Thêm mới / Sửa)
    const handleSave = async (e) => {
        e.preventDefault();

        // Validation phía client (N1-180)
        const prob = parseInt(formData.win_probability);
        if (isNaN(prob) || prob < 0 || prob > 100) {
            alert('⚠️ Xác suất thắng dự báo phải nằm trong khoảng từ 0% đến 100%!');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = editingStage
                ? `http://localhost:5001/api/pipeline-stages/${editingStage.id}`
                : 'http://localhost:5001/api/pipeline-stages';
            const method = editingStage ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) {
                alert('⚠️ ' + data.message);
                return;
            }

            alert(editingStage ? '✅ Cập nhật giai đoạn thành công!' : '✅ Thêm giai đoạn mới thành công!');
            setShowModal(false);
            fetchStages();
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ!');
        }
    };

    // 4. Đổi thứ tự bước (Lên / Xuống)
    const handleSwapOrder = async (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= stages.length) return;

        const stage1 = stages[index];
        const stage2 = stages[targetIndex];

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/pipeline-stages/swap-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id1: stage1.id, id2: stage2.id })
            });

            if (res.ok) {
                fetchStages();
            } else {
                alert('Lỗi hoán đổi vị trí!');
            }
        } catch (err) {
            alert('Lỗi kết nối khi đổi vị trí!');
        }
    };

    // Helper text cho điều kiện bắt buộc
    const renderConditionBadge = (condition) => {
        switch (condition) {
            case 'require_meeting':
                return <span style={{ color: '#f0883e', fontSize: '12px' }}>📅 Cần có ít nhất 1 cuộc gặp</span>;
            case 'require_quote':
                return <span style={{ color: '#58a6ff', fontSize: '12px' }}>📄 Cần có báo giá được lập</span>;
            case 'require_contact':
                return <span style={{ color: '#a371f7', fontSize: '12px' }}>👤 Cần có người liên hệ chính</span>;
            default:
                return <span style={{ color: '#8b949e', fontSize: '12px' }}>Không có điều kiện</span>;
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1400px', margin: '0 auto' }}>
            {/* TIÊU ĐỀ & NÚT THAO TÁC */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px', color: '#58a6ff' }}>
                        📊 Cấu Hình Pipeline Bán Hàng & Xác Suất Thắng (S2-09)
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Thiết lập chuỗi giai đoạn phễu kinh doanh, xác suất dự báo doanh số và điều kiện bắt buộc khi chuyển bước.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        padding: '9px 18px',
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
                    ➕ Thêm Giai Đoạn Mới
                </button>
            </div>

            {/* SƠ ĐỒ CHUỖI GIAI ĐOẠN DẠNG LUỒNG TRỰC QUAN (VISUAL PIPELINE FLOW - N1-178) */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', marginBottom: '24px', overflowX: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8b949e', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Luồng tiến trình phễu bán hàng (Pipeline Flow Preview)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '800px' }}>
                    {stages.map((st, idx) => (
                        <React.Fragment key={st.id}>
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: st.is_won_stage ? '#238636' : st.is_lost_stage ? '#da3633' : '#21262d',
                                    border: '1px solid #30363d',
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                <div style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {st.name}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: '4px', color: '#79c0ff', fontWeight: '600' }}>
                                    🎯 {st.win_probability}% Thắng
                                </div>
                            </div>
                            {idx < stages.length - 1 && (
                                <div style={{ color: '#8b949e', fontWeight: 'bold', fontSize: '16px' }}>➔</div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* BẢNG CHI TIẾT CẤU HÌNH TỪNG GIAI ĐOẠN */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                            <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}>Thứ tự</th>
                            <th style={{ padding: '12px 16px' }}>Tên giai đoạn</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>Mã (Code)</th>
                            <th style={{ padding: '12px 16px', width: '150px' }}>Xác suất thắng (%)</th>
                            <th style={{ padding: '12px 16px', width: '220px' }}>Điều kiện rời bước (Exit Criteria)</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Đang tải cấu hình pipeline...</td></tr>
                        ) : stages.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có giai đoạn nào được khai báo.</td></tr>
                        ) : (
                            stages.map((st, idx) => (
                                <tr key={st.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{idx + 1}</span>
                                            <button
                                                disabled={idx === 0}
                                                onClick={() => handleSwapOrder(idx, 'up')}
                                                style={{ padding: '2px 6px', backgroundColor: '#21262d', color: idx === 0 ? '#484f58' : '#e6edf3', border: '1px solid #30363d', borderRadius: '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                disabled={idx === stages.length - 1}
                                                onClick={() => handleSwapOrder(idx, 'down')}
                                                style={{ padding: '2px 6px', backgroundColor: '#21262d', color: idx === stages.length - 1 ? '#484f58' : '#e6edf3', border: '1px solid #30363d', borderRadius: '4px', cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer' }}
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#e6edf3' }}>{st.name}</div>
                                        {st.description && <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>{st.description}</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#79c0ff' }}>{st.code}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: '#1f6feb22', border: '1px solid #1f6feb', color: '#58a6ff', fontWeight: 'bold' }}>
                                            {st.win_probability}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {renderConditionBadge(st.exit_condition)}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {st.is_active ? (
                                            <span style={{ color: '#3fb950', fontSize: '12px' }}>● Đang dùng</span>
                                        ) : (
                                            <span style={{ color: '#8b949e', fontSize: '12px' }}>○ Tạm ẩn</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleOpenModal(st)}
                                            style={{
                                                padding: '4px 10px',
                                                backgroundColor: '#21262d',
                                                color: '#58a6ff',
                                                border: '1px solid #30363d',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            ✏️ Chỉnh sửa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL CẤU HÌNH CHI TIẾT GIAI ĐOẠN (N1-179) */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '480px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            {editingStage ? '✏️ Cập Nhật Giai Đoạn Pipeline' : '➕ Khai Báo Giai Đoạn Mới'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Tên giai đoạn *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: 2. Xác định nhu cầu & Thẩm định..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Mã định danh (Code)</label>
                                <input
                                    type="text"
                                    disabled={Boolean(editingStage)}
                                    placeholder="VD: QUALIFIED, PROPOSAL..."
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: editingStage ? '#21262d' : '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>
                                    Xác suất thắng dự báo (%) * (0 - 100%)
                                </label>
                                <input
                                    type="number" required min="0" max="100"
                                    value={formData.win_probability}
                                    onChange={(e) => setFormData({ ...formData, win_probability: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>
                                    Điều kiện bắt buộc để rời giai đoạn này (Exit Criteria)
                                </label>
                                <select
                                    value={formData.exit_condition}
                                    onChange={(e) => setFormData({ ...formData, exit_condition: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                >
                                    <option value="none">Không có điều kiện (Tự do chuyển)</option>
                                    <option value="require_meeting">📅 Bắt buộc có ít nhất 1 cuộc gặp/lịch hẹn đã diễn ra</option>
                                    <option value="require_quote">📄 Bắt buộc đã lập bảng báo giá</option>
                                    <option value="require_contact">👤 Bắt buộc phải gắn người liên hệ chính</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Mô tả mục tiêu giai đoạn</label>
                                <textarea
                                    rows="2"
                                    placeholder="Mô tả tiêu chuẩn hoàn thành bước này..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Lưu Cấu Hình
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineConfigManagement;