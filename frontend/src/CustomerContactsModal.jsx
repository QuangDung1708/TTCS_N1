import React, { useState, useEffect } from 'react';
import { 
    getContactsByCustomer, 
    createContact, 
    updateContact, 
    transferContact, 
    deleteContact 
} from './api';

// Định nghĩa màu sắc và nhãn hiển thị cho 4 vai trò quyết định mua (AC 2)
const BUYING_ROLES = {
    DECISION_MAKER: { label: 'Người quyết định', bg: '#722ed1', text: '#fff' },
    INFLUENCER: { label: 'Người ảnh hưởng', bg: '#1890ff', text: '#fff' },
    END_USER: { label: 'Người dùng cuối', bg: '#52c41a', text: '#fff' },
    BLOCKER: { label: 'Người cản trở', bg: '#f5222d', text: '#fff' }
};

export default function CustomerContactsModal({ customer, customerList = [], onClose }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // State form Thêm / Sửa
    const [isEditing, setIsEditing] = useState(false);
    const [editingContactId, setEditingContactId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        email: '',
        phone: '',
        buying_role: 'INFLUENCER',
        is_primary: false
    });

    // State Modal chuyển công ty (AC 4)
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferContactTarget, setTransferContactTarget] = useState(null);
    const [targetCustomerId, setTargetCustomerId] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = currentUser.role || currentUser.role_code || '';  
    const roleStr = String(currentUser.role || currentUser.role_name || currentUser.role_code || '').toLowerCase();
// Xác định nếu là nhân viên kinh doanh (Sales):
    const isSales = roleStr.includes('sale') || currentUser.role_id === 3;
    

    // Tải danh sách liên hệ
    const fetchContacts = async () => {
        if (!customer?.id) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const data = await getContactsByCustomer(customer.id);
            setContacts(data);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [customer]);

    // Reset form
    const resetForm = () => {
        setIsEditing(false);
        setEditingContactId(null);
        setFormData({
            name: '',
            title: '',
            email: '',
            phone: '',
            buying_role: 'INFLUENCER',
            is_primary: false
        });
    };

    // Chọn để sửa
   const handleEditClick = (c) => {
        if (typeof setIsEditing === 'function') setIsEditing(true);
        setFormData({
            id: c.id, // Bắt buộc phải có dòng này để biết đang sửa ID nào
            name: c.name || '',
            title: c.title || '',
            email: c.email || '',
            phone: c.phone || '',
            buying_role: c.buying_role || 'INFLUENCER',
            is_primary: Boolean(c.is_primary)
        });
    };

    // Lưu liên hệ (Thêm hoặc Cập nhật)
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Kiểm tra Email hợp lệ (phải có dạng abc@def.xyz)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email.trim())) {
            alert('⚠️ Email không đúng định dạng (Ví dụ: ten@fpt.com hoặc ten@gmail.com)');
            return;
        }

        // 2. Kiểm tra Số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (formData.phone && !phoneRegex.test(formData.phone.trim())) {
            alert('⚠️ Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (Ví dụ: 0912345678)');
            return;
        }

        // Tiếp tục xử lý createContact / updateContact...
    };
    const handleSaveContact = async (e) => {
        if (e) e.preventDefault();

        // 1. Kiểm tra họ tên bắt buộc
        if (!formData.name || !formData.name.trim()) {
            alert('⚠️ Vui lòng nhập họ tên người liên hệ!');
            return;
        }

        // 2. Kiểm tra định dạng Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email.trim())) {
            alert('⚠️ Email không đúng định dạng (Ví dụ: ten@fpt.com hoặc ten@gmail.com)');
            return;
        }

        // 3. Kiểm tra Số điện thoại Việt Nam (10 số)
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (formData.phone && !phoneRegex.test(formData.phone.trim())) {
            alert('⚠️ Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (Ví dụ: 0912345678)');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            // Lấy ID liên hệ đang sửa từ formData
            const contactId = formData.id || (typeof editingId !== 'undefined' ? editingId : null);
            const isEditMode = Boolean(isEditing);

            const endpoint = isEditMode && contactId
                ? `http://localhost:5001/api/contacts/${contactId}` 
                : `http://localhost:5001/api/contacts`;
            const method = isEditMode ? 'PUT' : 'POST';

            const payload = {
                customer_id: customer.id,
                name: formData.name.trim(),
                title: formData.title || '',
                email: formData.email ? formData.email.trim() : '',
                phone: formData.phone ? formData.phone.trim() : '',
                buying_role: formData.buying_role || 'INFLUENCER',
                is_primary: formData.is_primary ? 1 : 0
            };

            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi khi lưu dữ liệu!');

            alert(isEditMode ? '✅ Cập nhật người liên hệ thành công!' : '✅ Thêm người liên hệ thành công!');
            
            // Đưa form về trạng thái ban đầu
            if (typeof setIsEditing === 'function') setIsEditing(false);
            setFormData({ name: '', title: '', email: '', phone: '', buying_role: 'INFLUENCER', is_primary: false });
            
            // Tải lại danh sách
            if (typeof fetchContacts === 'function') fetchContacts();
        } catch (err) {
            alert('❌ ' + err.message);
        }
    };

    // Xóa liên hệ
    const handleDeleteContact = async (id, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa người liên hệ "${name}"?`)) return;
        try {
            await deleteContact(id);
            setSuccessMsg('Đã xóa người liên hệ thành công!');
            fetchContacts();
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    // Chuyển sang công ty khác (AC 4)
    const handleConfirmTransfer = async () => {
        if (!targetCustomerId) {
            alert('Vui lòng chọn công ty cần chuyển đến!');
            return;
        }
        try {
            await transferContact(transferContactTarget.id, targetCustomerId, transferReason);
            setShowTransferModal(false);
            setTransferContactTarget(null);
            setTargetCustomerId('');
            setTransferReason('');
            setSuccessMsg('Chuyển công ty thành công và đã lưu vết lịch sử!');
            fetchContacts();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#1a1d24', color: '#e6edf3', borderRadius: '8px',
                padding: '24px', width: '92%', maxWidth: '960px', maxHeight: '90vh',
                overflowY: 'auto', border: '1px solid #30363d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#ff6b00' }}>
                            👥 Danh Sách Người Liên Hệ
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b949e' }}>
                            Khách hàng:<strong>{customer?.company || customer?.name || 'Đang chọn'}</strong>
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '22px', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Thông báo */}
                {errorMsg && <div style={{ margin: '12px 0', padding: '8px 12px', background: '#ffebe9', color: '#cf222e', borderRadius: '4px', fontSize: '13px' }}>{errorMsg}</div>}
                {successMsg && <div style={{ margin: '12px 0', padding: '8px 12px', background: '#dafbe1', color: '#1a7f37', borderRadius: '4px', fontSize: '13px' }}>{successMsg}</div>}

                {/* Form Thêm / Chỉnh sửa */}
                <form onSubmit={handleSubmit}   style={{ background: '#21262d', padding: '16px', borderRadius: '6px', margin: '16px 0', border: '1px solid #30363d' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#58a6ff' }}>
                        {isEditing ? '✏️ Cập nhật thông tin người liên hệ' : '➕ Thêm người liên hệ mới'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Họ tên *</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Nguyễn Văn Nam"
                                style={{ width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Chức danh</label>
                            <input 
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="VD: Giám đốc IT / Trưởng phòng Mua"
                                style={{ width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Email</label>
                            <input 
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="nam.nv@company.com"
                                style={{ width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Số điện thoại</label>
                            <input 
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0987654321"
                                style={{ width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Vai trò quyết định mua (AC 2)</label>
                            <select 
                                value={formData.buying_role}
                                onChange={e => setFormData({ ...formData, buying_role: e.target.value })}
                                style={{ width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            >
                                <option value="DECISION_MAKER">🎯 Người quyết định (Decision Maker)</option>
                                <option value="INFLUENCER">💡 Người ảnh hưởng (Influencer)</option>
                                <option value="END_USER">👤 Người dùng cuối (End User)</option>
                                <option value="BLOCKER">⚠️ Người cản trở (Blocker)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input 
                                type="checkbox"
                                checked={formData.is_primary}
                                onChange={e => setFormData({ ...formData, is_primary: e.target.checked })}
                            />
                            <span>⭐ Đặt làm <strong>Đầu mối chính</strong> của khách hàng (AC 3)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {isEditing && (
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    style={{ padding: '6px 12px', background: '#30363d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Hủy
                                </button>
                            )}
                           <button
  type="button"
  onClick={handleSaveContact}
  style={{
    padding: '6px 16px',
    background: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  }}
>
  {isEditing ? 'Cập nhật' : 'Thêm liên hệ'}
</button>
                        </div>
                    </div>
                </form>

                {/* Danh sách người liên hệ */}
                <div style={{ marginTop: '16px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>Đang tải danh sách...</div>
                    ) : contacts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', border: '1px dashed #30363d', borderRadius: '6px' }}>
                            Khách hàng này chưa có người liên hệ nào. Hãy thêm người đầu tiên ở form trên!
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#21262d', textAlign: 'left', borderBottom: '1px solid #30363d' }}>
                                        <th style={{ padding: '10px' }}>Họ tên</th>
                                        <th style={{ padding: '10px' }}>Chức danh</th>
                                        <th style={{ padding: '10px' }}>Liên hệ</th>
                                        <th style={{ padding: '10px' }}>Vai trò quyết định</th>
                                        <th style={{ padding: '10px' }}>Đầu mối chính</th>
                                        <th style={{ padding: '10px', textAlign: 'center' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((c) => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                                            <td style={{ padding: '10px', fontWeight: '600' }}>
                                                {c.name}
                                                {c.history_log && (
                                                     <button
                                                        type="button"
                                                        onClick={() => alert(`📜 LỊCH SỬ CHUYỂN ĐỔI CỦA ${c.name.toUpperCase()}:\n\n${c.history_log}`)}
                                                        title={c.history_log}
                                                        style={{
                                                            marginLeft: '6px',
                                                            fontSize: '11px',
                                                            color: '#58a6ff',
                                                            background: 'rgba(88, 166, 255, 0.1)',
                                                            border: '1px solid #388bfd',
                                                            borderRadius: '4px',
                                                            padding: '1px 6px',
                                                            cursor: 'pointer'
                                                    }}
                                                    >
                                                        📜 Lịch sử
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px', color: '#8b949e' }}>{c.title || '—'}</td>
                                            <td style={{ padding: '10px' }}>
                                                <div>✉️ {c.email || '—'}</div>
                                                <div>📞 {c.phone || '—'}</div>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '12px', fontSize: '11px',
                                                    backgroundColor: BUYING_ROLES[c.buying_role]?.bg || '#30363d',
                                                    color: BUYING_ROLES[c.buying_role]?.text || '#fff',
                                                    fontWeight: '600'
                                                }}>
                                                    {BUYING_ROLES[c.buying_role]?.label || c.buying_role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {c.is_primary ? (
                                                    <span style={{ color: '#e3b341', fontWeight: 'bold' }}>⭐ Đầu mối chính</span>
                                                ) : (
                                                    <span style={{ color: '#6e7681' }}>Liên hệ phụ</span>
                                                )}
                                            </td>
                                           <td style={{ padding: '10px', textAlign: 'center' }}>
  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
    {/* Nút Sửa: Ai cũng thấy */}
    <button
      type="button"
      onClick={() => handleEditClick(c)}
      style={{ padding: '4px 8px', backgroundColor: '#0969da', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
    >
      Sửa
    </button>

    {/* Chỉ Trưởng nhóm hoặc Admin mới thấy, role Sales bị ẩn hoàn toàn */}
    {!isSales && (
      <>
        <button
          type="button"
          onClick={() => handleOpenTransfer(c)}
          style={{ padding: '4px 8px', backgroundColor: '#8250df', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Chuyển cty
        </button>
        <button
          type="button"
          onClick={() => handleDelete(c.id)}
          style={{ padding: '4px 8px', backgroundColor: '#cf222e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Xóa
        </button>
      </>
    )}
  </div>
</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Modal */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #30363d', paddingTop: '12px' }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '8px 18px', background: '#30363d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Đóng
                    </button>
                </div>
            </div>

            {/* MODAL CON: CHUYỂN SANG CÔNG TY KHÁC (AC 4) */}
            {showTransferModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div style={{
                        backgroundColor: '#161b22', padding: '20px', borderRadius: '8px',
                        width: '90%', maxWidth: '480px', border: '1px solid #30363d'
                    }}>
                        <h4 style={{ margin: '0 0 12px', color: '#8957e5' }}>
                            🏢 Chuyển Người Liên Hệ Sang Khách Hàng Khác
                        </h4>
                        <p style={{ fontSize: '13px', color: '#8b949e', margin: '0 0 12px' }}>
                            Đang chuyển nhân sự: <strong>{transferContactTarget?.name}</strong>
                        </p>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Công ty/Khách hàng mới *</label>
                            <select 
                                value={targetCustomerId}
                                onChange={e => setTargetCustomerId(e.target.value)}
                                style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            >
                                <option value="">-- Chọn khách hàng đích --</option>
                                {customerList
                                    .filter(item => item.id !== customer.id)
                                    .map(item => (
                                       <option key={item.id} value={item.id}>
                                            {item.company || item.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#8b949e' }}>Lý do chuyển giao (Lưu vào lịch sử)</label>
                            <textarea 
                                rows="3"
                                value={transferReason}
                                onChange={e => setTransferReason(e.target.value)}
                                placeholder="VD: Khách hàng chuyển công tác sang công ty đối tác..."
                                style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#fff' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                                onClick={() => setShowTransferModal(false)}
                                style={{ padding: '6px 12px', background: '#30363d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleConfirmTransfer}
                                style={{ padding: '6px 16px', background: '#8957e5', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Xác nhận chuyển
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}