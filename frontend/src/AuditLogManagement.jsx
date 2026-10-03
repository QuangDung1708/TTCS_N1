import React, { useState, useEffect } from 'react';

export default function AuditLogManagement() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState(null); // Dùng cho modal diff

    // Bộ lọc
    const [filters, setFilters] = useState({
        target_type: '',
        start_date: '',
        end_date: ''
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams({
                page,
                limit: 10,
                ...(filters.target_type && { target_type: filters.target_type }),
                ...(filters.start_date && { start_date: filters.start_date }),
                ...(filters.end_date && { end_date: filters.end_date }),
            }).toString();

            const res = await fetch(`http://localhost:5001/api/audit-logs?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setLogs(data.data);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Lỗi tải audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                 Nhật Ký Thay Đổi Dữ Liệu Nhạy Cảm
            </h2>

            {/* Thanh Bộ Lọc Đa Tiêu Chí */}
            <div style={{
                display: 'flex', gap: '12px', flexWrap: 'wrap',
                backgroundColor: '#161b22', padding: '16px', borderRadius: '8px',
                border: '1px solid #30363d', marginBottom: '20px', alignItems: 'center'
            }}>
                <div>
                    <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Loại đối tượng</label>
                    <select
                        name="target_type"
                        value={filters.target_type}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px' }}
                    >
                        <option value="">Tất cả đối tượng</option>
                        <option value="USER">Người dùng & Vai trò</option>
                        <option value="CUSTOMER">Khách hàng & Chuyển giao</option>
                        <option value="DISCOUNT">Chiết khấu hợp đồng</option>
                        <option value="KPI">Chỉ tiêu doanh số</option>
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Từ ngày</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        style={{ padding: '7px', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px' }}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Đến ngày</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        style={{ padding: '7px', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px' }}
                    />
                </div>

                <button
                    onClick={() => { setFilters({ target_type: '', start_date: '', end_date: '' }); setPage(1); }}
                    style={{
                        marginTop: '18px', padding: '8px 14px', backgroundColor: '#21262d',
                        color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer'
                    }}
                >
                     Xóa bộ lọc
                </button>
            </div>

            {/* Bảng hiển thị danh sách nhật ký */}
            <div style={{ backgroundColor: '#161b22', borderRadius: '8px', border: '1px solid #30363d', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead style={{ backgroundColor: '#0d1117', borderBottom: '1px solid #30363d' }}>
                        <tr>
                            <th style={{ padding: '12px' }}>Thời điểm</th>
                            <th style={{ padding: '12px' }}>Người thực hiện</th>
                            <th style={{ padding: '12px' }}>Hành động</th>
                            <th style={{ padding: '12px' }}>Đối tượng</th>
                            <th style={{ padding: '12px' }}>ID Mục</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Chi tiết thay đổi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center' }}>Đang tải nhật ký...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#8b949e' }}>Chưa có bản ghi nhật ký nào.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #21262d' }}>
                                    <td style={{ padding: '12px', color: '#8b949e', fontSize: '13px' }}>
                                        {new Date(log.created_at).toLocaleString('vi-VN')}
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>
                                        {log.executor_name || log.user_name}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
                                            backgroundColor: '#1f242c', border: '1px solid #388bfd', color: '#58a6ff'
                                        }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', color: '#7ee787' }}>{log.target_type}</td>
                                    <td style={{ padding: '12px' }}>#{log.target_id}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            style={{
                                                padding: '4px 10px', backgroundColor: '#238636', color: '#fff',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                                            }}
                                        >
                                             Xem khác biệt (Diff)
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Xem Khác Biệt Dữ Liệu (Old vs New Value) */}
            {selectedLog && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1200
                }}>
                    <div style={{
                        backgroundColor: '#161b22', border: '1px solid #30363d',
                        borderRadius: '8px', width: '650px', padding: '24px', color: '#e6edf3'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>So sánh dữ liệu thay đổi #{selectedLog.id}</h3>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            {/* Dữ liệu cũ */}
                            <div style={{ backgroundColor: '#211818', border: '1px solid #da3633', borderRadius: '6px', padding: '12px' }}>
                                <div style={{ color: '#f85149', fontWeight: 'bold', marginBottom: '8px' }}>❌ Giá trị TRƯỚC khi đổi (Old):</div>
                                <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#ff7b72' }}>
                                    {typeof selectedLog.old_value === 'string' ? selectedLog.old_value : JSON.stringify(selectedLog.old_value, null, 2)}
                                </pre>
                            </div>

                            {/* Dữ liệu mới */}
                            <div style={{ backgroundColor: '#16231a', border: '1px solid #238636', borderRadius: '6px', padding: '12px' }}>
                                <div style={{ color: '#3fb950', fontWeight: 'bold', marginBottom: '8px' }}>✅ Giá trị SAU khi đổi (New):</div>
                                <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: '#7ee787' }}>
                                    {typeof selectedLog.new_value === 'string' ? selectedLog.new_value : JSON.stringify(selectedLog.new_value, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{ padding: '6px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}