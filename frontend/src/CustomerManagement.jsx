import React, { useState, useEffect } from 'react';
import CustomerContactsModal from './CustomerContactsModal';

const BASE_URL = 'http://localhost:5001/api';

export default function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State mở modal Người liên hệ cho khách hàng được chọn
    const [activeCustomer, setActiveCustomer] = useState(null);

    // Lấy danh sách khách hàng từ backend
    const fetchCustomers = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${BASE_URL}/customers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('Dữ liệu Backend trả về:', data); // In ra để xem trực tiếp ở Console

            if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách khách hàng');
            
            // Xử lý linh hoạt mọi kiểu dữ liệu mà Backend trả về:
            const list = Array.isArray(data) 
                ? data 
                : (data.data || data.customers || data.rows || []);
                
            setCustomers(list);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    return (
        <div style={{ padding: '24px', color: '#fff', backgroundColor: '#0d1117', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#ff6b00' }}>Quản Lý Khách Hàng & Người Liên Hệ (S2-02)</h2>
                    <p style={{ margin: '4px 0 0', color: '#8b949e', fontSize: '13px' }}>
                        Quản lý hồ sơ công ty và phân quyền người liên hệ theo vai trò quyết định mua.
                    </p>
                </div>
                <button 
                    onClick={fetchCustomers}
                    style={{ padding: '8px 16px', background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                >
                    🔄 Làm mới
                </button>
            </div>

            {error && <div style={{ padding: '12px', background: '#ffebe9', color: '#cf222e', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>Đang tải dữ liệu khách hàng...</div>
            ) : customers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e', border: '1px dashed #30363d', borderRadius: '6px' }}>
                    Chưa có khách hàng nào trong hệ thống. Hãy thêm khách hàng qua cơ sở dữ liệu hoặc API.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #30363d', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#161b22', textAlign: 'left', borderBottom: '1px solid #30363d' }}>
                                <th style={{ padding: '12px' }}>ID</th>
                                <th style={{ padding: '12px' }}>Tên công ty</th>
                                <th style={{ padding: '12px' }}>Mã số thuế</th>
                                <th style={{ padding: '12px' }}>Số điện thoại</th>
                                <th style={{ padding: '12px' }}>Email</th>
                                <th style={{ padding: '12px', textAlign: 'center' }}>Người liên hệ (S2-02)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px' }}>{item.id}</td>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.company || item.name}</td>                                    <td style={{ padding: '12px', color: '#8b949e' }}>{item.tax_code || '—'}</td>
                                    <td style={{ padding: '12px' }}>{item.phone || '—'}</td>
                                    <td style={{ padding: '12px' }}>{item.email || '—'}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setActiveCustomer(item)}
                                            style={{
                                                padding: '6px 14px',
                                                backgroundColor: '#238636',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '13px'
                                            }}
                                        >
                                            👥 Quản lý người liên hệ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Hiển thị Modal Quản lý Người liên hệ khi bấm nút */}
            {activeCustomer && (
                <CustomerContactsModal
                    customer={activeCustomer}
                    customerList={customers}
                    onClose={() => setActiveCustomer(null)}
                />
            )}
        </div>
    );
}