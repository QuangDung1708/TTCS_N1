import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, Button, Space, Tag, Modal, Form, Input, Select, Drawer, 
  Tabs, Card, Row, Col, Statistic, Tooltip, Popconfirm, Badge, 
  Switch, Alert, Divider, Typography, message, Upload, Timeline, InputNumber
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, 
  MergeCellsOutlined, UserOutlined, PhoneOutlined, MailOutlined, 
  BankOutlined, StarFilled, ReloadOutlined, SwapOutlined, 
  UploadOutlined, CustomerServiceOutlined, ClockCircleOutlined,
  CheckCircleOutlined, SaveOutlined, GlobalOutlined, TeamOutlined, StarOutlined, HistoryOutlined, ArrowRightOutlined,
   DollarOutlined, FileTextOutlined, WarningOutlined, DownloadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

export default function CustomerManagement() {
  // 1. PHÂN QUYỀN RBAC (USER ROLES)
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const userRole = currentUser.role_code || 'Sales';
  const isManagerOrAdmin = ['Admin', 'Director', 'Team_Lead'].includes(userRole);
  const isSalesOnly = userRole === 'Sales';

  // 2. STATE CHÍNH
  const [activeMainTab, setActiveMainTab] = useState('list'); // 'list' (S3-01..07) | 'care' (S3-09)
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // BỘ LỌC ĐA ĐIỀU KIỆN & LƯU BỘ LỌC (S3-07)
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterIndustry, setFilterIndustry] = useState(null);
  const [filterCompanySize, setFilterCompanySize] = useState(null);

  // S3-01 & S3-05: Modal Thêm / Sửa khách hàng (kèm công ty mẹ)
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm] = Form.useForm();

  // S3-03 & S3-05: Drawer 360° Profile
  const [view360Open, setView360Open] = useState(false);
  const [view360Data, setView360Data] = useState(null);
  const [loading360, setLoading360] = useState(false);

  // S3-02: Modal Người liên hệ đa vai trò
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [activeCustomerForContacts, setActiveCustomerForContacts] = useState(null);
  const [contactsList, setContactsList] = useState([]);
  const [contactForm] = Form.useForm();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedContactForTransfer, setSelectedContactForTransfer] = useState(null);
  const [transferForm] = Form.useForm();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [contactHistoryList, setContactHistoryList] = useState([]);
  const [selectedContactForHistory, setSelectedContactForHistory] = useState(null);

  // S3-04: Modal Gộp trùng
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState([]);

  // S3-06: Modal Import Excel/CSV
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);

  // S3-08: Modal Tạo Ticket CSKH & Gắn cờ rủi ro
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketForm] = Form.useForm();
  const [activeCustomerForTicket, setActiveCustomerForTicket] = useState(null);

  // S3-09: Khách hàng cần chăm sóc định kỳ
  const [periodicDays, setPeriodicDays] = useState(14);
  const [periodicList, setPeriodicList] = useState([]);
  const [periodicLoading, setPeriodicLoading] = useState(false);

  // ==================== TẢI DỮ LIỆU ====================

  const [dealForm] = Form.useForm();
  const [activityForm] = Form.useForm();

  const handleAddDealToCustomer = async (values) => {
    try {
      await axios.post(`http://localhost:5001/api/customers/${view360Data.customer.id}/deals`, values);
      message.success('Đã thêm cơ hội kinh doanh mới!');
      dealForm.resetFields();
      handleOpen360View(view360Data.customer.id);
    } catch {
      message.error('Lỗi khi thêm cơ hội!');
    }
  };

  const handleAddActivity = async (values) => {
    try {
      await axios.post(`http://localhost:5001/api/customers/${view360Data.customer.id}/activities`, values);
      message.success('Đã ghi nhận tương tác!');
      activityForm.resetFields();
      handleOpen360View(view360Data.customer.id);
    } catch {
      message.error('Lỗi ghi hoạt động!');
    }
  };

  const handleOpenHistoryModal = async (record) => {
  setSelectedContactForHistory(record);
  try {
    const res = await axios.get(`http://localhost:5001/api/customers/contacts/${record.id}/history`);
    setContactHistoryList(Array.isArray(res.data) ? res.data : []);
    setHistoryModalOpen(true);
  } catch {
    message.error('Lỗi khi lấy lịch sử luân chuyển!');
  }
};

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterKeyword) params.keyword = filterKeyword;
      if (filterStatus) params.status = filterStatus;
      if (filterIndustry) params.industry = filterIndustry;
      if (filterCompanySize) params.company_size = filterCompanySize;
      if (isSalesOnly && currentUser.id) params.owner_id = currentUser.id;

      const res = await axios.get('http://localhost:5001/api/customers', { params });
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error('Không thể tải danh sách khách hàng!');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/users');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || []);
      setUsersList(Array.isArray(list) ? list : []);
    } catch {
      setUsersList([]);
    }
  };

  const fetchPeriodicCare = async () => {
    setPeriodicLoading(true);
    try {
      const res = await axios.get(`http://localhost:5001/api/customers/care/periodic?days=${periodicDays}`);
      setPeriodicList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Không thể tải danh sách chăm sóc định kỳ!');
    } finally {
      setPeriodicLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, [filterStatus, filterIndustry, filterCompanySize]);

  useEffect(() => {
    if (activeMainTab === 'care') fetchPeriodicCare();
  }, [activeMainTab, periodicDays]);

  // Lưu và áp dụng bộ lọc (S3-07)
  const handleSaveFilter = () => {
    const filterPreset = { filterStatus, filterIndustry, filterCompanySize };
    localStorage.setItem('saved_customer_filter', JSON.stringify(filterPreset));
    message.success('Đã lưu bộ lọc cá nhân!');
  };

  const handleApplySavedFilter = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('saved_customer_filter') || '{}');
      if (saved.filterStatus) setFilterStatus(saved.filterStatus);
      if (saved.filterIndustry) setFilterIndustry(saved.filterIndustry);
      if (saved.filterCompanySize) setFilterCompanySize(saved.filterCompanySize);
      message.success('Đã áp dụng bộ lọc đã lưu!');
    } catch {
      message.warning('Chưa có bộ lọc nào được lưu trước đó!');
    }
  };

  // ==================== XỬ LÝ KHÁCH HÀNG (S3-01 & S3-05) ====================
  const handleOpenCustomerModal = (record = null) => {
    setEditingCustomer(record);
    customerForm.resetFields();
    if (record) {
      customerForm.setFieldsValue(record);
    } else {
      customerForm.setFieldsValue({
        status: 'lead',
        company_size: '1-50',
        owner_id: currentUser.id || null
      });
    }
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (values) => {
    try {
      if (editingCustomer) {
        await axios.put(`http://localhost:5001/api/customers/${editingCustomer.id}`, values);
        message.success('Cập nhật khách hàng thành công!');
      } else {
        await axios.post('http://localhost:5001/api/customers', values);
        message.success('Thêm khách hàng thành công!');
      }
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi lưu khách hàng (kiểm tra MST duy nhất)!');
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/customers/${id}`);
      message.success('Đã xóa khách hàng!');
      fetchCustomers();
    } catch {
      message.error('Lỗi khi xóa!');
    }
  };

  // ==================== XỬ LÝ 360° VIEW (S3-03) ====================
  const handleOpen360View = async (id) => {
    setView360Open(true);
    setLoading360(true);
    try {
      const res = await axios.get(`http://localhost:5001/api/customers/${id}/360-view`);
      setView360Data(res.data);
    } catch {
      message.error('Lỗi nạp hồ sơ 360°!');
    } finally {
      setLoading360(false);
    }
  };

  // ==================== LIÊN HỆ ĐA VAI TRÒ (S3-02) ====================
  const handleOpenContacts = async (record) => {
    setActiveCustomerForContacts(record);
    try {
      const res = await axios.get(`http://localhost:5001/api/customers/${record.id}/contacts`);
      setContactsList(Array.isArray(res.data) ? res.data : []);
      setContactsModalOpen(true);
    } catch {
      message.error('Không thể lấy danh sách người liên hệ!');
    }
  };

  const handleSaveContact = async (values) => {
    try {
      await axios.post(`http://localhost:5001/api/customers/${activeCustomerForContacts.id}/contacts`, values);
      message.success('Đã thêm người liên hệ!');
      contactForm.resetFields();
      const res = await axios.get(`http://localhost:5001/api/customers/${activeCustomerForContacts.id}/contacts`);
      setContactsList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Lỗi lưu liên hệ!');
    }
  };

  // Đổi đầu mối chính tức thì
  const handleSetPrimaryContact = async (contactId) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/contacts/${contactId}/set-primary`);
      message.success('Đã đổi người này làm Đầu mối chính!');
      const res = await axios.get(`http://localhost:5001/api/customers/${activeCustomerForContacts.id}/contacts`);
      setContactsList(Array.isArray(res.data) ? res.data : []);
      fetchCustomers();
    } catch {
      message.error('Lỗi khi cập nhật đầu mối chính!');
    }
  };

  // Xóa người liên hệ khi nhập nhầm
  const handleDeleteContact = async (contactId) => {
    try {
      await axios.delete(`http://localhost:5001/api/customers/contacts/${contactId}`);
      message.success('Đã xóa người liên hệ!');
      const res = await axios.get(`http://localhost:5001/api/customers/${activeCustomerForContacts.id}/contacts`);
      setContactsList(Array.isArray(res.data) ? res.data : []);
      fetchCustomers();
    } catch {
      message.error('Lỗi khi xóa người liên hệ!');
    }
  };

  const handleTransferContact = async (values) => {
    try {
      await axios.put(`http://localhost:5001/api/customers/contacts/${selectedContactForTransfer.id}/transfer`, values);
      message.success('Đã chuyển công tác và lưu vết lịch sử!');
      setTransferModalOpen(false);
      transferForm.resetFields();
      const res = await axios.get(`http://localhost:5001/api/customers/${activeCustomerForContacts.id}/contacts`);
      setContactsList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Lỗi khi chuyển công tác!');
    }
  };

  // ==================== IMPORT EXCEL/CSV (S3-06) ====================
// 1. TẠO FILE MẪU EXCEL CHUẨN BẢNG NHƯ ẢNH 2 (HEADER XANH, CHỮ TRẮNG, KẺ KHUNG, FONT CHUẨN UTF-8)
  const handleDownloadTemplate = () => {
    const sampleRows = [
      ["Tập đoàn Công nghệ FPT", "0101248141", "Công nghệ thông tin", "200+", "https://fpt.com.vn", "Số 10 Phạm Văn Bạch, Cầu Giấy, Hà Nội"],
      ["Công ty Cổ phần Sữa Việt Nam", "0300588569", "Sản xuất - Tiêu dùng", "200+", "https://vinamilk.com.vn", "10 Tân Trào, Tân Phú, Quận 7, TP.HCM"],
      ["Tập đoàn Hòa Phát", "0900189284", "Sản xuất thép - Công nghiệp", "200+", "https://hoaphat.com.vn", "39 Nguyễn Đình Chiểu, Hai Bà Trưng, Hà Nội"],
      ["Công ty Cổ phần VNG", "0303541480", "Internet & Game", "51-200", "https://vng.com.vn", "Z06 Đường số 13, Tân Thuận Đông, Quận 7, TP.HCM"],
      ["Công ty TNHH Ánh Dương", "0109988776", "Công nghệ thông tin", "1-50", "https://anhduong.vn", "Tòa nhà Keangnam, Nam Từ Liêm, Hà Nội"]
    ];

    // Cấu trúc XML/HTML Excel chuẩn: định nghĩa màu xanh #0070c0, chữ trắng, kẻ viền và mso-number-format
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>DanhSachKhachHang</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          .table-header {
            background-color: #0070c0;
            color: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
            height: 34px;
            border: 0.5pt solid #004c82;
          }
          .table-cell {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            vertical-align: middle;
            height: 25px;
            border: 0.5pt solid #d4d4d4;
            padding: 4px 8px;
            mso-number-format: "\\@"; /* Ép kiểu Text: Giữ nguyên số 0 đầu, không bao giờ bị 1,01E+08 */
          }
        </style>
      </head>
      <body>
        <table border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th class="table-header" style="width: 260px;">Tên công ty</th>
              <th class="table-header" style="width: 140px;">Mã số thuế</th>
              <th class="table-header" style="width: 200px;">Ngành nghề</th>
              <th class="table-header" style="width: 110px;">Quy mô</th>
              <th class="table-header" style="width: 200px;">Website</th>
              <th class="table-header" style="width: 320px;">Địa chỉ</th>
            </tr>
          </thead>
          <tbody>
            ${sampleRows.map(r => `
              <tr>
                <td class="table-cell" style="text-align: left;">${r[0]}</td>
                <td class="table-cell" style="text-align: center;">${r[1]}</td>
                <td class="table-cell" style="text-align: left;">${r[2]}</td>
                <td class="table-cell" style="text-align: center;">${r[3]}</td>
                <td class="table-cell" style="text-align: left;">${r[4]}</td>
                <td class="table-cell" style="text-align: left;">${r[5]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mau_Nhap_Khach_Hang_CRM.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success("Đã tải tệp mẫu Excel có định dạng bảng và font chuẩn!");
  };

  // 2. ĐỌC DỮ LIỆU ĐA NĂNG (ĐỌC ĐƯỢC CẢ FILE .XLS BẢNG ĐỊNH DẠNG VÀ FILE .CSV)
  const handleFileChange = (info) => {
    const file = info.file.originFileObj || info.file;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target.result;
      if (!text) return;

      const parsed = [];

      // A. Nếu người dùng tải lên file Excel bảng tính (.xls có thẻ table)
      if (text.includes('<table') || text.includes('<html')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('table tr');

        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length > 0) {
            const name = cells[0]?.textContent?.trim() || '';
            if (!name) continue;

            const rawTax = cells[1]?.textContent?.replace(/[^0-9A-Za-z-]/g, '').trim() || '';
            const isDup = rawTax !== '' && customers.some(c => c.tax_code && c.tax_code.trim() === rawTax);

            parsed.push({
              key: i,
              name: name,
              tax_code: rawTax,
              industry: cells[2]?.textContent?.trim() || 'Chưa phân loại',
              company_size: cells[3]?.textContent?.trim() || '1-50',
              website: cells[4]?.textContent?.trim() || '',
              address: cells[5]?.textContent?.trim() || '',
              isDuplicate: isDup
            });
          }
        }
      } else {
        // B. Nếu người dùng lưu và tải lên file .csv
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        let startIndex = 0;
        if (rawLines[0].toLowerCase().startsWith("sep=")) startIndex = 1;
        const headerLine = rawLines[startIndex] || "";
        const dataStartIndex = startIndex + 1;
        const delimiter = headerLine.includes(";") ? ";" : ",";

        const parseCSVLine = (line) => {
          const row = [];
          let cur = '';
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
              else { inQuote = !inQuote; }
            } else if (char === delimiter && !inQuote) {
              row.push(cur.trim()); cur = '';
            } else { cur += char; }
          }
          row.push(cur.trim());
          return row;
        };

        for (let i = dataStartIndex; i < rawLines.length; i++) {
          const parts = parseCSVLine(rawLines[i]);
          if (parts[0] && parts[0].trim() !== '') {
            const rawTax = parts[1] ? parts[1].replace(/[^0-9A-Za-z-]/g, '').trim() : '';
            const isDup = rawTax !== '' && customers.some(c => c.tax_code && c.tax_code.trim() === rawTax);
            parsed.push({
              key: i,
              name: parts[0]?.trim(),
              tax_code: rawTax,
              industry: parts[2]?.trim() || 'Chưa phân loại',
              company_size: parts[3]?.trim() || '1-50',
              website: parts[4]?.trim() || '',
              address: parts[5]?.trim() || '',
              isDuplicate: isDup
            });
          }
        }
      }

      setImportPreviewData(parsed);
      message.info(`Đã đọc thành công ${parsed.length} dòng dữ liệu.`);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleExecuteImport = async () => {
    const recordsToImport = importPreviewData.filter(d => !d.isDuplicate);
    if (recordsToImport.length === 0) {
      return message.warning('Không có bản ghi hợp lệ nào để nhập!');
    }
    try {
      const res = await axios.post('http://localhost:5001/api/customers/import/bulk', { records: recordsToImport });
      message.success(res.data.message);
      setImportModalOpen(false);
      setImportPreviewData([]);
      fetchCustomers();
    } catch {
      message.error('Lỗi khi nạp dữ liệu hàng loạt!');
    }
  };

  // ==================== CSKH: TICKET & CỜ RỦI RO (S3-08) ====================
  const handleOpenTicketModal = (record) => {
    setActiveCustomerForTicket(record);
    ticketForm.resetFields();
    setTicketModalOpen(true);
  };

  const handleSaveTicket = async (values) => {
    try {
      await axios.post(`http://localhost:5001/api/customers/${activeCustomerForTicket.id}/tickets`, values);
      message.success('Đã ghi nhận yêu cầu hỗ trợ! Cờ rủi ro được cập nhật tự động.');
      setTicketModalOpen(false);
      fetchCustomers();
    } catch {
      message.error('Lỗi ghi nhận ticket!');
    }
  };

  // ==================== CHĂM SÓC ĐỊNH KỲ N NGÀY (S3-09) ====================
  const handleMarkContacted = async (customerId) => {
    try {
      await axios.post(`http://localhost:5001/api/customers/care/mark-contacted/${customerId}`);
      message.success('Đã cập nhật: Đã liên hệ khách hàng thành công!');
      fetchPeriodicCare();
    } catch {
      message.error('Lỗi cập nhật!');
    }
  };

  // ==================== CỘT BẢNG KHÁCH HÀNG (S3-01) ====================
  const columns = [
    {
      title: 'Khách Hàng Doanh Nghiệp',
      dataIndex: 'name',
      render: (name, record) => (
        <Space direction="vertical" size={2}>
          <a onClick={() => handleOpen360View(record.id)} style={{ fontWeight: 600, fontSize: 14 }}>
            {name}
          </a>
          <Space size="small">
            {record.tax_code && <Tag color="geekblue" style={{ fontSize: 11 }}>MST: {record.tax_code}</Tag>}
            {record.parent_name && <Tag color="purple" style={{ fontSize: 11 }}>Con của: {record.parent_name}</Tag>}
          </Space>
        </Space>
      )
    },
    {
      title: 'Ngành / Quy Mô',
      render: (_, record) => (
        <div>
          <Text strong>{record.industry || 'Chưa phân loại'}</Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.company_size || '---'} nhân sự</div>
        </div>
      )
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      render: (st) => {
        const map = { lead: { color: 'blue', t: 'Tiềm năng' }, in_deal: { color: 'orange', t: 'Đang giao dịch' }, customer: { color: 'green', t: 'Khách hàng' }, churned: { color: 'default', t: 'Ngừng hợp tác' } };
        const conf = map[st] || map.lead;
        return <Tag color={conf.color}>{conf.t}</Tag>;
      }
    },
    {
      title: 'Cờ Rủi Ro',
      dataIndex: 'risk_level',
      align: 'center',
      render: (risk) => {
        if (risk === 'danger') return <Badge status="error" text={<Text type="danger" strong>Nguy cấp</Text>} />;
        if (risk === 'warning') return <Badge status="warning" text={<Text type="warning">Cần CSKH</Text>} />;
        return <Badge status="success" text="Bình thường" />;
      }
    },
    {
      title: 'Người Phụ Trách',
      dataIndex: 'owner_name',
      render: (owner) => owner ? <Tag icon={<UserOutlined />}>{owner}</Tag> : <Text type="secondary">Chưa giao</Text>
    },
    {
      title: 'Hành Động',
      align: 'center',
      width: 190,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Hồ sơ 360° "><Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handleOpen360View(record.id)} /></Tooltip>
          <Tooltip title="Người liên hệ "><Button size="small" icon={<TeamOutlined />} onClick={() => handleOpenContacts(record)} /></Tooltip>
          <Tooltip title="Ghi nhận CSKH "><Button size="small" icon={<CustomerServiceOutlined />} onClick={() => handleOpenTicketModal(record)} /></Tooltip>
          <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => handleOpenCustomerModal(record)} /></Tooltip>
          {isManagerOrAdmin && (
            <Popconfirm title="Xóa khách hàng?" onConfirm={() => handleDeleteCustomer(record.id)}>
              <Button danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* THANH ĐIỀU HƯỚNG TAB LỚN: TÁCH RIÊNG DANH SÁCH & CHĂM SÓC ĐỊNH KỲ (S3-09) */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              Quản Lý Khách Hàng Doanh Nghiệp
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isSalesOnly ? 'Chế độ cá nhân: Hiển thị các khách hàng thuộc quyền sở hữu của bạn' : 'Chế độ quản lý: Toàn quyền tra cứu và xử lý toàn công ty'}
            </Text>
          </Col>
          <Col xs={24} md={14} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                Nhập Excel
              </Button>
              {isManagerOrAdmin && (
                <Button 
                  icon={<MergeCellsOutlined />} 
                  onClick={async () => {
                    const res = await axios.get('http://localhost:5001/api/customers/duplicates/detect');
                    setDuplicatePairs(Array.isArray(res.data) ? res.data : []);
                    setDuplicateModalOpen(true);
                  }}
                  style={{ borderColor: '#faad14', color: '#d48806' }}
                >
                  Gộp Trùng
                </Button>
              )}
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCustomerModal()}>
                Thêm Khách Hàng
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={activeMainTab}
          onChange={setActiveMainTab}
          items={[
            {
              key: 'list',
              label: <span style={{ fontWeight: 600 }}> Danh Sách Khách Hàng Doanh Nghiệp ({customers.length})</span>,
              children: (
                <>
                  {/* THANH BỘ LỌC ĐA TIÊU CHÍ (S3-07) */}
                  <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={8} md={6}>
                      <Input.Search 
                        placeholder="Tìm tên, MST, website..." 
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.target.value)}
                        onSearch={fetchCustomers}
                        allowClear 
                      />
                    </Col>
                    <Col xs={12} sm={5} md={4}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Trạng thái"
                        allowClear
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                          { value: 'lead', label: 'Tiềm năng' },
                          { value: 'in_deal', label: 'Đang giao dịch' },
                          { value: 'customer', label: 'Khách hàng' },
                          { value: 'churned', label: 'Ngừng hợp tác' }
                        ]}
                      />
                    </Col>
                    <Col xs={12} sm={5} md={4}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Ngành nghề"
                        allowClear
                        value={filterIndustry}
                        onChange={setFilterIndustry}
                        options={[
                          { value: 'Công nghệ thông tin', label: 'Công nghệ thông tin' },
                          { value: 'Sản xuất - Tiêu dùng', label: 'Sản xuất - Tiêu dùng' },
                          { value: 'Sản xuất thép - Công nghiệp', label: 'Sản xuất thép' },
                          { value: 'Internet & Game', label: 'Internet & Game' }
                        ]}
                      />
                    </Col>
                    <Col xs={12} sm={4} md={4}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Quy mô"
                        allowClear
                        value={filterCompanySize}
                        onChange={setFilterCompanySize}
                        options={[
                          { value: '1-50', label: '1 - 50 người' },
                          { value: '51-200', label: '51 - 200 người' },
                          { value: '200+', label: 'Trên 200 người' }
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={fetchCustomers} loading={loading}>Lọc</Button>
                        <Tooltip title="Lưu bộ lọc hiện tại để dùng lần sau ">
                          <Button icon={<SaveOutlined />} onClick={handleSaveFilter}>Lưu Lọc</Button>
                        </Tooltip>
                        <Button onClick={handleApplySavedFilter}>Áp Dụng Lọc Đã Lưu</Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={customers}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                  />
                </>
              )
            },
            {
              key: 'care',
              label: (
                <span style={{ fontWeight: 600, color: '#fa8c16' }}>
                  <ClockCircleOutlined /> Khách Cần Chăm Sóc Định Kỳ({periodicList.length})
                </span>
              ),
              children: (
                <div>
                  <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
                    <Col>
                      <Space>
                        <Text strong>Khách hàng không có tương tác trong:</Text>
                        <Select
                          value={periodicDays}
                          onChange={setPeriodicDays}
                          style={{ width: 140 }}
                          options={[
                            { value: 7, label: '7 ngày qua' },
                            { value: 14, label: '14 ngày qua' },
                            { value: 30, label: '30 ngày qua' },
                            { value: 60, label: '60 ngày qua' }
                          ]}
                        />
                      </Space>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={fetchPeriodicCare} loading={periodicLoading}>Làm mới</Button>
                    </Col>
                  </Row>

                  <Table
                    rowKey="id"
                    loading={periodicLoading}
                    dataSource={periodicList}
                    columns={[
                      {
                        title: 'Tên Khách Hàng',
                        dataIndex: 'name',
                        render: (t) => <b>{t}</b>
                      },
                      {
                        title: 'Người Phụ Trách',
                        dataIndex: 'owner_name',
                        render: (u) => u || 'Chưa giao'
                      },
                      {
                        title: 'Số Ngày Chưa Tương Tác',
                        dataIndex: 'days_inactive',
                        render: (days) => <Tag color="error">{days} ngày bỏ quên</Tag>
                      },
                      {
                        title: 'Hành Động Chăm Sóc',
                        align: 'center',
                        width: 160,
                        render: (_, record) => (
                          <Popconfirm
                            title="Xác nhận chăm sóc khách hàng"
                            description={`Bạn đã liên hệ chăm sóc cho ${record.name}?`}
                            onConfirm={() => handleMarkContacted(record.id)}
                            okText="Đã liên hệ"
                            cancelText="Chưa"
                          >
                            <Button 
                              type="primary" 
                              size="small" 
                              icon={<CheckCircleOutlined />} 
                              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            >
                              Đã liên hệ
                            </Button>
                          </Popconfirm>
                        )
                      }
                    ]}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* ==================== MODAL THÊM / SỬA KHÁCH HÀNG (S3-01 & S3-05) ==================== */}
      <Modal
        title={editingCustomer ? 'Chỉnh Sửa Khách Hàng' : 'Khai Báo Khách Hàng Doanh Nghiệp'}
        open={customerModalOpen}
        onCancel={() => setCustomerModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={680}
      >
        <Form form={customerForm} layout="vertical" onFinish={handleSaveCustomer} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item label="Tên công ty doanh nghiệp" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên công ty!' }]}>
                <Input placeholder="Ví dụ: Công ty Cổ phần MISA..." />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Mã số thuế (Duy nhất)" name="tax_code">
                <Input placeholder="Ví dụ: 0101248141" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Ngành nghề hoạt động" name="industry">
                <Input placeholder="CNTT, Bán lẻ..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Quy mô nhân sự" name="company_size">
                <Select
                  options={[
                    { value: '1-50', label: '1 - 50 nhân sự' },
                    { value: '51-200', label: '51 - 200 nhân sự' },
                    { value: '200+', label: 'Trên 200 nhân sự' }
                  ]}
                />
              </Form.Item>
            </Col>
            {/* THÊM TRƯỜNG WEBSITE (TÙY CHỌN - KHÔNG RÀNG BUỘC THEO AC S3-01) */}
            <Col span={8}>
              <Form.Item label="Website (Tùy chọn)" name="website">
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Công ty mẹ" name="parent_id">
                <Select
                  allowClear
                  placeholder="Chọn công ty mẹ (nếu là cty con)"
                  options={customers
                    .filter(c => !editingCustomer || c.id !== editingCustomer.id)
                    .map(c => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Người phụ trách (Owner)" name="owner_id">
                <Select
                  allowClear
                  placeholder="Chọn nhân viên phụ trách"
                  options={(Array.isArray(usersList) ? usersList : []).map(u => ({
                    value: u.id,
                    label: `${u.full_name || u.name || u.username} (${u.role_code || 'User'})`
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Địa chỉ trụ sở" name="address">
            <Input.TextArea rows={2} placeholder="Số nhà, đường phố, tỉnh thành..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Trạng thái khách hàng" name="status">
                <Select
                  options={[
                    { value: 'lead', label: 'Tiềm năng' },
                    { value: 'in_deal', label: 'Đang giao dịch' },
                    { value: 'customer', label: 'Khách hàng' },
                    { value: 'churned', label: 'Ngừng hợp tác' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cờ rủi ro rời bỏ (S3-08)" name="risk_level">
                <Select
                  options={[
                    { value: 'normal', label: 'Bình thường' },
                    { value: 'warning', label: 'Cần chăm sóc (Warning)' },
                    { value: 'danger', label: 'Nguy cấp (Danger)' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setCustomerModalOpen(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit">Lưu Hồ Sơ</Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== DRAWER 360° PROFILE (S3-03 & S3-05) ==================== */}
      {/* ==================== DRAWER 360° PROFILE ĐỘNG 100% (S3-03 & S3-05) ==================== */}
      <Drawer
        title={
          <Space>
            <BankOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <span style={{ fontWeight: 700 }}>Hồ Sơ Toàn Cảnh 360°: {view360Data?.customer?.name}</span>
            {view360Data?.customer?.tax_code && (
              <Tag color="geekblue">MST: {view360Data.customer.tax_code}</Tag>
            )}
          </Space>
        }
        width={920}
        open={view360Open}
        onClose={() => setView360Open(false)}
        loading={loading360}
      >
        {view360Data && (
          <div>
            {/* THẺ CHỈ SỐ KPI TÀI CHÍNH ĐỘNG (AC S3-03 & S3-05) */}
                <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" styles={{ body: { backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 } }}>
                  <Statistic
                    title={<span style={{ color: '#389e0d', fontWeight: 600 }}>Tổng Đã Ký (Won)</span>}
                    value={Number(view360Data.summary?.totalWon || 0).toLocaleString('vi-VN')}
                    suffix="VNĐ"
                    valueStyle={{ color: '#389e0d', fontWeight: 700, fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" styles={{ body: { backgroundColor: '#e6f4ff', border: '1px solid #91caff', borderRadius: 8 } }}>
                  <Statistic
                    title={<span style={{ color: '#0958d9', fontWeight: 600 }}>Cơ Hội Đang Mở</span>}
                    value={Number(view360Data.summary?.totalOpen || 0).toLocaleString('vi-VN')}
                    suffix="VNĐ"
                    valueStyle={{ color: '#0958d9', fontWeight: 700, fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" styles={{ body: { backgroundColor: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 8 } }}>
                  <Statistic
                    title={<span style={{ color: '#531dab', fontWeight: 600 }}>Doanh Thu Tập Đoàn</span>}
                    value={Number(view360Data.summary?.groupWon || 0).toLocaleString('vi-VN')}
                    suffix="VNĐ"
                    valueStyle={{ color: '#531dab', fontWeight: 700, fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* THÔNG TIN DOANH NGHIỆP TỔNG QUAN */}
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div><b>Địa chỉ:</b> {view360Data.customer?.address || 'Chưa cập nhật'}</div>
                  <div><b>Website:</b> {view360Data.customer?.website ? <a href={view360Data.customer.website} target="_blank" rel="noreferrer">{view360Data.customer.website}</a> : 'Chưa có'}</div>
                </Col>
                <Col span={12}>
                  <div><b>Người phụ trách:</b> {view360Data.customer?.owner_name || 'Chưa phân bổ'}</div>
                  <div><b>Công ty mẹ:</b> {view360Data.customer?.parent_company_name ? <Tag color="purple">{view360Data.customer.parent_company_name}</Tag> : 'Độc lập'}</div>
                </Col>
              </Row>
            </Card>

            {/* TABS ĐẦY ĐỦ CHO AC S3-03 */}
            <Tabs
              defaultActiveKey="deals"
              items={[
                {
                  key: 'deals',
                  label: <span style={{ fontWeight: 600 }}> Cơ Hội Bán Hàng ({view360Data.deals?.length || 0})</span>,
                  children: (
                    <div>
                      {/* FORM THÊM CƠ HỘI BÁN HÀNG CÓ FORMATTER DẤU CHẤM HÀNG NGHÌN */}
                      <Card size="small" title="Thêm Cơ Hội Bán Hàng Trực Tiếp" style={{ marginBottom: 12 }}>
                        <Form form={dealForm} layout="inline" onFinish={handleAddDealToCustomer}>
                          <Form.Item name="title" rules={[{ required: true, message: 'Nhập tên deal' }]}>
                            <Input placeholder="Tên cơ hội..." style={{ width: 200 }} />
                          </Form.Item>
                          <Form.Item name="value" rules={[{ required: true, message: 'Nhập giá trị' }]}>
                            <InputNumber
                              placeholder="Giá trị (VNĐ)..."
                              style={{ width: 180 }}
                              min={0}
                              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              parser={(val) => val.replace(/\./g, '')}
                            />
                          </Form.Item>
                          <Form.Item name="stage" initialValue="Won">
                            <Select style={{ width: 150 }} options={[
                              { value: 'Khảo sát nhu cầu', label: 'Khảo sát nhu cầu' },
                              { value: 'Đề xuất giải pháp', label: 'Đề xuất giải pháp' },
                              { value: 'Đàm phán', label: 'Đàm phán' },
                              { value: 'Won', label: 'Won (Đã Ký)' },
                              { value: 'Lost', label: 'Lost (Đóng Thua)' }
                            ]} />
                          </Form.Item>
                          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Thêm Deal</Button>
                        </Form>
                      </Card>

                      <Table
                        size="small"
                        rowKey="id"
                        dataSource={view360Data.deals}
                        pagination={false}
                        columns={[
                          { title: 'Tên cơ hội', dataIndex: 'title', render: t => <b>{t}</b> },
                          { 
                            title: 'Giá trị (VNĐ)', 
                            dataIndex: 'value', 
                            render: v => <span style={{ color: '#0958d9', fontWeight: 600 }}>{Number(v || 0).toLocaleString()} VNĐ</span> 
                          },
                          { 
                            title: 'Giai đoạn', 
                            dataIndex: 'stage',
                            render: s => {
                              const color = (s === 'Won' || s === 'Đóng Thắng') ? 'green' : ((s === 'Lost' || s === 'Đóng Thua') ? 'red' : 'blue');
                              return <Tag color={color}>{s}</Tag>;
                            }
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: 'contacts',
                  label: ` Người Liên Hệ (${view360Data.contacts?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={view360Data.contacts}
                      columns={[
                        {
                          title: 'Họ tên',
                          dataIndex: 'name',
                          render: (t, r) => (
                            <Space>
                              {r.is_primary ? <StarFilled style={{ color: '#faad14' }} /> : null}
                              <b>{t}</b>
                            </Space>
                          )
                        },
                        { title: 'Chức danh', dataIndex: 'title' },
                        {
                          title: 'Vai trò mua',
                          dataIndex: 'buying_role',
                          render: (r) => {
                            const map = { decision_maker: 'Người quyết định', influencer: 'Người ảnh hưởng', end_user: 'Người dùng cuối', blocker: 'Người cản trở' };
                            return <Tag color="purple">{map[r] || r}</Tag>;
                          }
                        },
                        { title: 'SĐT', dataIndex: 'phone' },
                        { title: 'Email', dataIndex: 'email' }
                      ]}
                    />
                  )
                },
                {
                  key: 'timeline',
                  label: ` Dòng Thời Gian (${view360Data.activities?.length || 0})`,
                  children: (
                    <div>
                      <Card size="small" style={{ marginBottom: 12 }}>
                        <Form form={activityForm} layout="inline" onFinish={handleAddActivity}>
                          <Form.Item name="content" rules={[{ required: true, message: 'Nhập nội dung tương tác' }]} style={{ flex: 1 }}>
                            <Input placeholder="Ghi chú cuộc gọi, gặp mặt, trao đổi với khách..." />
                          </Form.Item>
                          <Button type="primary" htmlType="submit">Ghi Tương Tác</Button>
                        </Form>
                      </Card>
                      <Timeline
                        style={{ marginTop: 12 }}
                        items={(view360Data.activities || []).map(act => ({
                          color: act.type === 'call' ? 'green' : 'blue',
                          children: (
                            <div>
                              <Text strong>{act.content}</Text>
                              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{new Date(act.created_at).toLocaleString()}</div>
                            </div>
                          )
                        }))}
                      />
                    </div>
                  )
                },
                {
                  key: 'subsidiaries',
                  label: ` Công Ty Con (${view360Data.subsidiaries?.length || 0})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={view360Data.subsidiaries}
                      columns={[
                        { title: 'Tên công ty con', dataIndex: 'name', render: t => <b>{t}</b> },
                        { title: 'Mã số thuế', dataIndex: 'tax_code', render: t => t || '---' },
                        { 
                          title: 'Trạng thái', 
                          dataIndex: 'status', 
                          render: (st) => {
                            const statusMap = {
                              lead: { text: 'Tiềm năng', color: 'blue' },
                              in_deal: { text: 'Đang giao dịch', color: 'orange' },
                              customer: { text: 'Khách hàng', color: 'green' },
                              churned: { text: 'Ngừng hợp tác', color: 'default' }
                            };
                            const conf = statusMap[st] || { text: 'Tiềm năng', color: 'blue' };
                            return <Tag color={conf.color}>{conf.text}</Tag>;
                          } 
                        }
                      ]}
                    />
                  )
                },
                {
                  key: 'tickets',
                  label: ` CSKH (${view360Data.tickets?.length || 0}) (S3-08)`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={view360Data.tickets}
                      columns={[
                        { title: 'Yêu cầu hỗ trợ', dataIndex: 'title', render: t => <b>{t}</b> },
                        { 
                          title: 'Mức độ ưu tiên', 
                          dataIndex: 'priority', 
                          render: (p) => {
                            const pMap = {
                              urgent: { text: 'Khẩn cấp', color: 'red' },
                              high: { text: 'Cao', color: 'orange' },
                              medium: { text: 'Trung bình', color: 'gold' },
                              low: { text: 'Thấp', color: 'green' }
                            };
                            const conf = pMap[p] || { text: p, color: 'default' };
                            return <Tag color={conf.color}>{conf.text}</Tag>;
                          } 
                        },
                        { 
                          title: 'Trạng thái xử lý', 
                          dataIndex: 'status', 
                          render: (s) => {
                            const sMap = {
                              open: { text: 'Chờ xử lý', color: 'blue' },
                              in_progress: { text: 'Đang xử lý', color: 'cyan' },
                              resolved: { text: 'Đã giải quyết', color: 'green' },
                              closed: { text: 'Đã đóng', color: 'default' }
                            };
                            const conf = sMap[s] || { text: s, color: 'default' };
                            return <Tag color={conf.color}>{conf.text}</Tag>;
                          } 
                        }
                      ]}
                    />
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* ==================== MODAL NGƯỜI LIÊN HỆ ĐA VAI TRÒ (S3-02) ==================== */}
      <Modal
        title={`Quản Lý Người Liên Hệ: ${activeCustomerForContacts?.name || ''}`}
        open={contactsModalOpen}
        onCancel={() => setContactsModalOpen(false)}
        footer={null}
        width={750}
        destroyOnHidden
      >
        <Card size="small" title="Thêm Người Liên Hệ Mới" style={{ marginBottom: 16 }}>
          <Form form={contactForm} layout="vertical" onFinish={handleSaveContact}>
            <Row gutter={12}>
              <Col span={8}><Form.Item label="Họ tên" name="name" rules={[{ required: true }]}><Input placeholder="Nguyễn Văn A" /></Form.Item></Col>
              <Col span={8}><Form.Item label="Chức danh" name="title"><Input placeholder="Giám đốc..." /></Form.Item></Col>
              <Col span={8}>
                <Form.Item label="Vai trò quyết định mua" name="buying_role" initialValue="influencer">
                  <Select options={[
                    { value: 'decision_maker', label: 'Người quyết định' },
                    { value: 'influencer', label: 'Người ảnh hưởng' },
                    { value: 'end_user', label: 'Người dùng cuối' },
                    { value: 'blocker', label: 'Người cản trở' }
                  ]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={8}><Form.Item label="Số điện thoại" name="phone"><Input placeholder="0912..." /></Form.Item></Col>
              <Col span={10}><Form.Item label="Email" name="email"><Input placeholder="email@..." /></Form.Item></Col>
              <Col span={6}><Form.Item label="Đầu mối chính" name="is_primary" valuePropName="checked"><Switch /></Form.Item></Col>
            </Row>
            <div style={{ textAlign: 'right' }}><Button type="primary" htmlType="submit">Lưu Liên Hệ</Button></div>
          </Form>
        </Card>

        <Table
          rowKey="id"
          size="small"
          dataSource={contactsList}
          pagination={false}
          columns={[
            {
              title: 'Đầu mối chính',
              align: 'center',
              width: 100,
              render: (_, record) => (
                record.is_primary ? (
                  <Tooltip title="Đang là Đầu mối chính">
                    <StarFilled style={{ color: '#faad14', fontSize: 18, cursor: 'default' }} />
                  </Tooltip>
                ) : (
                  <Tooltip title="Nhấp để đặt người này làm Đầu mối chính">
                    <StarOutlined 
                      style={{ color: '#bfbfbf', fontSize: 18, cursor: 'pointer' }} 
                      onClick={() => handleSetPrimaryContact(record.id)} 
                    />
                  </Tooltip>
                )
              )
            },
            { 
              title: 'Họ tên', 
              dataIndex: 'name', 
              render: (n, r) => (
                <div>
                  <b style={{ color: r.is_primary ? '#d48806' : '#262626' }}>{n}</b>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.title || 'Chưa có chức vụ'}</div>
                </div>
              )
            },
            {
              title: 'Vai trò mua (S3-02)',
              dataIndex: 'buying_role',
              render: (r) => {
                const map = { 
                  decision_maker: { text: 'Người quyết định', color: 'purple' }, 
                  influencer: { text: 'Người ảnh hưởng', color: 'blue' }, 
                  end_user: { text: 'Người dùng cuối', color: 'green' }, 
                  blocker: { text: 'Người cản trở', color: 'red' } 
                };
                const conf = map[r] || { text: r, color: 'default' };
                return <Tag color={conf.color}>{conf.text}</Tag>;
              }
            },
            { 
              title: 'SĐT / Email', 
              render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                  <div>{r.phone || '---'}</div>
                  <div style={{ color: '#8c8c8c' }}>{r.email || '---'}</div>
                </div>
              )
            },
            {
              title: 'Thao tác',
              align: 'center',
              width: 140,
              render: (_, record) => (
                <Space size="small">
                  <Tooltip title="Chuyển sang công ty khác">
                    <Button 
                      size="small" 
                      icon={<SwapOutlined />} 
                      onClick={() => { 
                        setSelectedContactForTransfer(record); 
                        setTransferModalOpen(true); 
                      }}
                    >
                      Chuyển Cty
                    </Button>
                  </Tooltip>
                  <Tooltip title="Xóa người liên hệ">
                    <Popconfirm 
                      title="Xóa người liên hệ này?" 
                      description="Hành động này không thể hoàn tác."
                      onConfirm={() => handleDeleteContact(record.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger type="text" size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                  <Tooltip title="Xem lịch sử luân chuyển công tác">
  <Button 
    size="small" 
    icon={<HistoryOutlined style={{ color: '#722ed1' }} />} 
    onClick={() => handleOpenHistoryModal(record)} 
  />
</Tooltip>  
                </Space>
              )
            }
          ]}
        />
      </Modal>

      {/* CHUYỂN CÔNG TY CHO LIÊN HỆ (S3-02) */}
      <Modal
        title={`Chuyển công ty cho: ${selectedContactForTransfer?.name || ''}`}
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferContact}>
          <Form.Item label="Chuyển sang khách hàng mới" name="new_customer_id" rules={[{ required: true }]}>
            <Select options={customers.filter(c => c.id !== activeCustomerForContacts?.id).map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item label="Ghi chú chuyển đổi (Lưu lịch sử)" name="note">
            <Input.TextArea rows={2} placeholder="Lý do chuyển công tác..." />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setTransferModalOpen(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit">Xác Nhận</Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL XEM LỊCH SỬ LUÂN CHUYỂN CÔNG TY (AC S3-02) */}
<Modal
zIndex={1100}
  title={
    <Space>
      <HistoryOutlined style={{ color: '#722ed1', fontSize: 18 }} />
      <span>Lịch Sử Luân Chuyển Công Tác: {selectedContactForHistory?.name}</span>
    </Space>
  }
  open={historyModalOpen}
  onCancel={() => setHistoryModalOpen(false)}
  footer={[
    <Button key="close" onClick={() => setHistoryModalOpen(false)}>Đóng</Button>
  ]}
  width={600}
>
  {contactHistoryList.length === 0 ? (
    <Alert 
      message="Người liên hệ này chưa từng chuyển đổi công ty." 
      type="info" 
      showIcon 
      style={{ marginTop: 12 }} 
    />
  ) : (
    <div style={{ marginTop: 16 }}>
      <Timeline
        items={contactHistoryList.map(h => ({
          color: 'purple',
          children: (
            <div>
             <Text strong>{h.old_company_name || 'Cty trước đây'}</Text>
<ArrowRightOutlined style={{ margin: '0 8px', color: '#8c8c8c' }} />
<Text strong style={{ color: '#1677ff' }}>{h.new_company_name || 'Cty mới'}</Text>
              <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                <b>Ghi chú:</b> {h.note || 'Không có ghi chú'}
              </div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                {new Date(h.changed_at).toLocaleString()}
              </div>
            </div>
          )
        }))}
      />
    </div>
  )}
</Modal>


      {/* ==================== IMPORT EXCEL (S3-06) ==================== */}
      <Modal
        title="Nhập Danh Sách Khách Hàng Từ Excel / CSV "
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={750}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Row justify="space-between" align="middle">
            <Col><Text>Chỉ hỗ trợ tệp định dạng .csv chuẩn mã UTF-8.</Text></Col>
            <Col><Button type="dashed" onClick={handleDownloadTemplate}>Tải Tệp Mẫu .CSV</Button></Col>
          </Row>

          <Upload.Dragger accept=".csv" beforeUpload={() => false} onChange={handleFileChange} maxCount={1}>
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32, color: '#1677ff' }} /></p>
            <p className="ant-upload-text">Kéo thả hoặc nhấp để chọn tệp .CSV</p>
          </Upload.Dragger>

          {importPreviewData.length > 0 && (
            <>
              <Alert message={`Đã đọc trước ${importPreviewData.length} dòng. Các dòng màu đỏ là bản ghi bị trùng MST sẽ tự động bỏ qua.`} type="info" showIcon />
              <Table
                size="small"
                rowKey="key"
                dataSource={importPreviewData}
                pagination={{ pageSize: 4 }}
                columns={[
                  { title: 'Tên công ty', dataIndex: 'name' },
                  { title: 'Mã số thuế', dataIndex: 'tax_code' },
                  {
                    title: 'Trạng thái trùng',
                    render: (_, r) => r.isDuplicate ? <Tag color="error">Trùng MST (Bỏ qua)</Tag> : <Tag color="success">Hợp lệ</Tag>
                  }
                ]}
              />
              <div style={{ textAlign: 'right' }}>
                <Button onClick={() => setImportModalOpen(false)} style={{ marginRight: 8 }}>Hủy</Button>
                <Button type="primary" onClick={handleExecuteImport}>Tiến Hành Nhập Vào Hệ Thống</Button>
              </div>
            </>
          )}
        </Space>
      </Modal>

      {/* ==================== TẠO TICKET CSKH & CỜ RỦI RO (S3-08) ==================== */}
      <Modal
        title={`Ghi Nhận Ticket Hỗ Trợ: ${activeCustomerForTicket?.name || ''}`}
        open={ticketModalOpen}
        onCancel={() => setTicketModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={ticketForm} layout="vertical" onFinish={handleSaveTicket}>
          <Form.Item label="Tiêu đề yêu cầu hỗ trợ" name="title" rules={[{ required: true, message: 'Nhập tiêu đề!' }]}>
            <Input placeholder="Ví dụ: Lỗi phần mềm không xuất được hóa đơn..." />
          </Form.Item>
          <Form.Item label="Mức độ ưu tiên" name="priority" initialValue="medium">
            <Select options={[
              { value: 'low', label: 'Thấp' },
              { value: 'medium', label: 'Trung bình' },
              { value: 'high', label: 'Cao' },
              { value: 'urgent', label: 'Khẩn cấp' }
            ]} />
          </Form.Item>
          <Alert message="Khách hàng có từ 2 ticket chưa xử lý sẽ tự động được hệ thống gắn Cờ Rủi Ro Rời Bỏ." type="warning" showIcon style={{ marginBottom: 16 }} />
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setTicketModalOpen(false)} style={{ marginRight: 8 }}>Hủy</Button>
            <Button type="primary" htmlType="submit">Ghi Nhận Ticket</Button>
          </div>
        </Form>
      </Modal>

      {/* ==================== GỘP TRÙNG (S3-04) ==================== */}
      <Modal
        title={
          <Space>
            <MergeCellsOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Phát Hiện & Gộp Khách Hàng Trùng Lặp (AC S3-04)</span>
          </Space>
        }
        open={duplicateModalOpen}
        onCancel={() => setDuplicateModalOpen(false)}
        width={820}
        footer={null}
      >
        {duplicatePairs.length === 0 ? (
          <Alert message="Không phát hiện bản ghi nào bị trùng lặp!" type="success" showIcon />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              message={`Hệ thống phát hiện ${duplicatePairs.length} cặp bản ghi nghi vấn trùng lặp.`}
              description="Dữ liệu hiển thị song song cạnh nhau. Khi gộp, toàn bộ Người liên hệ, Deals và Dòng thời gian sẽ được bảo toàn nguyên vẹn."
              type="warning"
              showIcon
            />
            {duplicatePairs.map((pair, idx) => (
              <Card key={idx} size="small" style={{ border: '1px solid #ffd591', backgroundColor: '#fffbe6' }}>
                <div style={{ marginBottom: 8 }}>
                  <Tag color="red" style={{ fontWeight: 600 }}>Cảnh báo: {pair.reason}</Tag>
                </div>
                <Row gutter={16} align="middle">
                  <Col span={10}>
                    <Card size="small" title={`Bản ghi A (#${pair.id1})`} styles={{ header: { backgroundColor: '#e6f4ff' } }}>
                      <p style={{ margin: '4px 0' }}><b>{pair.name1}</b></p>
                      <p style={{ margin: '4px 0', fontSize: 12 }}>MST: {pair.tax1 || 'Chưa khai báo'}</p>
                      <p style={{ margin: '4px 0', fontSize: 12 }}>Ngành: {pair.ind1 || '---'}</p>
                      <Button 
                        type="primary" 
                        size="small" 
                        block 
                        style={{ marginTop: 8 }}
                        onClick={async () => {
                          await axios.post('http://localhost:5001/api/customers/merge', { masterId: pair.id1, duplicateId: pair.id2 });
                          message.success('Đã giữ A làm chính và gom dữ liệu của B vào A!');
                          setDuplicateModalOpen(false);
                          fetchCustomers();
                        }}
                      >
                        Giữ A làm Master (Gộp B vào A)
                      </Button>
                    </Card>
                  </Col>

                  <Col span={4} style={{ textAlign: 'center' }}>
                    <SwapOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>Trùng lặp</div>
                  </Col>

                  <Col span={10}>
                    <Card size="small" title={`Bản ghi B (#${pair.id2})`} styles={{ header: { backgroundColor: '#f6ffed' } }}>
                      <p style={{ margin: '4px 0' }}><b>{pair.name2}</b></p>
                      <p style={{ margin: '4px 0', fontSize: 12 }}>MST: {pair.tax2 || 'Chưa khai báo'}</p>
                      <p style={{ margin: '4px 0', fontSize: 12 }}>Ngành: {pair.ind2 || '---'}</p>
                      <Button 
                        type="primary" 
                        size="small" 
                        block 
                        style={{ marginTop: 8, backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        onClick={async () => {
                          await axios.post('http://localhost:5001/api/customers/merge', { masterId: pair.id2, duplicateId: pair.id1 });
                          message.success('Đã giữ B làm chính và gom dữ liệu của A vào B!');
                          setDuplicateModalOpen(false);
                          fetchCustomers();
                        }}
                      >
                        Giữ B làm Master (Gộp A vào B)
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        )}
      </Modal>
    </div>
  );
}