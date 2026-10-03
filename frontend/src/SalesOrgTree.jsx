import React, { useState, useEffect } from 'react';

// Component đệ quy hiển thị từng nút nhóm trong cây
function TreeNode({ node, onAddChild, onEdit, onManageMembers, level = 0 }) {
    const [collapsed, setCollapsed] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div style={{ marginLeft: level > 0 ? '28px' : '0px', marginTop: '12px' }}>
            <div style={{
                backgroundColor: '#161b22', border: '1px solid #30363d',
                borderRadius: '8px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hasChildren && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                background: 'none', border: 'none', color: '#58a6ff',
                                cursor: 'pointer', fontSize: '14px', width: '20px'
                            }}
                        >
                            {collapsed ? '▶' : '▼'}
                        </button>
                    )}
                    {!hasChildren && <span style={{ width: '20px', display: 'inline-block' }}>•</span>}

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#e6edf3' }}>
                                {node.name}
                            </span>
                            <span style={{
                                padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                                backgroundColor: '#1f242c', border: '1px solid #388bfd', color: '#58a6ff'
                            }}>
                                📍 {node.region || 'Toàn quốc'}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                            Trưởng nhóm: <strong style={{ color: '#7ee787' }}>{node.leader_name || 'Chưa chỉ định'}</strong>
                            {' '} | Nhân sự: <strong style={{ color: '#d29922' }}>{node.member_count}</strong> người
                        </div>
                    </div>
                </div>

                {/* Các nút thao tác */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onManageMembers(node)}
                        style={{ padding: '5px 10px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        👥 Nhân sự
                    </button>
                    <button
                        onClick={() => onAddChild(node)}
                        style={{ padding: '5px 10px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        + Nhóm con
                    </button>
                    <button
                        onClick={() => onEdit(node)}
                        style={{ padding: '5px 10px', backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        ✏️ Sửa
                    </button>
                </div>
            </div>

            {/* Render các nhóm con nếu không bị thu gọn */}
            {!collapsed && hasChildren && (
                <div style={{ borderLeft: '2px dashed #30363d', marginLeft: '12px', paddingLeft: '8px' }}>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onManageMembers={onManageMembers}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SalesOrgTree() {
    const [treeData, setTreeData] = useState([]);
    const [flatList, setFlatList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal tạo/sửa nhóm
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupForm, setGroupForm] = useState({ name: '', parent_id: '', region: 'Toàn quốc', leader_id: '' });

    // Modal điều chuyển nhân sự
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [currentMembers, setCurrentMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');

    const fetchTree = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/groups/tree', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTreeData(data.tree);
                setFlatList(data.flatList);
            }
        } catch (err) {
            console.error('Lỗi tải cây tổ chức:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTree();
    }, []);

    // Mở modal thêm nhóm con
    const handleAddChild = (parentNode) => {
        setEditingGroup(null);
        setGroupForm({
            name: '',
            parent_id: parentNode ? parentNode.id : '',
            region: parentNode ? parentNode.region : 'Toàn quốc',
            leader_id: ''
        });
        setShowGroupModal(true);
    };

    // Mở modal sửa nhóm
    const handleEdit = (node) => {
        setEditingGroup(node);
        setGroupForm({
            name: node.name,
            parent_id: node.parent_id || '',
            region: node.region || 'Toàn quốc',
            leader_id: node.leader_id || ''
        });
        setShowGroupModal(true);
    };

    // Lưu nhóm (Thêm / Sửa)
    const handleSaveGroup = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingGroup
                ? `http://localhost:5001/api/groups/${editingGroup.id}`
                : 'http://localhost:5001/api/groups';
            const method = editingGroup ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(groupForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setShowGroupModal(false);
            fetchTree();
        } catch (err) {
            alert(err.message);
        }
    };

    // Mở modal quản lý nhân sự
    const handleManageMembers = async (node) => {
        setSelectedGroup(node);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/groups/${node.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCurrentMembers(data.members);
                // Lọc những người chưa ở nhóm này
                setAvailableUsers(data.allUsers.filter(u => u.group_id !== node.id));
                setShowMemberModal(true);
            }
        } catch (err) {
            alert('Lỗi tải danh sách nhân sự');
        }
    };

    // Điều chuyển thêm nhân sự vào nhóm
    const handleAssignMember = async () => {
        if (!selectedUserId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5001/api/groups/${selectedGroup.id}/assign-members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userIds: [parseInt(selectedUserId)] })
            });
            if (res.ok) {
                setSelectedUserId('');
                handleManageMembers(selectedGroup);
                fetchTree();
            }
        } catch (err) {
            alert('Lỗi khi điều chuyển nhân sự');
        }
    };

const handleSetLeader = async (userId) => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5001/api/groups/${selectedGroup.id}/leader`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ leader_id: userId })
        });
        const data = await res.json();
        if (res.ok) {
            const leaderName = userId ? currentMembers.find(m => m.id === userId)?.full_name : null;
            setSelectedGroup(prev => ({ ...prev, leader_id: userId, leader_name: leaderName }));
            fetchTree();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('Lỗi thao tác trưởng nhóm!');
    }
};

    return (
        <div style={{ padding: '24px', color: '#e6edf3', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                         Cơ Cấu Tổ Chức Kinh Doanh Dạng Cây
                    </h2>
                    <span style={{ fontSize: '13px', color: '#8b949e' }}>
                        Cấu trúc phân cấp quyết định phạm vi dữ liệu mà Trưởng nhóm nhìn thấy
                    </span>
                </div>
                <button
                    onClick={() => handleAddChild(null)}
                    style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Khai Báo Nhóm Gốc Mới
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Đang tải sơ đồ cơ cấu tổ chức...</div>
            ) : (
                <div>
                    {treeData.map(rootNode => (
                        <TreeNode
                            key={rootNode.id}
                            node={rootNode}
                            onAddChild={handleAddChild}
                            onEdit={handleEdit}
                            onManageMembers={handleManageMembers}
                        />
                    ))}
                </div>
            )}

            {/* Modal Thêm/Sửa Nhóm */}
            {showGroupModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '480px', padding: '24px', color: '#e6edf3' }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>{editingGroup ? '✏️ Cập Nhật Nhóm Kinh Doanh' : '➕ Khai Báo Nhóm Con Mới'}</h3>
                        <form onSubmit={handleSaveGroup}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Tên nhóm kinh doanh *</label>
                                <input
                                    type="text" required
                                    placeholder="VD: Phòng Kinh Doanh Hà Nội 1"
                                    value={groupForm.name}
                                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Nhóm cha trực thuộc</label>
                                <select
                                    value={groupForm.parent_id}
                                    onChange={(e) => setGroupForm({ ...groupForm, parent_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                >
                                    <option value="">(Không có - Đây là nhóm gốc cao nhất)</option>
                                    {flatList.filter(g => !editingGroup || g.id !== editingGroup.id).map(g => (
                                        <option key={g.id} value={g.id}>{g.name} ({g.region})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Khu vực địa lý</label>
                                <input
                                    type="text"
                                    placeholder="VD: Miền Bắc, Hà Nội, Thái Nguyên..."
                                    value={groupForm.region}
                                    onChange={(e) => setGroupForm({ ...groupForm, region: e.target.value })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setShowGroupModal(false)} style={{ padding: '8px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Nhóm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Quản Lý & Điều Chuyển Nhân Sự */}
            {showMemberModal && selectedGroup && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                    <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', width: '550px', padding: '24px', color: '#e6edf3' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>👥 Phân Bổ Nhân Sự: {selectedGroup.name}</h3>
                            <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        {/* KHỐI TRƯỞNG NHÓM HIỆN TẠI & NÚT BÃI NHIỆM */}
<div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0d1117', padding: '10px 14px', borderRadius: '6px',
    border: '1px solid #30363d', marginBottom: '16px'
}}>
    <div>
        <span style={{ fontSize: '13px', color: '#8b949e' }}>Trưởng nhóm hiện tại: </span>
        <span style={{ fontWeight: 'bold', color: selectedGroup.leader_name ? '#7ee787' : '#8b949e' }}>
            {selectedGroup.leader_name || 'Chưa chỉ định'}
        </span>
    </div>
    {selectedGroup.leader_id && (
        <button
            type="button"
            onClick={() => handleSetLeader(null)}
            style={{
                padding: '4px 10px',
                backgroundColor: '#3d1d1d',
                color: '#f85149',
                border: '1px solid #f85149',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
            }}
        >
            ✕ Bãi nhiệm / Hủy
        </button>
    )}
</div>

                        {/* Thêm nhân sự vào nhóm */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', backgroundColor: '#0d1117', padding: '12px', borderRadius: '6px', border: '1px solid #30363d' }}>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                style={{ flex: 1, padding: '8px', backgroundColor: '#161b22', color: '#fff', border: '1px solid #30363d', borderRadius: '6px' }}
                            >
                                <option value="">-- Chọn nhân viên để điều chuyển vào nhóm --</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAssignMember}
                                style={{ padding: '8px 14px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                + Thêm Vào Nhóm
                            </button>
                        </div>

                        {/* Danh sách thành viên hiện tại */}
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Danh sách thành viên hiện tại ({currentMembers.length}):</div>
                            {currentMembers.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', fontSize: '13px' }}>
        Chưa có nhân viên nào trong nhóm này.
    </div>
) : (
    currentMembers.map(m => {
        const isCurrentLeader = selectedGroup.leader_id === m.id;
        return (
            <div 
                key={m.id} 
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px 12px', 
                    backgroundColor: isCurrentLeader ? '#122317' : '#0d1117', 
                    border: isCurrentLeader ? '1px solid #238636' : '1px solid #21262d', 
                    borderRadius: '6px', 
                    marginBottom: '8px', 
                    fontSize: '13px' 
                }}
            >
                <div>
                    <span style={{ fontWeight: '600', color: isCurrentLeader ? '#7ee787' : '#e6edf3' }}>
                        {m.full_name}
                    </span>
                    <span style={{ color: '#8b949e', marginLeft: '8px' }}>({m.email})</span>
                </div>

                <div>
                    {isCurrentLeader ? (
                        <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: '#238636', 
                            color: '#fff', 
                            fontSize: '11px',
                            fontWeight: 'bold' 
                        }}>
                            👑 Đang là Trưởng nhóm
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSetLeader(m.id)}
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
                            ⭐ Bổ nhiệm Trưởng nhóm
                        </button>
                    )}
                </div>
            </div>
        );
    })
)}
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '16px' }}>
                            <button onClick={() => setShowMemberModal(false)} style={{ padding: '6px 14px', backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}