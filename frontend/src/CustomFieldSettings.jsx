import React, { useState, useEffect } from 'react';

const CustomFieldSettings = () => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [entityType, setEntityType] = useState('customer'); // customer hoặc deal

    const [showModal, setShowModal] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        field_key: '',
        data_type: 'text',
        options: '',
        is_required: false,
        sort_order: 1
    });

    const fetchFields = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/custom-fields?entity_type=${entityType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setFields(data.data || []);
        } catch (err) {
            console.error('Lỗi tải custom fields:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, [entityType]);

    const handleOpenAdd = () => {
        setEditingField(null);
        setFormData({ name: '', field_key: '', data_type: 'text', options: '', is_required: false, sort_order: fields.length + 1 });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingField
                ? `http://localhost:5001/api/custom-fields/${editingField.id}`
                : 'http://localhost:5001/api/custom-fields';
            const method = editingField ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ...formData, entity_type: entityType })
            });

            const data = await res.json();
            if (!res.ok) {
                alert('⚠️ ' + data.message);
                return;
            }

            alert('✅ Lưu cấu hình trường tùy biến thành công!');
            setShowModal(false);
            fetchFields();
        } catch (err) {
            alert('Lỗi kết nối máy chủ!');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa trường tùy biến này? Toàn bộ dữ liệu đã nhập của trường này sẽ bị xóa!')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/custom-fields/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                alert('✅ ' + data.message);
                fetchFields();
            }
        } catch (err) {
            alert('Lỗi khi xóa!');
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>⚙️ Thiết Lập Trường Tùy Biến (S2-08)</h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Tự do mở rộng các cột thông tin (Text, Số, Ngày tháng, Dropdown) mà nhân viên hay dùng trên Excel
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    style={{ padding: '9px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Khai Báo Trường Mới
                </button>
            </div>

            {/* TAB CHỌN MODULE */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #30363d' }}>
                <button
                    onClick={() => setEntityType('customer')}
                    style={{
                        padding: '10px 18px', background: 'none', border: 'none',
                        borderBottom: entityType === 'customer' ? '2px solid #58a6ff' : '2px solid transparent',
                        color: entityType === 'customer' ? '#58a6ff' : '#8b949e',
                        fontWeight: entityType === 'customer' ? 'bold' : 'normal', cursor: 'pointer'
                    }}
                >
                    🏢 Khách Hàng (Customer)
                </button>
                <button
                    onClick={() => setEntityType('deal')}
                    style={{
                        padding: '10px 18px', background: 'none', border: 'none',
                        borderBottom: entityType === 'deal' ? '2px solid #58a6ff' : '2px solid transparent',
                        color: entityType === 'deal' ? '#58a6ff' : '#8b949e',
                        fontWeight: entityType === 'deal' ? 'bold' : 'normal', cursor: 'pointer'
                    }}
                >
                    💼 Cơ Hội Bán Hàng (Deal)
                </button>
            </div>

            {/* BẢNG DANH SÁCH */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                            <th style={{ padding: '12px 16px', width: '60px' }}>STT</th>
                            <th style={{ padding: '12px 16px' }}>Tên trường hiển thị</th>
                            <th style={{ padding: '12px 16px', width: '160px' }}>Mã định danh (Key)</th>
                            <th style={{ padding: '12px 16px', width: '140px' }}>Kiểu dữ liệu</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>Bắt buộc</th>
                            <th style={{ padding: '12px 16px', width: '120px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Đang tải...</td></tr>
                        ) : fields.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có trường tùy biến nào được tạo cho module này.</td></tr>
                        ) : (
                            fields.map((f, idx) => (
                                <tr key={f.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{idx + 1}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{f.name}</td>
                                    <td style={{ padding: '12px 16px', color: '#79c0ff', fontFamily: 'monospace' }}>{f.field_key}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#21262d', fontSize: '12px', border: '1px solid #30363d' }}>
                                            {f.data_type === 'text' && '📝 Văn bản'}
                                            {f.data_type === 'number' && '🔢 Con số'}
                                            {f.data_type === 'date' && '📅 Ngày tháng'}
                                            {f.data_type === 'select' && '🔽 Dropdown'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {f.is_required ? <span style={{ color: '#f85149', fontWeight: 'bold' }}>Bắt buộc (*)</span> : <span style={{ color: '#8b949e' }}>Tùy chọn</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ color: f.is_active ? '#3fb950' : '#8b949e' }}>
                                            {f.is_active ? '● Đang dùng' : '○ Tắt'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            style={{ padding: '4px 8px', backgroundColor: '#21262d', color: '#f85149', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            🗑️ Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL THÊM TRƯỜNG MỚI */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '460px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>➕ Khai Báo Trường Tùy Biến Mới</h3>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên trường hiển thị *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Mã số thuế cá nhân, Ngày bàn giao"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Kiểu dữ liệu *</label>
                                <select
                                    value={formData.data_type}
                                    onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                >
                                    <option value="text">Văn bản (Text ngắn / Mã)</option>
                                    <option value="number">Con số (Số nguyên, doanh thu, số lượng)</option>
                                    <option value="date">Ngày tháng (Date picker)</option>
                                    <option value="select">Danh sách lựa chọn (Dropdown menu)</option>
                                </select>
                            </div>

                            {formData.data_type === 'select' && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#79c0ff' }}>
                                        Các lựa chọn (Cách nhau bởi dấu phẩy) *
                                    </label>
                                    <input
                                        type="text" required
                                        placeholder="VD: Kim Cương, Vàng, Bạc, Đồng"
                                        value={formData.options}
                                        onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="is_req_chk"
                                    checked={formData.is_required}
                                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                                />
                                <label htmlFor="is_req_chk" style={{ fontSize: '13px', cursor: 'pointer', color: '#f85149', fontWeight: 'bold' }}>
                                    Đặt làm trường bắt buộc nhập (*)
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Trường</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomFieldSettings;