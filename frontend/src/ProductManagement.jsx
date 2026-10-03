import React, { useState, useEffect } from 'react';

export default function ProductManagement() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Lấy thông tin user hiện tại để check vai trò Giám đốc
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    });
    const isDirector = currentUser?.role_id === 1;

    const [formData, setFormData] = useState({
        code: '', name: '', type: 'one_time', unit: 'Gói',
        list_price: '', floor_price: '', cost_price: ''
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams({
                search,
                ...(typeFilter && { type: typeFilter })
            }).toString();

            const res = await fetch(`http://localhost:5001/api/products?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (err) {
            console.error('Lỗi tải sản phẩm:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [typeFilter]);

    const handleOpenModal = (prod = null) => {
        setErrorMsg('');
        if (prod) {
            setEditingProduct(prod);
            setFormData({
                code: prod.code,
                name: prod.name,
                type: prod.type,
                unit: prod.unit,
                list_price: prod.list_price,
                floor_price: prod.floor_price,
                cost_price: prod.cost_price !== undefined ? prod.cost_price : ''
            });
        } else {
            setEditingProduct(null);
            setFormData({
                code: '', name: '', type: 'one_time', unit: 'Gói',
                list_price: '', floor_price: '', cost_price: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (parseFloat(formData.floor_price) > parseFloat(formData.list_price)) {
            setErrorMsg('⚠️ Nghiệp vụ vi phạm: Giá sàn không được lớn hơn Giá niêm yết!');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = editingProduct
                ? `http://localhost:5001/api/products/${editingProduct.id}`
                : 'http://localhost:5001/api/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu sản phẩm!');

            setShowModal(false);
            fetchProducts();
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/products/${id}/toggle-status`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) fetchProducts();
            else alert(data.message);
        } catch (err) {
            alert('Lỗi khi đổi trạng thái sản phẩm!');
        }
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                        📦 Danh Mục Sản Phẩm & Bảng Giá Chuẩn (S2-05)
                    </h2>
                    <span style={{ fontSize: '13px', color: '#8b949e' }}>
                        Mọi báo giá kinh doanh bắt buộc xuất phát từ bảng giá niêm yết này
                    </span>
                </div>
                {isDirector && (
                    <button
                        onClick={() => handleOpenModal()}
                        style={{
                            padding: '8px 16px', backgroundColor: '#238636', color: '#fff',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        + Khai Báo Sản Phẩm Mới
                    </button>
                )}
            </div>

            {/* Thanh Tìm Kiếm & Bộ Lọc */}
            <div style={{
                display: 'flex', gap: '12px', backgroundColor: '#161b22', padding: '16px',
                borderRadius: '8px', border: '1px solid #30363d', marginBottom: '20px'
            }}>
                <input
                    type="text"
                    placeholder="Tìm theo mã hoặc tên sản phẩm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                    style={{ padding: '8px 12px', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', flex: 1 }}
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ padding: '8px 12px', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px' }}
                >
                    <option value="">Tất cả hình thức</option>
                    <option value="one_time">Sản phẩm một lần</option>
                    <option value="subscription">Dịch vụ thuê bao</option>
                </select>
                <button
                    onClick={fetchProducts}
                    style={{ padding: '8px 16px', backgroundColor: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                >
                    🔍 Tìm kiếm
                </button>
            </div>

            {/* Bảng Danh Sách */}
            <div style={{ backgroundColor: '#161b22', borderRadius: '8px', border: '1px solid #30363d', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d' }}>
                        <tr>
                            <th style={{ padding: '12px' }}>Mã SP</th>
                            <th style={{ padding: '12px' }}>Tên Sản Phẩm / Dịch Vụ</th>
                            <th style={{ padding: '12px' }}>Hình Thức</th>
                            <th style={{ padding: '12px' }}>ĐVT</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Giá Niêm Yết</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Giá Sàn (Floor)</th>
                            {isDirector && <th style={{ padding: '12px', textAlign: 'right', color: '#e3b341' }}>🔒 Giá Vốn (Cost)</th>}
                            <th style={{ padding: '12px', textAlign: 'center' }}>Trạng Thái</th>
                            {isDirector && <th style={{ padding: '12px', textAlign: 'center' }}>Thao Tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={isDirector ? 9 : 7} style={{ padding: '30px', textAlign: 'center' }}>Đang tải danh mục...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={isDirector ? 9 : 7} style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Không tìm thấy sản phẩm nào.</td></tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#58a6ff' }}>{p.code}</td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{p.name}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
                                            backgroundColor: p.type === 'subscription' ? '#1f242c' : '#232b21',
                                            color: p.type === 'subscription' ? '#58a6ff' : '#7ee787'
                                        }}>
                                            {p.type === 'subscription' ? 'Dịch vụ thuê bao' : 'Bán một lần'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>{p.unit}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                        {Number(p.list_price).toLocaleString('vi-VN')} đ
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#f85149' }}>
                                        {Number(p.floor_price).toLocaleString('vi-VN')} đ
                                    </td>
                                    {isDirector && (
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#e3b341', fontWeight: '500' }}>
                                            {Number(p.cost_price || 0).toLocaleString('vi-VN')} đ
                                        </td>
                                    )}
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                            backgroundColor: p.status === 'active' ? '#1f4827' : '#3d1d1d',
                                            color: p.status === 'active' ? '#7ee787' : '#f85149'
                                        }}>
                                            {p.status === 'active' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                                        </span>
                                    </td>
                                    {isDirector && (
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleOpenModal(p)}
                                                style={{ padding: '4px 8px', marginRight: '6px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                ✏️ Sửa
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(p.id)}
                                                title="Chỉ ngừng kinh doanh, không xóa cứng để đảm bảo toàn vẹn báo giá"
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: p.status === 'active' ? '#3d1d1d' : '#1f4827',
                                                    color: p.status === 'active' ? '#f85149' : '#7ee787',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer'
                                                }}
                                            >
                                                {p.status === 'active' ? 'Ngừng bán' : 'Mở lại'}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form Thêm / Sửa Sản Phẩm (N1-154) */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1200
                }}>
                    <div style={{
                        backgroundColor: '#161b22', border: '1px solid #30363d',
                        borderRadius: '8px', width: '480px', padding: '24px', color: '#e6edf3'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
                            {editingProduct ? '✏️ Cập Nhật Sản Phẩm' : '📦 Khai Báo Sản Phẩm Mới'}
                        </h3>

                        {errorMsg && (
                            <div style={{ padding: '10px', backgroundColor: '#3d1d1d', border: '1px solid #f85149', borderRadius: '6px', color: '#f85149', marginBottom: '16px', fontSize: '13px' }}>
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Mã sản phẩm *</label>
                                <input
                                    type="text" required disabled={!!editingProduct}
                                    placeholder="VD: CRM-PRO"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên sản phẩm / dịch vụ *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Gói CRM Cao Cấp"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Hình thức</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    >
                                        <option value="one_time">Bán một lần</option>
                                        <option value="subscription">Thuê bao</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Đơn vị tính *</label>
                                    <input
                                        type="text" required
                                        placeholder="VD: Gói, Tháng..."
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Giá niêm yết (VNĐ) *</label>
                                    <input
                                        type="number" required min="0"
                                        value={formData.list_price}
                                        onChange={(e) => setFormData({ ...formData, list_price: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Giá sàn (Floor) *</label>
                                    <input
                                        type="number" required min="0"
                                        title="Giá bán tối thiểu không cần duyệt chiết khấu"
                                        value={formData.floor_price}
                                        onChange={(e) => setFormData({ ...formData, floor_price: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                    />
                                </div>
                            </div>

                            {isDirector && (
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#e3b341' }}>
                                        🔒 Giá vốn (Chỉ Giám đốc được xem & sửa)
                                    </label>
                                    <input
                                        type="number" min="0"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#e3b341', border: '1px solid #d29922', borderRadius: '6px' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button" onClick={() => setShowModal(false)}
                                    style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Lưu Sản Phẩm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}