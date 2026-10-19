import React, { useState } from 'react';
import { Upload, Button, Card, Table, Tag, Progress, Space, Alert, message } from 'antd';
import { InboxOutlined, UploadOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

export default function ExcelImportPage() {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  // Cấu hình Drag & Drop file Excel
  const uploadProps = {
    onRemove: (file) => {
      setFileList((prev) => {
        const index = prev.indexOf(file);
        const newFileList = prev.slice();
        newFileList.splice(index, 1);
        return newFileList;
      });
    },
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isExcel) {
        message.error('Chỉ hỗ trợ tải lên file Excel (.xlsx, .xls)!');
        return Upload.LIST_IGNORE;
      }
      setFileList([file]); // Chỉ giữ 1 file duy nhất
      return false; // Chặn tự động upload
    },
    fileList,
  };

  // Giả lập / Gọi API Upload & Xử lý File Excel
  const handleStartImport = () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn file Excel trước!');
      return;
    }

    setUploading(true);
    setProgress(20);

    // Tiến trình giả lập tải dữ liệu
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 30;
      });
    }, 300);

    setTimeout(() => {
      clearInterval(timer);
      setProgress(100);
      setUploading(false);
      message.success('Nhập dữ liệu từ Excel hoàn tất!');

      // Trả về dữ liệu kết quả kèm danh sách dòng lỗi
      setImportResult({
        total: 50,
        successCount: 45,
        errorCount: 5,
        errorDetails: [
          { key: '1', row: 12, field: 'Email', value: 'nguyenvana@', error: 'Định dạng email không hợp lệ' },
          { key: '2', row: 18, field: 'Số điện thoại', value: '098123', error: 'Số điện thoại phải đủ 10 chữ số' },
          { key: '3', row: 25, field: 'Mã số thuế', value: '', error: 'Trường bắt buộc không được để trống' },
          { key: '4', row: 31, field: 'Ngày sinh', value: '31/02/1995', error: 'Ngày tháng không tồn tại' },
          { key: '5', row: 44, field: 'Số CMND/CCCD', value: '1234abc', error: 'Chứa ký tự không hợp lệ' },
        ],
      });
    }, 1500);
  };

  // Xuất file text chứa chi tiết các dòng bị lỗi
  const handleDownloadErrorReport = () => {
    if (!importResult || !importResult.errorDetails) return;

    let content = "=== BÁO CÁO LỖI NHẬP DỮ LIỆU EXCEL ===\n";
    content += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
    content += `Tổng số dòng: ${importResult.total} | Thành công: ${importResult.successCount} | Lỗi: ${importResult.errorCount}\n\n`;
    content += "CHI TIẾT CÁC DÒNG LỖI:\n";
    content += "----------------------------------------------------------------------\n";

    importResult.errorDetails.forEach((item, index) => {
      content += `${index + 1}. Dòng ${item.row} - Cột [${item.field}]: Giá trị "${item.value}" => Lỗi: ${item.error}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Loi_Import_Excel_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Đã tải xuống file báo cáo lỗi (.txt)!');
  };

  const columns = [
    { title: 'Dòng Excel', dataIndex: 'row', key: 'row', width: 100, align: 'center' },
    { title: 'Trường dữ liệu', dataIndex: 'field', key: 'field', width: 150 },
    { title: 'Giá trị nhập vào', dataIndex: 'value', key: 'value', render: (val) => <Tag color="volcano">{val || '(Trống)'}</Tag> },
    { title: 'Chi tiết lỗi', dataIndex: 'error', key: 'error', render: (err) => <span style={{ color: '#ff4d4f' }}>{err}</span> },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Card title={<h2>[FE] Giao diện nhập Excel & Báo cáo kết quả</h2>} bordered={false}>
        
        {/* Khu vực Tải File */}
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </p>
            <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc bấm để chọn file</p>
            <p className="ant-upload-hint">Định dạng hỗ trợ: .xlsx, .xls</p>
          </Dragger>

          {uploading && <Progress percent={progress} status="active" />}

          <Button
            type="primary"
            icon={<UploadOutlined />}
            size="large"
            onClick={handleStartImport}
            loading={uploading}
            disabled={fileList.length === 0}
            block
          >
            Tải Lên & Xử Lý Dữ Liệu
          </Button>

          {/* Khu vực Báo cáo Kết quả */}
          {importResult && (
            <Card type="inner" title="Kết quả Xử lý Import" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Alert
                  message={
                    <span>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      Thành công: <b>{importResult.successCount}</b> / {importResult.total} dòng
                      <CloseCircleOutlined style={{ color: '#ff4d4f', marginLeft: 16, marginRight: 8 }} />
                      Lỗi: <b>{importResult.errorCount}</b> dòng
                    </span>
                  }
                  type={importResult.errorCount > 0 ? 'warning' : 'success'}
                  showIcon
                />

                {importResult.errorCount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>Danh sách chi tiết dòng lỗi:</h4>
                      <Button
                        type="primary"
                        danger
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadErrorReport}
                      >
                        Tải File Báo Cáo Lỗi (.txt)
                      </Button>
                    </div>

                    <Table
                      dataSource={importResult.errorDetails}
                      columns={columns}
                      pagination={false}
                      size="small"
                      bordered
                    />
                  </>
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
}