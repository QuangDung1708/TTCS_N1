import React, { useState } from 'react';

// Dữ liệu giả lập Danh sách Khách hàng
const initialCustomers = [
  { id: 1, code: 'KH001', name: 'Nguyễn Văn An', phone: '0987654321', email: 'an.nguyen@gmail.com', group: 'VIP', status: 'Hoạt động' },
  { id: 2, code: 'KH002', name: 'Trần Thị Bích', phone: '0912345678', email: 'bich.tran@gmail.com', group: 'Thân thiết', status: 'Hoạt động' },
  { id: 3, code: 'KH003', name: 'Lê Hoàng Cường', phone: '0903112233', email: 'cuong.le@gmail.com', group: 'Mới', status: 'Tạm khóa' },
  { id: 4, code: 'KH004', name: 'Phạm Minh Đức', phone: '0978999888', email: 'duc.pham@gmail.com', group: 'VIP', status: 'Hoạt động' },
  { id: 5, code: 'KH005', name: 'Vũ Thị Hoa', phone: '0933445566', email: 'hoa.vu@gmail.com', group: 'Thân thiết', status: 'Hoạt động' },
];

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');

  // Lọc danh sách theo Tên/SĐT/Mã KH và Phân loại khách hàng
  const filteredCustomers = initialCustomers.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesGroup =
      selectedGroup === 'All' || item.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Quản lý Danh sách Khách hàng</h2>

      {/* Thanh công cụ: Tìm kiếm & Bộ lọc */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="🔍 Tìm theo mã, tên hoặc số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="All">-- Tất cả nhóm khách hàng --</option>
          <option value="VIP">Khách hàng VIP</option>
          <option value="Thân thiết">Khách hàng Thân thiết</option>
          <option value="Mới">Khách hàng Mới</option>
        </select>
      </div>

      {/* Bảng Dữ liệu */}
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeaderRow}>
            <th style={styles.th}>STT</th>
            <th style={styles.th}>Mã KH</th>
            <th style={styles.th}>Họ và tên</th>
            <th style={styles.th}>Số điện thoại</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Nhóm KH</th>
            <th style={styles.th}>Trạng thái</th>
            <th style={styles.th}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((item, index) => (
              <tr key={item.id} style={styles.tableRow}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}><strong>{item.code}</strong></td>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}>{item.phone}</td>
                <td style={styles.td}>{item.email}</td>
                <td style={styles.td}>
                  <span style={styles.groupBadge}>{item.group}</span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: item.status === 'Hoạt động' ? '#dcfce7' : '#fee2e2',
                      color: item.status === 'Hoạt động' ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.editBtn}>Sửa</button>
                  <button style={styles.deleteBtn}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" style={styles.emptyTd}>
                Không tìm thấy khách hàng phù hợp.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    padding: '24px',
    fontFamily: 'sans-serif',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    margin: '20px',
  },
  header: {
    margin: '0 0 20px 0',
    color: '#1e293b',
    fontSize: '22px',
  },
  toolbar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '12px',
    color: '#475569',
    fontWeight: '600',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px',
    color: '#334155',
  },
  emptyTd: {
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  groupBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontWeight: '500',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  editBtn: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '6px',
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};