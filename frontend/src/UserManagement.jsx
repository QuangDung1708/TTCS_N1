import React, { useState, useEffect } from 'react';
import { 
    Table, Button, Space, Tag, Input, Select, Card, Row, Col, 
    Typography, Modal, notification, Upload, Alert, Badge, 
    Divider, Tooltip, Form, Popconfirm 
} from 'antd';
import { 
    UserOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, ReloadOutlined, 
    SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, 
    SafetyCertificateOutlined, LockOutlined, UnlockOutlined, 
    SwapOutlined, MailOutlined, PhoneOutlined, KeyOutlined , DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';  

const { Title, Text, Paragraph } = Typography;

export default function UserManagement() {

    // Danh mục 7 vai trò chuẩn theo Ma trận phân quyền (RBAC) đã Việt hóa
const ROLE_OPTIONS = [
    { value: 'Admin', label: 'Quản trị hệ thống' },
    { value: 'Director', label: 'Giám đốc kinh doanh' },
    { value: 'Team Lead', label: 'Trưởng nhóm kinh doanh' },
    { value: 'Sales Rep', label: 'Nhân viên kinh doanh' },
    { value: 'Marketing', label: 'Chuyên viên Marketing' },
    { value: 'Cust. Success', label: 'Chăm sóc khách hàng' },
    { value: 'Accountant', label: 'Kế toán' },
];

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Modal 1: Tạo người dùng thủ công (KHÔI PHỤC NÚT TẠO THỦ CÔNG)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [creating, setCreating] = useState(false);

    // Modal 2: Phân quyền vai trò (DỮ LIỆU ĐỘNG)
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [roleForm] = Form.useForm();
    const [savingRole, setSavingRole] = useState(false);

    // Modal 3: Khóa tài khoản & Bàn giao (S1-10)
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [lockForm] = Form.useForm();
    const [locking, setLocking] = useState(false);

    // Modal 4: Nhập Excel Hàng Loạt (S2-01)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const [api, contextHolder] = notification.useNotification();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role_code === 'Admin';

    // 1. Tải toàn bộ dữ liệu động từ database (Người dùng, Roles động, Groups)
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [uRes, rRes, gRes] = await Promise.all([
                axios.get('http://localhost:5001/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5001/api/users/roles/list', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
                axios.get('http://localhost:5001/api/users/groups/list', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
            ]);
            setUsers(uRes.data.data || uRes.data || []);
            setRoles(rRes.data.data || []);
            setGroups(gRes.data.data || []);
        } catch (err) {
            api.error({ message: 'Lỗi tải người dùng', description: 'Không thể nạp dữ liệu từ máy chủ API.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. XỬ LÝ TẠO NGƯỜI DÙNG THỦ CÔNG
    const handleOpenCreateModal = () => {
        createForm.resetFields();
        createForm.setFieldsValue({
            role_code: 'Sales Rep',
            password: '123456@crm'
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateUser = async (values) => {
        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5001/api/users', values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Thành công', description: res.data.message || 'Đã tạo tài khoản mới!' });
            setIsCreateModalOpen(false);
            createForm.resetFields();
            fetchData();
        } catch (err) {
            api.error({ message: 'Thất bại', description: err.response?.data?.message || 'Lỗi khi tạo người dùng' });
        } finally {
            setCreating(false);
        }
    };

    // 3. XỬ LÝ PHÂN QUYỀN VAI TRÒ
    const handleOpenRoleModal = (user) => {
        setSelectedUser(user);
        roleForm.setFieldsValue({
            full_name: user.full_name,
            email: user.email,
            role_code: user.role_code,
            group_id: user.group_id || undefined
        });
        setIsRoleModalOpen(true);
    };

    const handleSaveRole = async (values) => {
        setSavingRole(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/users/${selectedUser.id}/role`, values, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Cập nhật phân quyền thành công!' });
            setIsRoleModalOpen(false);
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi phân quyền', description: err.response?.data?.message });
        } finally {
            setSavingRole(false);
        }
    };

    // 4. XỬ LÝ KHÓA & BÀN GIAO (S1-10)
const handleToggleStatus = async (user) => {
  try {
    const newStatus = user.status === 'active' ? 'locked' : 'active';
    const token = localStorage.getItem('token');
    
    // Gọi API cập nhật trạng thái
    await axios.put(
      `http://localhost:5001/api/users/${user.id}/status`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    message.success(newStatus === 'locked' ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản!');
    
    // BẮT BUỘC: Gọi lại hàm nạp danh sách để cập nhật chấm màu và trạng thái ngay lập tức
    if (typeof fetchUsers === 'function') {
      fetchUsers();
    } else {
      // Cập nhật trực tiếp vào State nếu không dùng fetchUsers
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    }
  } catch (err) {
    message.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái tài khoản!');
  }
};

    const handleExecuteLock = async (values) => {
        setLocking(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/users/${selectedUser.id}/status`, {
                status: 'inactive',
                handover_user_id: values.handover_user_id || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: 'Đã khóa tài khoản!', description: res.data.message });
            setIsLockModalOpen(false);
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi khi khóa tài khoản', description: err.response?.data?.message });
        } finally {
            setLocking(false);
        }
    };

    const handleUnlockUser = async (user) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5001/api/users/${user.id}/status`, { status: 'active' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            api.success({ message: `Đã mở khóa tài khoản cho ${user.full_name}!` });
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi khi mở khóa tài khoản' });
        }
    };

    // Hàm Khóa / Mở khóa tài khoản
const handleToggleLock = async (record) => {
    const isCurrentlyActive = record.status === 'active' || record.status === 'Hoạt động';
    const newStatus = isCurrentlyActive ? 'locked' : 'active';
    
    // Cập nhật giao diện ngay lập tức (Không cần chờ)
    setUsers(prev => prev.map(u => u.id === record.id ? { ...u, status: newStatus } : u));

    try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:5001/api/users/${record.id}/status`, 
            { status: newStatus },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(newStatus === 'locked' ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản thành công!');
    } catch (err) {
        message.error('Lỗi khi lưu trạng thái lên máy chủ!');
        // Hoàn tác nếu lỗi
        setUsers(prev => prev.map(u => u.id === record.id ? { ...u, status: record.status } : u));
    }
};

// Hàm Xóa vĩnh viễn người dùng khỏi DB
const handleDeleteUser = async (userId) => {
    // Xóa ngay khỏi danh sách hiển thị
    setUsers(prev => prev.filter(u => u.id !== userId));

    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5001/api/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        message.success('Đã xóa vĩnh viễn người dùng khỏi cơ sở dữ liệu!');
    } catch (err) {
        message.error('Lỗi khi xóa người dùng trên máy chủ!');
        if (typeof fetchUsers === 'function') fetchUsers(); // Khôi phục lại nếu máy chủ lỗi
    }
};

    // 5. NHẬP EXCEL HÀNG LOẠT (S2-01)
   // HÀM TẢI TỆP MẪU EXCEL / CSV CHUẨN UTF-8 (ĐÃ FIX LỖI FONT VÀ ĐẦY ĐỦ 7 VAI TRÒ)
// HÀM TẠO FILE EXCEL BẢNG TÍNH CHUẨN ĐẸP, CHIA CỘT RÕ RÀNG (KHÔNG BỊ DỒN CỘT A)
const handleDownloadTemplate = () => {
    // 1. Dữ liệu mẫu chuẩn 7 vai trò trong doanh nghiệp
    const sampleData = [
        { name: 'Trần Thị Bình', email: 'binh.tran@crm.vn', pass: 'Crm@123456', role: 'Director', group: 'Khối Kinh Doanh Toàn Quốc', phone: '0912345678' },
        { name: 'Lê Hoàng Cường', email: 'cuong.le@crm.vn', pass: 'Crm@123456', role: 'Team Lead', group: 'Chi Nhánh Miền Bắc', phone: '0923456789' },
        { name: 'Nguyễn Văn An', email: 'an.nguyen@crm.vn', pass: 'Crm@123456', role: 'Sales Rep', group: 'Phòng Kinh Doanh Hà Nội', phone: '0934567890' },
        { name: 'Phạm Thu Hà', email: 'ha.pham@crm.vn', pass: 'Crm@123456', role: 'Marketing', group: 'Phòng Marketing & Truyền Thông', phone: '0945678901' },
        { name: 'Đỗ Minh Khoa', email: 'khoa.do@crm.vn', pass: 'Crm@123456', role: 'Cust. Success', group: 'Phòng Chăm Sóc Khách Hàng', phone: '0956789012' },
        { name: 'Vũ Hải Yến', email: 'yen.vu@crm.vn', pass: 'Crm@123456', role: 'Accountant', group: 'Phòng Kế Toán - Tài Chính', phone: '0967890123' },
        { name: 'Nguyễn Quản Trị', email: 'admin.support@crm.vn', pass: 'Crm@123456', role: 'Admin', group: 'Ban Quản Trị Hệ Thống', phone: '0978901234' }
    ];

    // 2. Tạo cấu trúc bảng XML/HTML chuẩn mà Microsoft Excel hiểu 100%
    const tableRows = sampleData.map(item => `
        <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${item.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${item.email}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${item.pass}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; font-weight: bold; color: #1677ff;">${item.role}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${item.group}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${item.phone}</td>
        </tr>
    `).join('');

    const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Mau_Nhan_Su_CRM</x:Name>
                            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11pt; }
                th { background-color: #1677ff; color: #ffffff; font-weight: bold; text-align: center; height: 36px; border: 1px solid #0050b3; padding: 8px 12px; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 180px;">Họ và tên</th>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 220px;">Email</th>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 140px;">Mật khẩu tạm thời</th>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 140px;">Vai trò (RBAC)</th>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 220px;">Nhóm kinh doanh</th>
                        <th style="background-color: #1677ff; color: #ffffff; min-width: 130px;">Số điện thoại</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
        </html>
    `;

    // 3. Tải xuống file dưới dạng tệp bảng tính .xls với mã hóa UTF-8
    const blob = new Blob(['\uFEFF' + excelTemplate], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Nhap_Nguoi_Dung_CRM.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

    const handleFileUpload = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            let lines = e.target.result.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length > 0 && lines[0].startsWith('sep=')) lines.shift();
            if (lines.length <= 1) {
                api.error({ message: 'Tệp tải lên không có dữ liệu người dùng!' });
                return;
            }
            const delimiter = lines[0].includes(';') ? ';' : ',';
            const emailSet = new Set();
            const existingEmails = new Set(users.map(u => (u.email || '').toLowerCase()));
            const parsed = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
                const fullName = cols[0] || '';
                const email = (cols[1] || '').toLowerCase();
                const role = cols[2] || 'Sales Rep';
                const group = cols[3] || 'Chưa gán';

                let errors = [];
                if (!fullName) errors.push('Thiếu họ tên');
                if (!email) errors.push('Thiếu email');
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email sai định dạng');
                else if (emailSet.has(email)) errors.push('Trùng email trong tệp');
                else if (existingEmails.has(email)) errors.push('Email đã tồn tại trên CRM');

                if (email) emailSet.add(email);

                parsed.push({
                    key: i,
                    row: i,
                    full_name: fullName,
                    email: email,
                    role_code: role,
                    group_name: group,
                    isValid: errors.length === 0,
                    errorMsg: errors.join(', ')
                });
            }
            setPreviewData(parsed);
            setImportResult(null);
        };
        reader.readAsText(file, 'UTF-8');
        return false;
    };

    const handleExecuteImport = async () => {
        const validItems = previewData.filter(d => d.isValid);
        const initialErrorItems = previewData.filter(d => !d.isValid).map(d => ({
            row: d.row,
            full_name: d.full_name || '(Chưa nhập)',
            email: d.email || '(Chưa nhập)',
            error: d.errorMsg
        }));

        setImporting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5001/api/users/import-batch', { users: validItems }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const backendErrors = (res.data.summary?.errors || []).map(e => ({
                row: e.row,
                full_name: e.fullName || e.full_name || '',
                email: e.email || '',
                error: e.error
            }));
            const allErrors = [...initialErrorItems, ...backendErrors];
            setImportResult({
                total: previewData.length,
                success: res.data.summary?.success || 0,
                failed: allErrors.length,
                errors: allErrors
            });
            api.success({ 
                message: 'Hoàn tất nhập dữ liệu!', 
                description: `Đã nhập thành công ${res.data.summary?.success || 0} tài khoản. Bỏ qua ${allErrors.length} dòng lỗi.` 
            });
            fetchData();
        } catch (err) {
            api.error({ message: 'Lỗi thực thi nhập', description: err.response?.data?.message });
        } finally {
            setImporting(false);
        }
    };

    // Hàm hiển thị nhãn và màu vai trò chuẩn xác 100% (Không ép về Sales Rep)
    const getRoleTag = (role) => {
        const roleColorMap = {
            'Admin': 'red',
            'Director': 'purple',
            'Team Lead': 'cyan',
            'Sales Rep': 'blue',
            'Marketing': 'magenta',
            'Accountant': 'gold',
            'Kế toán': 'gold',
            'CSM': 'green'
        };

        const roleLabelMap = {
            'Admin': 'Quản trị hệ thống',
            'Director': 'Giám đốc kinh doanh',
            'Team Lead': 'Trưởng nhóm kinh doanh',
            'Sales Rep': 'Nhân viên kinh doanh',
            'Marketing': 'Chuyên viên Marketing',
            'Accountant': 'Kế toán',
            'CSM': 'Chăm sóc khách hàng'
        };

        const color = roleColorMap[role] || 'geekblue';
        const label = roleLabelMap[role] || role || 'Chưa phân vai trò';

        return <Tag color={color} style={{ fontWeight: 500 }}>{label}</Tag>;
    };

    const columns = [
        {
            title: 'Họ và tên',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text) => <Text strong style={{ color: '#0f172a' }}>{text}</Text>
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text) => <Text copyable style={{ color: '#475569' }}>{text}</Text>
        },
        {
            title: 'Vai trò hiện tại',
            dataIndex: 'role_code',
            key: 'role_code',
            render: (role) => getRoleTag(role)
        },
        {
            title: 'Nhóm kinh doanh',
            dataIndex: 'group_name',
            key: 'group_name',
            render: (group) => group && group !== 'Chưa gán' ? <Tag color="processing">{group}</Tag> : <Text type="secondary">Chưa gán</Text>
        },
       // Cột Trạng thái (Tự động nhận diện chuẩn xác cả tiếng Anh lẫn tiếng Việt)
{
    title: 'Trạng thái',
    dataIndex: 'status',
    key: 'status',
    render: (status) => {
        const isActive = status === 'active' || status === 'Hoạt động' || status === 1;
        return (
            <span style={{ color: isActive ? '#52c41a' : '#ff4d4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#52c41a' : '#ff4d4f',
                    display: 'inline-block'
                }} />
                {isActive ? 'Hoạt động' : 'Đã khóa'}
            </span>
        );
    }
},

// Cột Hành động (Gồm nút Phân quyền, Khóa/Mở khóa động, và Xóa vĩnh viễn)
{
    title: 'Hành động',
    key: 'action',
    render: (_, record) => {
        const isActive = record.status === 'active' || record.status === 'Hoạt động';
        return (
            <Space size="small">
                <Button 
                    type="primary" 
                    ghost 
                    size="small" 
                    icon={<SafetyCertificateOutlined />} 
                    onClick={() => handleOpenPermissionModal(record)}
                >
                    Phân quyền
                </Button>

                {/* NÚT KHÓA / MỞ KHÓA */}
                <Popconfirm
                    title={isActive ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?"}
                    onConfirm={() => handleToggleLock(record)}
                    okText="Đồng ý"
                    cancelText="Hủy"
                >
                    <Tooltip title={isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                        <Button 
                            danger={isActive}
                            size="small" 
                            style={{ 
                                color: !isActive ? '#52c41a' : undefined, 
                                borderColor: !isActive ? '#52c41a' : undefined 
                            }}
                            icon={isActive ? <LockOutlined /> : <UnlockOutlined />} 
                        />
                    </Tooltip>
                </Popconfirm>

                {/* NÚT XÓA VĨNH VIỄN */}
                <Popconfirm
                    title="Xóa vĩnh viễn người dùng?"
                    description="Hành động này sẽ xóa dữ liệu trong database và không thể khôi phục!"
                    onConfirm={() => handleDeleteUser(record.id)}
                    okText="Xác nhận xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                >
                    <Tooltip title="Xóa vĩnh viễn">
                        <Button danger type="text" size="small" icon={<DeleteOutlined />} />
                    </Tooltip>
                </Popconfirm>
            </Space>
        );
    }
}
    ];

    const filteredUsers = users.filter(u => {
        const matchName = !searchText || (u.full_name?.toLowerCase().includes(searchText.toLowerCase()) || u.email?.toLowerCase().includes(searchText.toLowerCase()));
        const matchRole = !roleFilter || u.role_code === roleFilter;
        return matchName && matchRole;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contextHolder}

            {/* HEADER VỚI ĐẦY ĐỦ CẢ NÚT THÊM THỦ CÔNG & NHẬP EXCEL */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>Quản Trị Người Dùng & Phân Khối</Title>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                            Tạo tài khoản thủ công, nhập hàng loạt từ Excel, điều chuyển nhóm và bàn giao dữ liệu
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>Tải tệp mẫu</Button>
                            <Button 
                                icon={<UploadOutlined />} 
                                style={{ color: '#059669', borderColor: '#059669' }}
                                onClick={() => { setIsImportModalOpen(true); setPreviewData([]); setImportResult(null); }}
                            >
                                Nhập Excel Hàng Loạt
                            </Button>
                            {/* NÚT TẠO THỦ CÔNG */}
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={handleOpenCreateModal}
                            >
                                Thêm Người Dùng
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} />
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* BỘ LỌC ĐỘNG THEO ROLES */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Tìm kiếm theo họ tên, email..."
                            allowClear
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Space style={{ width: '100%' }}>

    {/* BỘ LỌC VAI TRÒ: Có mục "Tất cả vai trò" + Hỗ trợ icon X xóa nhanh */}
    <Select
        placeholder="Lọc theo vai trò..."
        allowClear
        value={roleFilter || undefined}
        onChange={value => setRoleFilter(value || '')}
        style={{ width: 260 }}
    >
        <Select.Option value="">
            <span style={{ color: '#1677ff', fontWeight: 600 }}>Tất cả vai trò</span>
        </Select.Option>
        {ROLE_OPTIONS.map(r => (
            <Select.Option key={r.value} value={r.value}>
                {r.label}
            </Select.Option>
        ))}
    </Select>

    {/* NÚT BỎ LỌC NHANH: Chỉ xuất hiện khi đang có từ khóa tìm kiếm hoặc đang chọn lọc vai trò */}
    {(searchText || roleFilter) && (
        <Button 
            type="link" 
            danger 
            onClick={() => {
                setSearchText('');
                setRoleFilter('');
            }}
        >
            Bỏ lọc
        </Button>
    )}
</Space>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG NGƯỜI DÙNG */}
            <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={filteredUsers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showTotal: (t) => `Tổng cộng ${t} người dùng` }}
                    bordered
                />
            </Card>

            {/* MODAL 1: THÊM NGƯỜI DÙNG THỦ CÔNG */}
            <Modal
                title={<Space><UserOutlined style={{ color: '#1677ff' }} /> <span style={{ fontWeight: 700 }}>Thêm Người Dùng Mới (Thủ Công)</span></Space>}
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onOk={createForm.submit}
                confirmLoading={creating}
                okText="Tạo người dùng"
                cancelText="Hủy"
                destroyOnClose
            >
                <Divider style={{ margin: '12px 0 16px' }} />
                <Form form={createForm} layout="vertical" onFinish={handleCreateUser}>
                    <Form.Item 
                        name="full_name" 
                        label="Họ và tên" 
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Ví dụ: Nguyễn Văn A" />
                    </Form.Item>

                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item 
                                name="email" 
                                label="Email đăng nhập" 
                                rules={[
                                    { required: true, message: 'Nhập email!' },
                                    { type: 'email', message: 'Email không đúng định dạng!' }
                                ]}
                            >
                                <Input prefix={<MailOutlined />} placeholder="user@congty.com" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="Số điện thoại">
                                <Input prefix={<PhoneOutlined />} placeholder="09xxxxxxxx" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item 
                        name="password" 
                        label="Mật khẩu khởi tạo" 
                        extra="Mặc định: 123456@crm nếu không nhập"
                    >
                        <Input.Password prefix={<KeyOutlined />} placeholder="123456@crm" />
                    </Form.Item>

                    {/* CHỌN VAI TRÒ ĐỘNG 100% */}
                    <Form.Item 
    name="role_code" 
    label="Vai trò phân quyền (RBAC)" 
    rules={[{ required: true, message: 'Vui lòng chọn vai trò phân quyền!' }]}
>
    <Select placeholder="Chọn vai trò phân quyền..." showSearch optionFilterProp="label">
        {ROLE_OPTIONS.map(r => (
            <Select.Option key={r.value} value={r.value} label={r.label}>
                {r.label}
            </Select.Option>
        ))}
    </Select>
</Form.Item>

                    <Form.Item name="group_id" label="Trực thuộc Nhóm kinh doanh">
                        <Select placeholder="Chọn nhóm kinh doanh (nếu có)" allowClear>
                            {groups.map(g => (
                                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 2: PHÂN QUYỀN ĐỘNG THEO ROLES */}
            <Modal
                title={<Space><SafetyCertificateOutlined style={{ color: '#1677ff' }} /> <span style={{ fontWeight: 700 }}>Phân Quyền & Điều Chuyển Nhóm</span></Space>}
                open={isRoleModalOpen}
                onCancel={() => setIsRoleModalOpen(false)}
                onOk={roleForm.submit}
                confirmLoading={savingRole}
                okText="Lưu phân quyền"
                cancelText="Hủy"
                destroyOnClose
            >
                <Divider style={{ margin: '12px 0 16px' }} />
                <Form form={roleForm} layout="vertical" onFinish={handleSaveRole}>
                    <Form.Item name="full_name" label="Họ và tên">
                        <Input disabled prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                        <Input disabled prefix={<MailOutlined />} />
                    </Form.Item>

                    {/* SELECT VAI TRÒ ĐỘNG TỪ DANH SÁCH ROLES (Không fix cứng 4 cái) */}
                   <Form.Item 
    name="role_code" // Giữ nguyên name="role_code" hoặc name="role" theo code cũ của bạn
    label="Vai trò phân quyền (RBAC)" 
    rules={[{ required: true, message: 'Vui lòng chọn vai trò phân quyền!' }]}
>
    <Select 
        placeholder="Chọn vai trò phân quyền..."
        showSearch
        optionFilterProp="children"
    >
        <Select.Option value="Admin">Quản trị hệ thống</Select.Option>
        <Select.Option value="Director">Giám đốc kinh doanh</Select.Option>
        <Select.Option value="Team Lead">Trưởng nhóm kinh doanh</Select.Option>
        <Select.Option value="Sales Rep">Nhân viên kinh doanh</Select.Option>
        <Select.Option value="Marketing">Chuyên viên Marketing</Select.Option>
        <Select.Option value="Cust. Success">Chăm sóc khách hàng</Select.Option>
        <Select.Option value="Accountant">Kế toán</Select.Option>
    </Select>
</Form.Item>
                    <Form.Item name="group_id" label="Trực thuộc Nhóm kinh doanh">
                        <Select placeholder="Chọn nhóm kinh doanh" allowClear>
                            {groups.map(g => (
                                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 3: KHÓA TÀI KHOẢN VÀ BÀN GIAO (S1-10) */}
            <Modal
                title={<Space><LockOutlined style={{ color: '#ff4d4f' }} /> <span style={{ fontWeight: 700 }}>Khóa Tài Khoản & Bàn Giao Dữ Liệu (S1-10)</span></Space>}
                open={isLockModalOpen}
                onCancel={() => setIsLockModalOpen(false)}
                onOk={lockForm.submit}
                confirmLoading={locking}
                okText="Xác nhận khóa & Bàn giao"
                okButtonProps={{ danger: true }}
                cancelText="Hủy"
                destroyOnClose
            >
                <Divider style={{ margin: '12px 0 16px' }} />
                <Alert
                    type="warning"
                    showIcon
                    message="Cảnh báo khóa tài khoản"
                    description={`Nhân sự [${selectedUser?.full_name}] sẽ không thể đăng nhập sau khi khóa. Chọn nhân sự tiếp nhận bàn giao khách hàng & cơ hội.`}
                    style={{ marginBottom: 16 }}
                />
                <Form form={lockForm} layout="vertical" onFinish={handleExecuteLock}>
                    <Form.Item 
                        name="handover_user_id" 
                        label={<Space><SwapOutlined /> <Text strong>Nhân sự tiếp nhận bàn giao</Text></Space>}
                    >
                        <Select placeholder="Chọn nhân viên tiếp nhận (hoặc để trống nếu chưa bàn giao)">
                            {users.filter(u => u.id !== selectedUser?.id && u.status !== 'inactive').map(u => (
                                <Select.Option key={u.id} value={u.id}>{u.full_name} ({u.role_code})</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL 4: NHẬP HÀNG LOẠT (S2-01) */}
            <Modal
                title={<Space><UploadOutlined style={{ color: '#059669' }} /> <span style={{ fontWeight: 700 }}>Nhập Người Dùng Hàng Loạt Từ Tệp CSV</span></Space>}
                open={isImportModalOpen}
                onCancel={() => setIsImportModalOpen(false)}
                width={850}
                destroyOnClose
                footer={importResult ? null : [
                    <Button key="close" onClick={() => setIsImportModalOpen(false)}>Đóng</Button>,
                    previewData.length > 0 && !importResult && (
                        <Button 
                            key="import" 
                            type="primary" 
                            loading={importing}
                            disabled={previewData.filter(d => d.isValid).length === 0}
                            onClick={handleExecuteImport}
                        >
                            Xác nhận nhập ({previewData.filter(d => d.isValid).length} dòng hợp lệ)
                        </Button>
                    )
                ]}
            >
                <Divider style={{ margin: '12px 0 16px' }} />
                {!importResult && (
                    <div style={{ marginBottom: 16 }}>
                        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                            <Col>
                                <Upload beforeUpload={handleFileUpload} accept=".csv, .txt" showUploadList={false}>
                                    <Button icon={<UploadOutlined />}>Chọn tệp dữ liệu (.csv)</Button>
                                </Upload>
                            </Col>
                            <Col>
                                <Button type="link" icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ padding: 0 }}>
                                    Tải tệp mẫu chuẩn (.csv)
                                </Button>
                            </Col>
                        </Row>
                        {previewData.length > 0 && (
                            <Alert
                                message={`Đã đọc ${previewData.length} dòng: ${previewData.filter(d => d.isValid).length} dòng hợp lệ, ${previewData.filter(d => !d.isValid).length} dòng phát hiện lỗi.`}
                                type={previewData.some(d => !d.isValid) ? "warning" : "info"}
                                showIcon
                                style={{ marginBottom: 12 }}
                            />
                        )}
                    </div>
                )}

                {!importResult && previewData.length > 0 && (
                    <Table
                        columns={[
                            { title: 'Dòng', dataIndex: 'row', width: 65, align: 'center', render: r => <Text code>{r}</Text> },
                            { title: 'Họ và tên', dataIndex: 'full_name' },
                            { title: 'Email', dataIndex: 'email' },
                            { title: 'Vai trò', dataIndex: 'role_code', width: 130, render: r => <Tag color="blue">{r}</Tag> },
                            { title: 'Nhóm', dataIndex: 'group_name', width: 150 },
                            { 
                                title: 'Kết quả kiểm tra', 
                                key: 'status',
                                width: 180,
                                render: (_, r) => r.isValid ? (
                                    <Tag icon={<CheckCircleOutlined />} color="success">Hợp lệ</Tag>
                                ) : (
                                    <Tag icon={<CloseCircleOutlined />} color="error">{r.errorMsg}</Tag>
                                )
                            }
                        ]}
                        dataSource={previewData}
                        pagination={{ pageSize: 5 }}
                        size="small"
                        bordered
                    />
                )}

                {importResult && (
                    <div>
                        <Alert
                            message="BÁO CÁO TỔNG KẾT NHẬP DỮ LIỆU (S2-01)"
                            description={
                                <div style={{ marginTop: 8 }}>
                                    <div>• Tổng số bản ghi trong tệp: <b>{importResult.total}</b> dòng</div>
                                    <div>• Nhập thành công: <b style={{ color: '#52c41a' }}>{importResult.success}</b> tài khoản (dòng hợp lệ được tạo tài khoản ngay)</div>
                                    <div>• Bị bỏ qua do vi phạm lỗi: <b style={{ color: '#ff4d4f' }}>{importResult.failed}</b> dòng (không làm gián đoạn các dòng hợp lệ)</div>
                                </div>
                            }
                            type={importResult.failed > 0 ? "warning" : "success"}
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        {importResult.errors && importResult.errors.length > 0 ? (
                            <div>
                                <Divider orientation="left" style={{ margin: '12px 0', fontSize: 14 }}>
                                    <Space><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> <b>Danh sách chi tiết các dòng lỗi bị bỏ qua:</b></Space>
                                </Divider>
                                <Table
                                    size="small"
                                    dataSource={importResult.errors}
                                    rowKey={(r, idx) => `err_${idx}`}
                                    pagination={{ pageSize: 5 }}
                                    bordered
                                    columns={[
                                        { title: 'Dòng', dataIndex: 'row', width: 65, align: 'center', render: r => <Text code>{r}</Text> },
                                        { title: 'Họ và tên', dataIndex: 'full_name', width: 160 },
                                        { title: 'Email', dataIndex: 'email', width: 200 },
                                        { 
                                            title: 'Thông báo lỗi chi tiết', 
                                            dataIndex: 'error', 
                                            render: err => <Tag color="error" style={{ whiteSpace: 'normal', padding: '4px 8px' }}>{err}</Tag> 
                                        },
                                        { 
                                            title: 'Xử lý của hệ thống', 
                                            key: 'action', 
                                            width: 160, 
                                            render: () => <Tag color="orange">Bỏ qua dòng này</Tag> 
                                        }
                                    ]}
                                />
                            </div>
                        ) : (
                            <Alert type="success" message="Toàn bộ 100% dòng dữ liệu hợp lệ và đã được nhập thành công!" showIcon />
                        )}

                        <div style={{ textAlign: 'right', marginTop: 16 }}>
                            <Space>
                                <Button onClick={() => { setImportResult(null); setPreviewData([]); }}>
                                    Nhập thêm tệp khác
                                </Button>
                                <Button type="primary" onClick={() => setIsImportModalOpen(false)}>
                                    Hoàn tất & Đóng
                                </Button>
                            </Space>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}