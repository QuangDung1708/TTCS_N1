import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Button, Input, Select, Space, Modal, Drawer, Tabs, 
  Form, message, Row, Col, Card, Tooltip, Upload, InputNumber, Statistic, Divider, Alert, Checkbox, Avatar, Timeline, Empty 
} from 'antd';
import { 
  SearchOutlined, EyeOutlined, CustomerServiceOutlined, 
  BranchesOutlined, EditOutlined, DeleteOutlined, 
  ClockCircleOutlined, CheckCircleOutlined, FilterOutlined,
  SaveOutlined, PlusOutlined, ReloadOutlined, SwapOutlined,
  DownloadOutlined, UploadOutlined, FileExcelOutlined,
  WarningOutlined, UserOutlined, FileTextOutlined, DollarOutlined,
  SendOutlined, StarFilled, StarOutlined, FolderOpenOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ExcelDraggerUpload from './components/ExcelDraggerUpload';

const { Option } = Select;

export default function CustomerManagement() {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [careList, setCareList] = useState([]);
  const [customFieldsList, setCustomFieldsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [savedFiltersList, setSavedFiltersList] = useState([]);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState(null);
  const [saveFilterModalOpen, setSaveFilterModalOpen] = useState(false);
  const [saveFilterForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [careDays, setCareDays] = useState(15);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleCode = (currentUser.role_code || currentUser.role || '').toLowerCase();
  const isTeamLeadOrAdmin = roleCode === 'team_lead' || roleCode === 'admin' || currentUser.role_id === 1;

  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [size, setSize] = useState(null);
  const [ownerId, setOwnerId] = useState(null);

  // Modals & Drawers
  const [drawer360Open, setDrawer360Open] = useState(false);
  const [customer360Data, setCustomer360Data] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Quản lý người liên hệ
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Ghi chú hoạt động nhanh
  const [newActivityContent, setNewActivityContent] = useState('');
  const [newActivityType, setNewActivityType] = useState('Ghi chú');

  const [masterCust, setMasterCust] = useState(null);
  const [dupCust, setDupCust] = useState(null);

  const [excelPreviewData, setExcelPreviewData] = useState([]);
  const [updateDuplicates, setUpdateDuplicates] = useState(true);

  const [customerForm] = Form.useForm();
  const [ticketForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [dealForm] = Form.useForm();
  const [reassignForm] = Form.useForm();

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchUsersList = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/customers/users-list', getHeaders());
      setUsersList(res.data.data || []);
    } catch (e) {
      setUsersList([]);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/customers/custom-fields-active', getHeaders());
      setCustomFieldsList(res.data.data || []);
    } catch (e) {
      setCustomFieldsList([]);
    }
  };

  const fetchSavedFilters = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/customers/saved-filters', getHeaders());
      const defaultFilters = [
        { id: 'def_1', filter_name: 'Khách cần gọi trong tuần (Tiềm năng)', criteria: { status: 'Tiềm năng' } },
        { id: 'def_2', filter_name: 'Doanh nghiệp lớn CNTT (200+ nhân sự)', criteria: { industry: 'Công nghệ thông tin', company_size: '200+ nhân sự' } },
        { id: 'def_3', filter_name: 'Khách hàng đang giao dịch', criteria: { status: 'Đang giao dịch' } }
      ];
      setSavedFiltersList([...(res.data.data || []), ...defaultFilters]);
    } catch (e) {
      setSavedFiltersList([]);
    }
  };

  const fetchCustomers = async (overrideParams) => {
    setLoading(true);
    try {
      const params = overrideParams || { search, status, industry, company_size: size, owner_id: ownerId };
      const res = await axios.get('http://localhost:5001/api/customers', {
        params,
        ...getHeaders()
      });
      setCustomers(res.data.data || []);
    } catch (err) {
      message.error('Lỗi nạp danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchCareList = async (days = careDays) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/customers/care-list?days=${days}`, getHeaders());
      setCareList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsersList();
    fetchCustomFields();
    fetchSavedFilters();
    fetchCustomers();
    fetchCareList();
  }, [status, industry, size, ownerId]);

  const handleApplySavedFilter = (filterId) => {
    setSelectedSavedFilterId(filterId);
    const selected = savedFiltersList.find(f => f.id === filterId);
    if (!selected) return;

    const crit = selected.criteria || {};
    setSearch(crit.search || '');
    setStatus(crit.status || null);
    setIndustry(crit.industry || null);
    setSize(crit.company_size || null);
    setOwnerId(crit.owner_id || null);

    message.success(`Đã áp dụng bộ lọc: "${selected.filter_name}"`);
    fetchCustomers({
      search: crit.search || '',
      status: crit.status || null,
      industry: crit.industry || null,
      company_size: crit.company_size || null,
      owner_id: crit.owner_id || null
    });
  };

  const handleOpenSaveFilterModal = () => {
    saveFilterForm.resetFields();
    saveFilterForm.setFieldsValue({
      filter_name: `Bộ lọc ${new Date().toLocaleDateString('vi-VN')}`
    });
    setSaveFilterModalOpen(true);
  };

  const handleSaveCurrentFilter = async (values) => {
    try {
      const criteria = {
        search: search || '',
        status: status || null,
        industry: industry || null,
        company_size: size || null,
        owner_id: ownerId || null
      };
      await axios.post('http://localhost:5001/api/customers/saved-filters', {
        filter_name: values.filter_name,
        criteria
      }, getHeaders());
      message.success('Đã lưu cấu hình bộ lọc thành công!');
      setSaveFilterModalOpen(false);
      fetchSavedFilters();
    } catch (err) {
      message.error('Lỗi khi lưu bộ lọc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus(null);
    setIndustry(null);
    setSize(null);
    setOwnerId(null);
    setSelectedSavedFilterId(null);
    fetchCustomers({ search: '', status: null, industry: null, company_size: null, owner_id: null });
    message.info('Đã đặt lại bộ lọc');
  };

  const handleOpen360 = async (cust) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/customers/${cust.id}/360`, getHeaders());
      setCustomer360Data(res.data.data);
      setDrawer360Open(true);
    } catch (err) {
      message.error('Không thể mở hồ sơ 360 độ');
    }
  };

  const handleMarkContacted = async (id) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/${id}/contacted`, {}, getHeaders());
      message.success('Đã cập nhật trạng thái liên hệ thành công!');
      fetchCustomers();
      fetchCareList();
    } catch (err) {
      message.error('Cập nhật thất bại');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/tickets/${ticketId}`, { status: newStatus }, getHeaders());
      message.success(`Đã cập nhật trạng thái: ${newStatus}`);
      fetchCustomers();
      if (customer360Data) {
        const res = await axios.get(`http://localhost:5001/api/customers/${customer360Data.customer.id}/360`, getHeaders());
        setCustomer360Data(res.data.data);
      }
    } catch (err) {
      message.error('Lỗi cập nhật ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveCustomer = async (values) => {
    try {
      const { custom_fields, ...rest } = values;
      const payload = { ...rest, custom_fields: custom_fields || {} };

      if (editingCustomer) {
        await axios.put(`http://localhost:5001/api/customers/${editingCustomer.id}`, payload, getHeaders());
        message.success('Cập nhật thông tin khách hàng thành công!');
      } else {
        await axios.post('http://localhost:5001/api/customers', payload, getHeaders());
        message.success('Thêm khách hàng mới thành công!');
      }

      setCustomerModalOpen(false);
      customerForm.resetFields();
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi lưu thông tin khách hàng');
    }
  };

  const handleCreateTicket = async (values) => {
    try {
      const res = await axios.post('http://localhost:5001/api/customers/tickets', {
        customer_id: selectedCustomer.id,
        ...values
      }, getHeaders());
      message.success(res.data.message);
      setTicketModalOpen(false);
      ticketForm.resetFields();
      fetchCustomers();
      if (drawer360Open && customer360Data?.customer?.id === selectedCustomer.id) {
        handleOpen360(selectedCustomer);
      }
    } catch (err) {
      message.error('Lỗi tạo yêu cầu hỗ trợ');
    }
  };

  const handleCreateDeal = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/customers/deals', {
        customer_id: customer360Data.customer.id,
        ...values
      }, getHeaders());
      message.success('Đã thêm cơ hội bán hàng vào Pipeline!');
      setDealModalOpen(false);
      dealForm.resetFields();
      fetchCustomers();
      handleOpen360(customer360Data.customer);
    } catch (err) {
      message.error('Lỗi tạo cơ hội');
    }
  };

  const handleSaveContact = async (values) => {
    try {
      if (editingContact) {
        await axios.put(`http://localhost:5001/api/customers/contacts/${editingContact.id}`, {
          customer_id: customer360Data.customer.id,
          ...values
        }, getHeaders());
        message.success('Cập nhật thông tin người liên hệ thành công!');
      } else {
        await axios.post('http://localhost:5001/api/customers/contacts', {
          customer_id: customer360Data.customer.id,
          ...values
        }, getHeaders());
        message.success('Thêm người liên hệ mới thành công!');
      }

      setContactModalOpen(false);
      setEditingContact(null);
      contactForm.resetFields();
      handleOpen360(customer360Data.customer);
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi lưu người liên hệ');
    }
  };

  const handleSetPrimaryContact = async (contact) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/contacts/${contact.id}/primary`, {}, getHeaders());
      message.success(`Đã đặt ${contact.full_name} làm đầu mối chính!`);
      handleOpen360(customer360Data.customer);
    } catch (err) {
      message.error('Lỗi cập nhật đầu mối chính');
    }
  };

  const handleDeleteContact = (contact) => {
    Modal.confirm({
      title: 'Xác nhận xóa người liên hệ?',
      content: `Bạn có chắc muốn xóa "${contact.full_name}" khỏi danh bạ công ty? Hành động này sẽ được ghi nhận vào lịch sử hoạt động.`,
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await axios.delete(`http://localhost:5001/api/customers/contacts/${contact.id}`, getHeaders());
          message.success('Đã xóa người liên hệ thành công!');
          handleOpen360(customer360Data.customer);
        } catch (err) {
          message.error('Lỗi khi xóa người liên hệ');
        }
      }
    });
  };

  const handleReassignContact = async (values) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/contacts/${selectedContact.id}/reassign`, {
        new_customer_id: values.new_customer_id
      }, getHeaders());
      message.success(`Đã chuyển ${selectedContact.full_name} sang doanh nghiệp mới và lưu vết lịch sử!`);
      setReassignModalOpen(false);
      reassignForm.resetFields();
      handleOpen360(customer360Data.customer);
      fetchCustomers();
    } catch (err) {
      message.error('Lỗi chuyển liên hệ');
    }
  };

  const handleAddManualActivity = async () => {
    if (!newActivityContent.trim()) {
      return message.warning('Vui lòng nhập nội dung hoạt động!');
    }
    try {
      await axios.post('http://localhost:5001/api/customers/activities', {
        customer_id: customer360Data.customer.id,
        activity_type: newActivityType,
        content: newActivityContent.trim()
      }, getHeaders());
      message.success('Đã ghi nhận hoạt động vào dòng thời gian!');
      setNewActivityContent('');
      handleOpen360(customer360Data.customer);
    } catch (err) {
      message.error('Lỗi lưu hoạt động');
    }
  };

  const handleConfirmMerge = async () => {
    if (!masterCust || !dupCust) return message.warning('Vui lòng chọn đủ 2 bản ghi!');
    try {
      await axios.post('http://localhost:5001/api/customers/merge', {
        master_id: masterCust.id,
        duplicate_id: dupCust.id
      }, getHeaders());
      message.success('Đã gộp khách hàng trùng thành công!');
      setMergeModalOpen(false);
      setMasterCust(null);
      setDupCust(null);
      fetchCustomers();
    } catch (err) {
      message.error('Lỗi gộp khách hàng');
    }
  };

  const handleDownloadTemplate = () => {
    const templateHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; }
          th { background-color: #1677ff; color: #ffffff; font-weight: bold; border: 1px solid #0958d9; padding: 10px 14px; text-align: center; }
          td { border: 1px solid #d9d9d9; padding: 8px 12px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Tên doanh nghiệp</th><th>Mã số thuế</th><th>Ngành nghề</th><th>Quy mô</th><th>Website</th><th>Trạng thái</th><th>Giá trị hợp đồng (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Công ty Cổ phần Công nghệ Misa</td><td>0101248141</td><td>Công nghệ thông tin</td><td>51-200 nhân sự</td><td>https://misa.vn</td><td>Tiềm năng</td><td>150000000</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([templateHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Mau_Nhap_Khach_Hang_CRM.xls';
    link.click();
    message.success('Đã tải tệp mẫu Excel!');
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let parsedRows = [];
      if (content.includes('<table') || content.includes('<tr')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        doc.querySelectorAll('tr').forEach((row, idx) => {
          if (idx === 0) return;
          const cols = row.querySelectorAll('td');
          if (cols.length >= 2) {
            parsedRows.push({
              company_name: cols[0]?.textContent?.trim() || '',
              tax_code: cols[1]?.textContent?.trim() || '',
              industry: cols[2]?.textContent?.trim() || 'Chưa phân loại',
              company_size: cols[3]?.textContent?.trim() || '51-200 nhân sự',
              website: cols[4]?.textContent?.trim() || '',
              status: cols[5]?.textContent?.trim() || 'Tiềm năng',
              total_contract_value: Number(cols[6]?.textContent?.replace(/[^0-9]/g, '') || 0)
            });
          }
        });
      } else {
        content.split('\n').map(l => l.trim()).filter(Boolean).slice(1).forEach(line => {
          const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2) {
            parsedRows.push({
              company_name: cols[0] || '',
              tax_code: cols[1] || '',
              industry: cols[2] || 'Chưa phân loại',
              company_size: cols[3] || '51-200 nhân sự',
              website: cols[4] || '',
              status: cols[5] || 'Tiềm năng',
              total_contract_value: Number(cols[6] || 0)
            });
          }
        });
      }
      const existingTaxCodes = customers.map(c => c.tax_code).filter(Boolean);
      const previewWithCheck = parsedRows.map((r, index) => ({
        ...r,
        key: index,
        is_duplicate: existingTaxCodes.includes(r.tax_code)
      }));
      setExcelPreviewData(previewWithCheck);
      message.success(`Đã nạp ${previewWithCheck.length} dòng dữ liệu xem trước!`);
    };
    reader.readAsText(file);
    return false;
  };

  const handleConfirmImport = async () => {
    try {
      const res = await axios.post('http://localhost:5001/api/customers/bulk-import', {
        customers: excelPreviewData,
        updateDuplicates
      }, getHeaders());
      message.success(res.data.message);
      setImportExcelOpen(false);
      setExcelPreviewData([]);
      fetchCustomers();
    } catch (err) {
      message.error('Lỗi nạp danh sách');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'Người liên hệ':
      case 'Nhân sự':
        return <UserOutlined style={{ color: '#1677ff', fontSize: 16 }} />;
      case 'Cơ hội':
        return <DollarOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
      case 'CSKH':
        return <CustomerServiceOutlined style={{ color: '#fa8c16', fontSize: 16 }} />;
      case 'Hệ thống':
        return <FileTextOutlined style={{ color: '#722ed1', fontSize: 16 }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />;
    }
  };

  const columns = [
    {
      title: 'Khách Hàng Doanh Nghiệp',
      dataIndex: 'company_name',
      key: 'company_name',
      fixed: 'left',
      width: 250,
      render: (text, record) => (
        <div>
          <span 
            style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
            onClick={() => handleOpen360(record)}
          >
            {text}
          </span>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
            MST: {record.tax_code || '---'}
            {record.parent_company_name && (
              <span style={{ marginLeft: 8, color: '#722ed1', fontWeight: 500 }}>
                • Con của: {record.parent_company_name}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Ngành / Quy Mô',
      key: 'industry_size',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.industry || 'Chưa phân loại'}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.company_size || 'Chưa rõ'}</div>
        </div>
      )
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      width: 130,
      render: (st) => {
        const color = st === 'Khách hàng' ? 'green' : st === 'Đang giao dịch' ? 'orange' : st === 'Ngừng hợp tác' ? 'red' : 'blue';
        return <Tag color={color}>{st || 'Tiềm năng'}</Tag>;
      }
    },
    {
      title: 'Cờ Rủi Ro',
      dataIndex: 'risk_level',
      width: 150,
      render: (risk, record) => {
        const isDanger = risk === 'Nguy cấp';
        return (
          <Tag color={isDanger ? 'red' : 'green'} style={{ fontWeight: 600 }}>
            {isDanger ? <WarningOutlined /> : <CheckCircleOutlined />} {risk}
            {isDanger && record.unresolved_tickets_count > 0 && ` (${record.unresolved_tickets_count} tồn)`}
          </Tag>
        );
      }
    },
    {
      title: 'Người Phụ Trách',
      dataIndex: 'assigned_user_name',
      width: 180,
      render: (u) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: u && u !== 'Chưa phân công' ? '#1677ff' : '#d9d9d9' }}>
            {u && u !== 'Chưa phân công' ? u[0] : <UserOutlined />}
          </Avatar>
          <span style={{ fontSize: 13 }}>{u || 'Chưa phân công'}</span>
        </Space>
      )
    },
    ...customFieldsList.map(cf => ({
      title: cf.field_label || cf.label || cf.name,
      key: cf.field_key || cf.name || cf.id,
      width: 140,
      render: (_, r) => r.custom_fields_data?.[cf.field_key || cf.name] || <span style={{ color: '#bfbfbf' }}>—</span>
    })),
    {
      title: 'Hành Động',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Hồ sơ 360 độ">
            <Button type="primary" shape="circle" size="small" icon={<EyeOutlined />} onClick={() => handleOpen360(record)} />
          </Tooltip>
          <Tooltip title="Yêu cầu hỗ trợ CSKH">
            <Button shape="circle" size="small" icon={<CustomerServiceOutlined />} onClick={() => { setSelectedCustomer(record); setTicketModalOpen(true); }} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa thông tin">
            <Button 
              shape="circle" 
              size="small" 
              icon={<EditOutlined style={{ color: '#faad14' }} />} 
              onClick={() => {
                setEditingCustomer(record);
                customerForm.setFieldsValue({
                  ...record,
                  created_by: record.created_by || record.assigned_user_id || undefined,
                  status: record.status || 'Tiềm năng',
                  custom_fields: record.custom_fields_data || {}
                });
                setCustomerModalOpen(true);
              }} 
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<DeleteOutlined />} 
              onClick={() => {
                Modal.confirm({
                  title: 'Xác nhận xóa?',
                  content: `Bạn có chắc muốn xóa ${record.company_name}?`,
                  onOk: async () => {
                    await axios.delete(`http://localhost:5001/api/customers/${record.id}`, getHeaders());
                    message.success('Đã xóa thành công!');
                    fetchCustomers();
                  }
                });
              }} 
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      
      {/* 1. KHỐI TIÊU ĐỀ ĐƯỢC BỌC VÀO CARD TRẮNG BO GÓC (ĐỒNG BỘ 100% VỚI KHAI BÁO DANH MỤC) */}
      <Card 
        bordered={false} 
        style={{ 
          borderRadius: 8, 
          marginBottom: 16, 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' 
        }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 8, 
              backgroundColor: '#e6f4ff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <IdcardOutlined style={{ fontSize: 22, color: '#1677ff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
                Quản Lý Khách Hàng & Doanh Nghiệp
              </h2>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                Theo dõi hồ sơ 360 độ, danh bạ người liên hệ và cơ cấu công ty mẹ - con
              </div>
            </div>
          </div>

          <Space wrap size="middle">
            {isTeamLeadOrAdmin && (
              <Button 
                icon={<BranchesOutlined />} 
                onClick={() => { setMasterCust(null); setDupCust(null); setMergeModalOpen(true); }}
                style={{ borderColor: '#722ed1', color: '#722ed1', fontWeight: 500 }}
              >
                Gộp Khách Hàng
              </Button>
            )}
            <Button icon={<UploadOutlined />} onClick={() => setImportExcelOpen(true)}>
              Nhập Excel
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              Tải Mẫu Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchCustomers(); fetchCareList(); }}>
              Làm mới
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => { 
                setEditingCustomer(null); 
                customerForm.resetFields(); 
                customerForm.setFieldsValue({ 
                  status: 'Tiềm năng',
                  created_by: currentUser.id || undefined
                });
                setCustomerModalOpen(true); 
              }}
              style={{ fontWeight: 600 }}
            >
              Thêm Khách Hàng
            </Button>
          </Space>
        </div>
      </Card>

      {/* 2. CARD CHỨA BẢNG VÀ BỘ LỌC ĐÃ SẮP XẾP CHỐNG TRÀN NÚT */}
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { key: 'customers', label: `Danh Sách Khách Hàng (${customers.length})` },
            { key: 'care', label: <span><ClockCircleOutlined /> Khách Cần Chăm Sóc Định Kỳ ({careList.length})</span> }
          ]}
        />

        {activeTab === 'customers' && (
          <div style={{ marginBottom: 16 }}>
            {/* HÀNG BỘ LỌC FLEXBOX CĂN CHỈNH GỌN GÀNG KHÔNG BỊ TRÀN VIỀN */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                <Input 
                  placeholder="Tìm tên, mã số thuế, số điện thoại..." 
                  prefix={<SearchOutlined />} 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  onPressEnter={() => fetchCustomers()} 
                />
              </div>
              <div style={{ width: 130 }}>
                <Select placeholder="Trạng thái" allowClear style={{ width: '100%' }} value={status} onChange={setStatus}>
                  <Option value="Tiềm năng">Tiềm năng</Option>
                  <Option value="Đang giao dịch">Đang giao dịch</Option>
                  <Option value="Khách hàng">Khách hàng</Option>
                  <Option value="Ngừng hợp tác">Ngừng hợp tác</Option>
                </Select>
              </div>
              <div style={{ width: 160 }}>
                <Select placeholder="Ngành nghề" allowClear style={{ width: '100%' }} value={industry} onChange={setIndustry}>
                  <Option value="Công nghệ thông tin">Công nghệ thông tin</Option>
                  <Option value="Sản xuất - Tiêu dùng">Sản xuất - Tiêu dùng</Option>
                  <Option value="Sản xuất thép - Công nghiệp">Sản xuất thép - Công nghiệp</Option>
                  <Option value="Internet & Game">Internet & Game</Option>
                  <Option value="Giáo dục">Giáo dục</Option>
                </Select>
              </div>
              <div style={{ width: 140 }}>
                <Select placeholder="Quy mô" allowClear style={{ width: '100%' }} value={size} onChange={setSize}>
                  <Option value="1-50 nhân sự">1-50 nhân sự</Option>
                  <Option value="51-200 nhân sự">51-200 nhân sự</Option>
                  <Option value="200+ nhân sự">200+ nhân sự</Option>
                </Select>
              </div>
              <div style={{ width: 180 }}>
                <Select 
                  showSearch
                  allowClear
                  placeholder="Người phụ trách..." 
                  style={{ width: '100%' }} 
                  value={ownerId} 
                  onChange={setOwnerId}
                  optionFilterProp="label"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={usersList.map(u => ({
                    value: u.id,
                    label: `👤 ${u.full_name} (${u.email})`
                  }))}
                />
              </div>

              {/* CỤM NÚT THAO TÁC LUÔN NẰM TRỌN BÊN TRONG CARD */}
              <div style={{ marginLeft: 'auto' }}>
                <Space size="small">
                  <Button icon={<FilterOutlined />} type="primary" onClick={() => fetchCustomers()}>Lọc</Button>
                  <Button icon={<SaveOutlined />} onClick={handleOpenSaveFilterModal}>Lưu lọc</Button>
                  <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>Đặt lại</Button>
                </Space>
              </div>
            </div>

            {/* THANH ÁP DỤNG BỘ LỌC ĐÃ LƯU */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px dashed #d9d9d9' }}>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                <FolderOpenOutlined style={{ color: '#1677ff', marginRight: 4 }} />
                Áp dụng bộ lọc đã lưu:
              </span>
              <Select 
                placeholder="Chọn bộ lọc đã lưu để lọc nhanh..." 
                style={{ width: 340 }}
                value={selectedSavedFilterId}
                onChange={handleApplySavedFilter}
                allowClear
                onClear={handleResetFilters}
              >
                {savedFiltersList.map(f => (
                  <Option key={f.id} value={f.id}>
                     {f.filter_name}
                  </Option>
                ))}
              </Select>
              {selectedSavedFilterId && (
                <Tag color="cyan">Đang lọc theo mẫu đã lưu</Tag>
              )}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <Table 
            columns={columns} 
            dataSource={customers} 
            rowKey="id" 
            loading={loading}
            scroll={{ x: 1250 }}
            pagination={{ pageSize: 10 }}
          />
        )}

        {activeTab === 'care' && (
          <div>
            <Card 
              size="small" 
              style={{ marginBottom: 16, background: '#f8fafc', borderRadius: 8, borderColor: '#e2e8f0' }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={14}>
                  <Space wrap align="center">
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      <ClockCircleOutlined style={{ color: '#1677ff', marginRight: 6 }} />
                      Cấu hình số ngày chưa tương tác (N ngày):
                    </span>
                    <InputNumber 
                      min={1} 
                      max={365} 
                      value={careDays} 
                      onChange={(v) => setCareDays(v || 15)} 
                      onPressEnter={() => fetchCareList(careDays)}
                      style={{ width: 80 }}
                    />
                    <Button type="primary" onClick={() => fetchCareList(careDays)}>
                      Áp dụng
                    </Button>
                    <span style={{ color: '#94a3b8', margin: '0 4px' }}>|</span>
                    <Space size={4}>
                      {[7, 15, 30, 60].map(d => (
                        <Tag.CheckableTag 
                          key={d} 
                          checked={careDays === d}
                          onChange={() => { setCareDays(d); fetchCareList(d); }}
                          style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px' }}
                        >
                          {d} ngày
                        </Tag.CheckableTag>
                      ))}
                    </Space>
                  </Space>
                </Col>

                <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                  <Space size="large">
                    <Statistic 
                      title={<span style={{ fontSize: 12, color: '#64748b' }}>Khách hàng cần chăm sóc</span>}
                      value={careList.length}
                      suffix="doanh nghiệp"
                      valueStyle={{ fontSize: 18, fontWeight: 700, color: '#cf1322' }}
                    />
                    <Divider type="vertical" style={{ height: 32 }} />
                    <Statistic 
                      title={<span style={{ fontSize: 12, color: '#64748b' }}>Tổng giá trị hợp đồng cần bảo vệ</span>}
                      value={careList.reduce((sum, item) => sum + Number(item.total_contract_value || 0), 0)}
                      formatter={(v) => `${Number(v).toLocaleString()} VNĐ`}
                      valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}
                    />
                  </Space>
                </Col>
              </Row>
            </Card>

            <Table 
              rowKey="id"
              dataSource={careList}
              loading={loading}
              pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} khách hàng cần chăm sóc` }}
              columns={[
                { 
                  title: 'Doanh Nghiệp Đã Ký Hợp Đồng', 
                  dataIndex: 'company_name', 
                  key: 'company_name',
                  render: (text, record) => (
                    <div>
                      <span 
                        style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
                        onClick={() => handleOpen360(record)}
                      >
                        {text}
                      </span>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        MST: {record.tax_code || '---'}
                        {record.parent_company_name && (
                          <span style={{ marginLeft: 6, color: '#722ed1' }}>
                            • Con của: {record.parent_company_name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                },
                { 
                  title: 'Giá Trị Hợp Đồng (Giảm dần)', 
                  dataIndex: 'total_contract_value',
                  key: 'total_contract_value',
                  defaultSortOrder: 'descend',
                  sorter: (a, b) => a.total_contract_value - b.total_contract_value,
                  render: (val) => (
                    <span style={{ color: '#1677ff', fontWeight: 700, fontSize: 14 }}>
                      {Number(val || 0).toLocaleString()} VNĐ
                    </span>
                  )
                },
                { 
                  title: 'Tương Tác Gần Nhất', 
                  dataIndex: 'last_interaction_date',
                  key: 'last_interaction_date',
                  render: (d) => d && d !== '1970-01-01' ? new Date(d).toLocaleDateString('vi-VN') : 'Từ khi tạo hồ sơ'
                },
                { 
                  title: 'Thời Gian Bỏ Quên', 
                  dataIndex: 'days_inactive', 
                  key: 'days_inactive',
                  render: (d) => (
                    <Tag color="error" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
                       {d} ngày chưa tương tác
                    </Tag>
                  ) 
                },
                { 
                  title: 'Người Phụ Trách', 
                  dataIndex: 'assigned_user_name', 
                  key: 'assigned_user_name',
                  render: (u) => (
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />}>
                        {u ? u[0] : ''}
                      </Avatar>
                      <span>{u || 'Chưa phân công'}</span>
                    </Space>
                  )
                },
                {
                  title: 'Hành Động',
                  key: 'care_action',
                  align: 'center',
                  width: 200,
                  render: (_, record) => (
                    <Space>
                      <Tooltip title="Xem chi tiết hồ sơ trước khi liên hệ">
                        <Button 
                          shape="circle" 
                          size="small" 
                          icon={<EyeOutlined />} 
                          onClick={() => handleOpen360(record)} 
                        />
                      </Tooltip>
                      <Button 
                        type="primary" 
                        icon={<CheckCircleOutlined />} 
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 500 }}
                        onClick={() => {
                          Modal.confirm({
                            title: `Xác nhận đã liên hệ: ${record.company_name}?`,
                            content: 'Thao tác này sẽ đặt lại mốc thời gian chăm sóc về hôm nay và tự động lưu vào dòng thời gian hoạt động của khách hàng.',
                            okText: 'Xác nhận đã liên hệ',
                            cancelText: 'Hủy',
                            okButtonProps: { style: { backgroundColor: '#52c41a', borderColor: '#52c41a' } },
                            onOk: async () => {
                              await handleMarkContacted(record.id);
                            }
                          });
                        }}
                      >
                        Đã liên hệ
                      </Button>
                    </Space>
                  )
                }
              ]}
            />
          </div>
        )}
      </Card>

      {/* DRAWER HỒ SƠ 360 ĐỘ KHÁCH HÀNG */}
      <Drawer
        title={`Hồ Sơ Doanh Nghiệp: ${customer360Data?.customer?.company_name || ''}`}
        width={880}
        open={drawer360Open}
        onClose={() => setDrawer360Open(false)}
      >
        {customer360Data && (
          <Tabs items={[
            {
              key: 'overview',
              label: 'Tổng Quan & Doanh Số',
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Card title="Hợp Đồng Đã Ký">
                        <Statistic value={Number(customer360Data.signedValue || 0)} suffix="VNĐ" valueStyle={{ color: '#1890ff', fontWeight: 700 }} />
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>Pháp nhân này (Deals Thành công)</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Cơ Hội Đang Mở (Pipeline)">
                        <Statistic value={Number(customer360Data.openDealsValue || 0)} suffix="VNĐ" valueStyle={{ color: '#faad14', fontWeight: 700 }} />
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>Đang đàm phán, báo giá</div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card title="Doanh Số Cả Tập Đoàn" style={{ background: '#f6ffed' }}>
                        <Statistic value={Number(customer360Data.groupTotalValue || 0)} suffix="VNĐ" valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
                        <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>Tổng cộng cả Mẹ + Con</div>
                      </Card>
                    </Col>
                  </Row>
                  
                  {customer360Data.customer.risk_level === 'Nguy cấp' && (
                    <Alert 
                      type="error" 
                      showIcon 
                      message={`Cảnh Báo Nguy Cơ Rời Bỏ: ${customer360Data.customer.assigned_user_name}`}
                      description={`Khách hàng hiện có ${customer360Data.customer.unresolved_count || 0} yêu cầu hỗ trợ tồn đọng chưa được giải quyết.`}
                      style={{ marginTop: 16 }}
                    />
                  )}

                  <div style={{ marginTop: 20, fontSize: 14 }}>
                    <p><b>Mã số thuế:</b> {customer360Data.customer.tax_code || '---'}</p>
                    <p><b>Website:</b> <a href={customer360Data.customer.website} target="_blank" rel="noreferrer">{customer360Data.customer.website || '---'}</a></p>
                    <p>
                      <b>Cờ rủi ro: </b> 
                      <Tag color={customer360Data.customer.risk_level === 'Nguy cấp' ? 'red' : 'green'} style={{ fontWeight: 600 }}>
                        {customer360Data.customer.risk_level}
                      </Tag>
                    </p>
                    {customer360Data.customer.parent_company_name && (
                      <p><b>Trực thuộc tập đoàn mẹ:</b> <Tag color="purple">{customer360Data.customer.parent_company_name}</Tag></p>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'contacts',
              label: `Người Liên Hệ (${customer360Data.contacts?.length || 0})`,
              children: (
                <div>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    style={{ marginBottom: 16 }} 
                    onClick={() => {
                      setEditingContact(null);
                      contactForm.resetFields();
                      contactForm.setFieldsValue({
                        decision_role: 'Người dùng cuối',
                        is_primary: false
                      });
                      setContactModalOpen(true);
                    }}
                  >
                    Thêm Người Liên Hệ
                  </Button>
                  <Table 
                    dataSource={customer360Data.contacts}
                    rowKey="id"
                    columns={[
                      { title: 'Họ Tên', dataIndex: 'full_name', render: (t) => <b>{t}</b> },
                      { title: 'Chức Vụ', dataIndex: 'position', render: (t) => t || '—' },
                      { title: 'Số Điện Thoại', dataIndex: 'phone' },
                      { title: 'Email', dataIndex: 'email', render: (e) => e || '—' },
                      { 
                        title: 'Vai Trò Quyết Định', 
                        dataIndex: 'decision_role', 
                        render: (r) => <Tag color="blue">{r}</Tag> 
                      },
                      { 
                        title: 'Đầu Mối Chính', 
                        dataIndex: 'is_primary', 
                        width: 140,
                        render: (p, record) => {
                          const isPrimary = p === 1 || p === true || p === '1';
                          return isPrimary ? (
                            <Tag color="gold" icon={<StarFilled />} style={{ fontWeight: 600 }}>
                              Chính
                            </Tag>
                          ) : (
                            <Button 
                              type="link" 
                              size="small" 
                              icon={<StarOutlined />}
                              style={{ padding: 0 }}
                              onClick={() => handleSetPrimaryContact(record)}
                            >
                              Đặt làm chính
                            </Button>
                          );
                        } 
                      },
                      {
                        title: 'Hành Động',
                        key: 'action',
                        width: 170,
                        render: (_, r) => (
                          <Space size="small">
                            <Tooltip title="Chuyển sang công ty khác (AC S3-02)">
                              <Button 
                                size="small" 
                                icon={<SwapOutlined />} 
                                onClick={() => { setSelectedContact(r); setReassignModalOpen(true); }}
                              >
                                Chuyển
                              </Button>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa thông tin">
                              <Button 
                                size="small" 
                                icon={<EditOutlined style={{ color: '#faad14' }} />} 
                                onClick={() => {
                                  setEditingContact(r);
                                  contactForm.setFieldsValue({
                                    ...r,
                                    is_primary: Boolean(r.is_primary)
                                  });
                                  setContactModalOpen(true);
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="Xóa người liên hệ">
                              <Button 
                                size="small" 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => handleDeleteContact(r)}
                              />
                            </Tooltip>
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'deals',
              label: `Cơ Hội Bán Hàng (${customer360Data.deals?.length || 0})`,
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setDealModalOpen(true)}>
                      Thêm Cơ Hội Bán Hàng (Pipeline)
                    </Button>
                  </div>
                  <Table 
                    dataSource={customer360Data.deals}
                    rowKey="id"
                    columns={[
                      { title: 'Tên Cơ Hội / Dự Án', dataIndex: 'title', render: (t) => <b>{t}</b> },
                      { title: 'Giá Trị', dataIndex: 'amount', render: (val) => <span style={{ color: '#1677ff', fontWeight: 600 }}>{Number(val || 0).toLocaleString()} VNĐ</span> },
                      { 
                        title: 'Giai Đoạn', 
                        dataIndex: 'stage', 
                        render: (s) => {
                          const color = s === 'Thành công' || String(s).includes('Won') ? 'green' : String(s).includes('Lost') ? 'red' : 'orange';
                          return <Tag color={color}>{s}</Tag>;
                        } 
                      },
                      { title: 'Ngày Tạo', dataIndex: 'created_at', render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : 'Hôm nay' }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'tickets',
              label: `Yêu Cầu Hỗ Trợ (${customer360Data.tickets?.length || 0})`,
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedCustomer(customer360Data.customer); setTicketModalOpen(true); }}>
                      Tạo Yêu Cầu Hỗ Trợ
                    </Button>
                  </div>
                  <Table 
                    dataSource={customer360Data.tickets}
                    rowKey="id"
                    columns={[
                      { title: 'Tiêu Đề', dataIndex: 'title', render: (t) => <b>{t}</b> },
                      { 
                        title: 'Mức Độ', 
                        dataIndex: 'priority', 
                        render: (p) => {
                          const val = p || 'Cao';
                          const color = (val === 'Khẩn cấp' || val === 'Cao') ? 'red' : val === 'Trung bình' ? 'orange' : 'blue';
                          return <Tag color={color}>{val}</Tag>;
                        } 
                      },
                      { 
                        title: 'Người Xử Lý', 
                        dataIndex: 'handler_name', 
                        render: (h) => (
                          <Space>
                            <Avatar size="small" style={{ backgroundColor: '#1677ff' }}>{h ? h[0] : <UserOutlined />}</Avatar>
                            <span>{h || 'Chưa phân công'}</span>
                          </Space>
                        ) 
                      },
                      { 
                        title: 'Trạng Thái', 
                        dataIndex: 'status', 
                        render: (st, record) => (
                          <Select 
                            value={st || 'Mới'} 
                            size="small" 
                            style={{ width: 140 }} 
                            onChange={(val) => handleUpdateTicketStatus(record.id, val)}
                          >
                            <Option value="Mới"><Tag color="cyan">Mới</Tag></Option>
                            <Option value="Đang xử lý"><Tag color="processing">Đang xử lý</Tag></Option>
                            <Option value="Đã giải quyết"><Tag color="success">Đã giải quyết</Tag></Option>
                            <Option value="Đóng"><Tag color="default">Đóng</Tag></Option>
                          </Select>
                        )
                      },
                      { title: 'Ngày Tạo', dataIndex: 'created_at', render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : 'Hôm nay' }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'activities',
              label: `Lịch Sử Hoạt Động (${customer360Data.activities?.length || 0})`,
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Card size="small" style={{ marginBottom: 24, background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Select 
                        value={newActivityType} 
                        onChange={setNewActivityType} 
                        style={{ width: 150 }}
                      >
                        <Option value="Ghi chú">📝 Ghi chú</Option>
                        <Option value="Cuộc gọi">📞 Cuộc gọi</Option>
                        <Option value="Gặp mặt">🤝 Gặp mặt</Option>
                        <Option value="CSKH">🎧 Chăm sóc</Option>
                      </Select>
                      <Input 
                        placeholder="Nhập nội dung tương tác hoặc ghi chú hoạt động mới..." 
                        value={newActivityContent}
                        onChange={(e) => setNewActivityContent(e.target.value)}
                        onPressEnter={handleAddManualActivity}
                      />
                      <Button type="primary" icon={<SendOutlined />} onClick={handleAddManualActivity}>
                        Ghi lại
                      </Button>
                    </div>
                  </Card>

                  {customer360Data.activities && customer360Data.activities.length > 0 ? (
                    <Timeline>
                      {customer360Data.activities.map(a => (
                        <Timeline.Item 
                          key={a.id} 
                          dot={getActivityIcon(a.activity_type)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <Tag color={
                                a.activity_type === 'Người liên hệ' ? 'blue' :
                                a.activity_type === 'Cơ hội' ? 'green' :
                                a.activity_type === 'CSKH' ? 'orange' :
                                a.activity_type === 'Nhân sự' ? 'cyan' : 'purple'
                              }>
                                {a.activity_type}
                              </Tag>
                              <span style={{ fontSize: 13, color: '#595959' }}>Thực hiện bởi: <b>{a.author_name}</b></span>
                            </Space>
                            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {new Date(a.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 14, color: '#262626', lineHeight: '1.6' }}>
                            {a.content}
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <Empty description="Chưa có lịch sử hoạt động ghi nhận" style={{ padding: '40px 0' }} />
                  )}

                </div>
              )
            }
          ]} />
        )}
      </Drawer>

      {/* MODAL LƯU BỘ LỌC HIỆN TẠI (AC S3-07) */}
      <Modal
        title="Lưu Cấu Hình Bộ Lọc Hiện Tại (AC S3-07)"
        open={saveFilterModalOpen}
        onCancel={() => setSaveFilterModalOpen(false)}
        onOk={() => saveFilterForm.submit()}
      >
        <Form form={saveFilterForm} layout="vertical" onFinish={handleSaveCurrentFilter}>
          <Form.Item name="filter_name" label="Tên bộ lọc cần lưu" rules={[{ required: true, message: 'Nhập tên bộ lọc!' }]}>
            <Input placeholder="Ví dụ: Khách CNTT cần gọi tuần này" />
          </Form.Item>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 13, color: '#64748b' }}>
            <div><b>Tiêu chí đang lưu:</b></div>
            <div>• Từ khóa: {search || '(Không có)'}</div>
            <div>• Trạng thái: {status || '(Tất cả)'}</div>
            <div>• Ngành nghề: {industry || '(Tất cả)'}</div>
            <div>• Quy mô: {size || '(Tất cả)'}</div>
            <div>• Người phụ trách: {ownerId ? usersList.find(u => u.id === ownerId)?.full_name : '(Tất cả)'}</div>
          </div>
        </Form>
      </Modal>

      {/* MODAL THÊM / CHỈNH SỬA NGƯỜI LIÊN HỆ */}
      <Modal
        title={editingContact ? `Chỉnh Sửa Người Liên Hệ: ${editingContact.full_name}` : "Thêm Người Liên Hệ Mới"}
        open={contactModalOpen}
        onCancel={() => { setContactModalOpen(false); setEditingContact(null); }}
        onOk={() => contactForm.submit()}
      >
        <Form form={contactForm} layout="vertical" onFinish={handleSaveContact}>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}>
            <Input placeholder="Ví dụ: Nguyễn Văn Khoa" />
          </Form.Item>
          <Form.Item name="position" label="Chức vụ">
            <Input placeholder="Ví dụ: Giám đốc kinh doanh" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập SĐT!' }]}>
            <Input placeholder="Ví dụ: 0912345678" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="khoanv@fpt.com.vn" />
          </Form.Item>
          <Form.Item name="decision_role" label="Vai trò quyết định" initialValue="Người dùng cuối">
            <Select>
              <Option value="Người quyết định">Người quyết định</Option>
              <Option value="Người ảnh hưởng">Người ảnh hưởng</Option>
              <Option value="Người dùng cuối">Người dùng cuối</Option>
              <Option value="Người cản trở">Người cản trở</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="is_primary" 
            valuePropName="checked" 
            initialValue={false}
            style={{ marginTop: 16, marginBottom: 8 }}
          >
            <Checkbox style={{ fontSize: 14, fontWeight: 500 }}>
              Đầu mối chính? (Có / Không)
            </Checkbox>
          </Form.Item>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 24, marginTop: -4 }}>
            * Nếu tích chọn, người này sẽ trở thành đầu mối liên hệ chính duy nhất của doanh nghiệp.
          </div>
        </Form>
      </Modal>

      {/* MODAL CHUYỂN DOANH NGHIỆP CHO LIÊN HỆ */}
      <Modal
        title={`Chuyển người liên hệ: ${selectedContact?.full_name}`}
        open={reassignModalOpen}
        onCancel={() => setReassignModalOpen(false)}
        onOk={() => reassignForm.submit()}
      >
        <Form form={reassignForm} layout="vertical" onFinish={handleReassignContact}>
          <Form.Item name="new_customer_id" label="Doanh nghiệp tiếp nhận mới:" rules={[{ required: true, message: 'Vui lòng chọn doanh nghiệp!' }]}>
            <Select placeholder="Chọn doanh nghiệp...">
              {customers.filter(c => c.id !== customer360Data?.customer?.id).map(c => (
                <Option key={c.id} value={c.id}>{c.company_name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL THÊM & CHỈNH SỬA KHÁCH HÀNG */}
      <Modal
        title={editingCustomer ? "Chỉnh Sửa Hồ Sơ Khách Hàng" : "Thêm Mới Khách Hàng Doanh Nghiệp"}
        open={customerModalOpen}
        onCancel={() => setCustomerModalOpen(false)}
        onOk={() => customerForm.submit()}
        width={720}
      >
        <Form form={customerForm} layout="vertical" onFinish={handleSaveCustomer}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="company_name" label="Tên doanh nghiệp" rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}>
                <Input placeholder="Ví dụ: Công ty Cổ phần VNG" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tax_code" label="Mã số thuế" rules={[{ required: true, message: 'Vui lòng nhập MST' }]}>
                <Input placeholder="Ví dụ: 0303541480" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="industry" label="Ngành nghề" initialValue="Công nghệ thông tin">
                <Select>
                  <Option value="Công nghệ thông tin">Công nghệ thông tin</Option>
                  <Option value="Sản xuất - Tiêu dùng">Sản xuất - Tiêu dùng</Option>
                  <Option value="Sản xuất thép - Công nghiệp">Sản xuất thép - Công nghiệp</Option>
                  <Option value="Internet & Game">Internet & Game</Option>
                  <Option value="Giáo dục">Giáo dục</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="company_size" label="Quy mô" initialValue="51-200 nhân sự">
                <Select>
                  <Option value="1-50 nhân sự">1-50 nhân sự</Option>
                  <Option value="51-200 nhân sự">51-200 nhân sự</Option>
                  <Option value="200+ nhân sự">200+ nhân sự</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái" initialValue="Tiềm năng">
                <Select placeholder="Chọn trạng thái...">
                  <Option value="Tiềm năng">Tiềm năng</Option>
                  <Option value="Đang giao dịch">Đang giao dịch</Option>
                  <Option value="Khách hàng">Khách hàng</Option>
                  <Option value="Ngừng hợp tác">Ngừng hợp tác</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="created_by" label="Người phụ trách (Nhân viên)" rules={[{ required: true, message: 'Chọn người phụ trách!' }]}>
                <Select 
                  showSearch
                  placeholder="Gõ tên để tìm kiếm nhân sự phụ trách..." 
                  optionFilterProp="label"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={usersList.map(u => ({
                    value: u.id,
                    label: `👤 ${u.full_name} (${u.email})`
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parent_id" label="Công ty mẹ (Tập đoàn)">
                <Select placeholder="Chọn công ty mẹ nếu có..." allowClear>
                  {customers.filter(c => c.id !== editingCustomer?.id).map(c => (
                    <Option key={c.id} value={c.id}>{c.company_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="total_contract_value" label="Giá trị hợp đồng ban đầu (VNĐ)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
          </Row>

          {customFieldsList.length > 0 && (
            <Card title="Trường Dữ Liệu Tùy Biến" size="small" style={{ background: '#fafafa', marginTop: 10 }}>
              <Row gutter={16}>
                {customFieldsList.map(cf => {
                  const fieldKey = cf.field_key || cf.name;
                  const fieldLabel = cf.field_label || cf.label || cf.name;
                  return (
                    <Col span={12} key={cf.id || fieldKey}>
                      <Form.Item name={['custom_fields', fieldKey]} label={fieldLabel}>
                        <Input placeholder={`Nhập ${fieldLabel}...`} />
                      </Form.Item>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          )}
        </Form>
      </Modal>

      {/* MODAL TẠO TICKET CSKH */}
      <Modal
        title={`Ghi Nhận Yêu Cầu Hỗ Trợ: ${selectedCustomer?.company_name}`}
        open={ticketModalOpen}
        onCancel={() => setTicketModalOpen(false)}
        onOk={() => ticketForm.submit()}
      >
        <Form form={ticketForm} layout="vertical" onFinish={handleCreateTicket}>
          <Form.Item name="title" label="Tiêu đề yêu cầu hỗ trợ" rules={[{ required: true, message: 'Nhập tiêu đề yêu cầu' }]}>
            <Input placeholder="Ví dụ: Phàn nàn về chất lượng dịch vụ, sự cố hệ thống..." />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="Mức độ ưu tiên" initialValue="Cao" rules={[{ required: true }]}>
                <Select>
                  <Option value="Thấp">Thấp</Option>
                  <Option value="Trung bình">Trung bình</Option>
                  <Option value="Cao">Cao</Option>
                  <Option value="Khẩn cấp">Khẩn cấp</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái" initialValue="Mới" rules={[{ required: true }]}>
                <Select>
                  <Option value="Mới">Mới</Option>
                  <Option value="Đang xử lý">Đang xử lý</Option>
                  <Option value="Đã giải quyết">Đã giải quyết</Option>
                  <Option value="Đóng">Đóng</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="assigned_to" label="Người xử lý" initialValue={currentUser.id || 1} rules={[{ required: true }]}>
            <Select 
              showSearch
              placeholder="Gõ tên để tìm kiếm nhân sự xử lý..." 
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={usersList.map(u => ({
                value: u.id,
                label: `👤 ${u.full_name} (${u.email})`
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Tạo Cơ Hội (Deals) */}
      <Modal
        title={`Thêm Cơ Hội Bán Hàng: ${customer360Data?.customer?.company_name}`}
        open={dealModalOpen}
        onCancel={() => setDealModalOpen(false)}
        onOk={() => dealForm.submit()}
      >
        <Form form={dealForm} layout="vertical" onFinish={handleCreateDeal}>
          <Form.Item name="title" label="Tên cơ hội / Tên dự án" rules={[{ required: true, message: 'Nhập tên cơ hội!' }]}>
            <Input placeholder="Ví dụ: Mua thêm bản quyền, gia hạn hợp đồng..." />
          </Form.Item>
          <Form.Item name="amount" label="Giá trị cơ hội (VNĐ)" rules={[{ required: true, message: 'Nhập giá trị tiền!' }]}>
            <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="stage" label="Giai đoạn Pipeline" initialValue="Đàm phán">
            <Select>
              <Option value="Khởi tạo">Khởi tạo</Option>
              <Option value="Đánh giá nhu cầu">Đánh giá nhu cầu</Option>
              <Option value="Báo giá">Báo giá</Option>
              <Option value="Đàm phán">Đàm phán</Option>
              <Option value="Thành công">Thành công (Ký hợp đồng)</Option>
              <Option value="Thất bại">Thất bại</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Nhập Excel */}
      <Modal
        title="Nhập Danh Sách Khách Hàng Từ Excel"
        open={importExcelOpen}
        onCancel={() => { setImportExcelOpen(false); setExcelPreviewData([]); }}
        width={800}
        footer={[
          <Button key="back" onClick={() => setImportExcelOpen(false)}>Đóng</Button>,
          excelPreviewData.length > 0 && (
            <Button key="save" type="primary" onClick={handleConfirmImport}>
              Xác Nhận Nạp {excelPreviewData.length} Dòng Dữ Liệu
            </Button>
          )
        ]}
      >
        {/* Task N1-230: Khu vực Kéo thả Upload Excel & Client Validation */}
        <ExcelDraggerUpload
          onFileSelect={handleFileUpload}
          onFileRemove={() => setExcelPreviewData([])}
        />

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button type="link" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Tải về tệp mẫu Excel chuẩn (.xls)
          </Button>
          {excelPreviewData.length > 0 && (
            <Checkbox checked={updateDuplicates} onChange={(e) => setUpdateDuplicates(e.target.checked)}>
              Tự động cập nhật nếu trùng Mã số thuế
            </Checkbox>
          )}
        </div>

        {excelPreviewData.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Divider>Xem trước dữ liệu kiểm tra</Divider>
            <Table 
              size="small"
              dataSource={excelPreviewData}
              rowKey="key"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Tên Doanh Nghiệp', dataIndex: 'company_name' },
                { title: 'Mã Số Thuế', dataIndex: 'tax_code' },
                { title: 'Ngành Nghề', dataIndex: 'industry' },
                { 
                  title: 'Trạng Thái Kiểm Tra', 
                  dataIndex: 'is_duplicate',
                  render: (dup) => (
                    <Tag color={dup ? 'red' : 'green'}>
                      {dup ? <WarningOutlined /> : <CheckCircleOutlined />} {dup ? 'Trùng MST' : 'Hợp lệ'}
                    </Tag>
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Modal Gộp Trùng */}
      <Modal
        title={<span><BranchesOutlined /> So Sánh & Gộp Khách Hàng Trùng</span>}
        open={mergeModalOpen}
        onCancel={() => setMergeModalOpen(false)}
        width={850}
        footer={[
          <Button key="back" onClick={() => setMergeModalOpen(false)}>Hủy</Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger 
            disabled={!masterCust || !dupCust || masterCust.id === dupCust.id} 
            onClick={handleConfirmMerge}
          >
            Xác Nhận Gộp Bản Ghi
          </Button>
        ]}
      >
        <p style={{ color: '#6b7280' }}>
          Dữ liệu người liên hệ, yêu cầu hỗ trợ và cơ hội bán hàng từ bản ghi trùng sẽ tự động chuyển sang bản ghi chính trước khi xóa.
        </p>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <label><b>Bản ghi chính (Giữ lại):</b></label>
            <Select 
              placeholder="Chọn bản ghi chính..." 
              style={{ width: '100%', marginTop: 6 }}
              value={masterCust?.id}
              onChange={(id) => setMasterCust(customers.find(c => c.id === id))}
            >
              {customers.map(c => (
                <Option key={c.id} value={c.id}>{c.company_name} (MST: {c.tax_code})</Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <label><b>Bản ghi trùng (Gộp vào & Xóa):</b></label>
            <Select 
              placeholder="Chọn bản ghi trùng..." 
              style={{ width: '100%', marginTop: 6 }}
              value={dupCust?.id}
              onChange={(id) => setDupCust(customers.find(c => c.id === id))}
            >
              {customers.filter(c => c.id !== masterCust?.id).map(c => (
                <Option key={c.id} value={c.id}>{c.company_name} (MST: {c.tax_code})</Option>
              ))}
            </Select>
          </Col>
        </Row>

        {masterCust && dupCust && (
          <Card size="small" title="So Sánh Chi Tiết">
            <Row gutter={16}>
              <Col span={12} style={{ borderRight: '1px solid #f0f0f0' }}>
                <h4 style={{ color: '#1890ff' }}>Bản Ghi Giữ Lại: {masterCust.company_name}</h4>
                <p><b>Mã số thuế:</b> {masterCust.tax_code || '---'}</p>
                <p><b>Website:</b> {masterCust.website || '---'}</p>
                <p><b>Ngành nghề:</b> {masterCust.industry}</p>
                <p><b>Giá trị hợp đồng:</b> {Number(masterCust.total_contract_value || 0).toLocaleString()} VNĐ</p>
              </Col>
              <Col span={12}>
                <h4 style={{ color: '#ff4d4f' }}>Bản Ghi Bị Gộp: {dupCust.company_name}</h4>
                <p><b>Mã số thuế:</b> {dupCust.tax_code || '---'}</p>
                <p><b>Website:</b> {dupCust.website || '---'}</p>
                <p><b>Ngành nghề:</b> {dupCust.industry}</p>
                <p><b>Giá trị hợp đồng:</b> {Number(dupCust.total_contract_value || 0).toLocaleString()} VNĐ</p>
              </Col>
            </Row>
          </Card>
        )}
      </Modal>

    </div>
  );
}