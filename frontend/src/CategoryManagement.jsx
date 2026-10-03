import React, { useState, useEffect } from 'react';

const TABS = [
    { key: 'industries', label: ' Ngành Nghề Kinh Doanh', title: 'Ngành nghề' },
    { key: 'company-sizes', label: ' Quy Mô Doanh Nghiệp', title: 'Quy mô doanh nghiệp' },
    { key: 'lead-sources', label: ' Nguồn Khách Hàng (Lead)', title: 'Nguồn lead' },
    { key: 'activity-types', label: ' Loại Hoạt Động', title: 'Loại hoạt động' }
];

const CategoryManagement = () => {
    const [activeTab, setActiveTab] = useState('industries');
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active: true });

    const currentTabInfo = TABS.find(t => t.key === activeTab);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/categories/${activeTab}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setCategories(data.data || []);
        } catch (err) {
            console.error('Lỗi tải danh mục:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [activeTab]);

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({ name: '', code: '', description: '', is_active: true });
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            code: item.code || '',
            description: item.description || '',
            is_active: Boolean(item.is_active)
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingItem
                ? `http://localhost:5001/api/categories/${activeTab}/${editingItem.id}`
                : `http://localhost:5001/api/categories/${activeTab}`;
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) {
                alert('⚠️ ' + data.message);
                return;
            }

            alert('✅ ' + data.message);
            setShowModal(false);
            fetchCategories();
        } catch (err) {
            alert('Lỗi kết nối máy chủ!');
        }
    };

    // Đổi thứ tự sắp xếp trực tiếp (Lên / Xuống)
    const handleMove = async (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const current = categories[index];
        const target = categories[targetIndex];

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/categories/${activeTab}/swap-order`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    id1: current.id,
                    order1: current.sort_order,
                    id2: target.id,
                    order2: target.sort_order
                })
            });

            if (res.ok) fetchCategories();
        } catch (err) {
            alert('Lỗi đổi thứ tự!');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa giá trị danh mục này?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/categories/${activeTab}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (!res.ok) {
                // Báo lỗi rõ ràng khi không thể xóa do ràng buộc
                alert(data.message);
                return;
            }

            alert('✅ ' + data.message);
            fetchCategories();
        } catch (err) {
            alert('Lỗi khi xóa!');
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>🏷️ Khai Báo Danh Mục Dùng Chung (S2-07)</h2>
                    <p style={{ margin: '6px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Chuẩn hóa danh mục ngành nghề, quy mô, nguồn lead để đồng bộ báo cáo toàn công ty
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    style={{
                        padding: '9px 16px', backgroundColor: '#238636', color: '#fff',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    + Thêm {currentTabInfo.title}
                </button>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #30363d', marginBottom: '20px' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '10px 16px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.key ? '2px solid #58a6ff' : '2px solid transparent',
                            color: activeTab === tab.key ? '#58a6ff' : '#8b949e',
                            fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* DATA TABLE */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                            <th style={{ padding: '12px 16px', width: '90px' }}>Thứ tự</th>
                            <th style={{ padding: '12px 16px' }}>Tên hiển thị</th>
                            <th style={{ padding: '12px 16px', width: '150px' }}>Mã viết tắt</th>
                            <th style={{ padding: '12px 16px' }}>Mô tả</th>
                            <th style={{ padding: '12px 16px', width: '130px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', width: '150px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Đang tải dữ liệu...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có bản ghi nào.</td></tr>
                        ) : (
                            categories.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontWeight: 'bold', width: '16px' }}>{item.sort_order}</span>
                                            <button 
                                                disabled={index === 0}
                                                onClick={() => handleMove(index, 'up')}
                                                style={{ background: 'none', border: 'none', color: index === 0 ? '#484f58' : '#58a6ff', cursor: index === 0 ? 'default' : 'pointer', fontSize: '12px' }}
                                            >▲</button>
                                            <button 
                                                disabled={index === categories.length - 1}
                                                onClick={() => handleMove(index, 'down')}
                                                style={{ background: 'none', border: 'none', color: index === categories.length - 1 ? '#484f58' : '#58a6ff', cursor: index === categories.length - 1 ? 'default' : 'pointer', fontSize: '12px' }}
                                            >▼</button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.name}</td>
                                    <td style={{ padding: '12px 16px', color: '#79c0ff', fontFamily: 'monospace' }}>{item.code || '—'}</td>
                                    <td style={{ padding: '12px 16px', color: '#8b949e' }}>{item.description || '—'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            backgroundColor: item.is_active ? '#122317' : '#21262d',
                                            color: item.is_active ? '#3fb950' : '#8b949e',
                                            border: item.is_active ? '1px solid #238636' : '1px solid #30363d'
                                        }}>
                                            {item.is_active ? '● Đang dùng' : '○ Ngừng'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleOpenEdit(item)}
                                            style={{ padding: '4px 8px', marginRight: '6px', backgroundColor: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            ✏️ Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
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

            {/* MODAL THÊM / SỬA */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '450px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            {editingItem ? `✏️ Chỉnh Sửa ${currentTabInfo.title}` : `➕ Thêm Mới ${currentTabInfo.title}`}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên danh mục *</label>
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mã viết tắt (Code)</label>
                                <input
                                    type="text"
                                    placeholder="Tự động sinh nếu để trống"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mô tả chi tiết</label>
                                <textarea
                                    rows="2"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px', resize: 'none' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="is_active_chk"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_chk" style={{ fontSize: '13px', cursor: 'pointer' }}>Kích hoạt sử dụng</label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Dữ Liệu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;