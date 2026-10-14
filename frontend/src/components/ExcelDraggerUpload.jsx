import React, { useState } from 'react';
import { Upload, message, Typography, Spin, Progress, Card, Button, Space, Tag } from 'antd';
import { 
  InboxOutlined, 
  FileExcelFilled, 
  DeleteOutlined, 
  CheckCircleFilled, 
  WarningFilled 
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

/**
 * Task N1-230: [FE-UI] Xây dựng Khu vực Kéo thả Upload & File Validation
 * - Giao diện kéo thả dùng Upload.Dragger của Ant Design
 * - Chặn lỗi ở Client: Chỉ chấp nhận .xlsx, .xls; dung lượng < 5MB
 * - Hiển thị trạng thái Loading/Spin và thanh tiến trình khi đang chờ xử lý
 */
export default function ExcelDraggerUpload({
  onFileSelect,
  onFileRemove,
  loading = false,
  disabled = false,
  selectedFile: externalFile = null,
}) {
  const [internalFile, setInternalFile] = useState(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentFile = externalFile !== undefined && externalFile !== null ? externalFile : internalFile;

  // Logic chặn lỗi ngay tại Client trong beforeUpload
  const handleBeforeUpload = (file) => {
    // 1. Kiểm tra định dạng file (.xlsx, .xls)
    const fileName = file.name ? file.name.toLowerCase() : '';
    const isExcel = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

    if (!isExcel) {
      message.error({
        content: `Tệp "${file.name}" không hợp lệ! Hệ thống chỉ chấp nhận file Excel (.xlsx, .xls).`,
        icon: <WarningFilled style={{ color: '#ff4d4f' }} />,
        duration: 4,
      });
      return Upload.LIST_IGNORE;
    }

    // 2. Kiểm tra dung lượng < 5MB
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB >= MAX_FILE_SIZE_MB) {
      message.error({
        content: `Dung lượng tệp (${fileSizeMB.toFixed(2)} MB) vượt quá giới hạn cho phép (tối đa ${MAX_FILE_SIZE_MB} MB)!`,
        icon: <WarningFilled style={{ color: '#ff4d4f' }} />,
        duration: 4,
      });
      return Upload.LIST_IGNORE;
    }

    // Mô phỏng tiến trình đọc/kiểm tra file mượt mà (Progress animation)
    setIsProcessing(true);
    setUploadPercent(20);

    const timer1 = setTimeout(() => setUploadPercent(65), 150);
    const timer2 = setTimeout(() => {
      setUploadPercent(100);
      setIsProcessing(false);
      setInternalFile(file);
      if (onFileSelect) {
        onFileSelect(file);
      }
      message.success(`Đã chọn tệp Excel "${file.name}" hợp lệ!`);
    }, 350);

    // Trả về false để Ant Design không tự động POST đi mà để Client xử lý
    return false;
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    setInternalFile(null);
    setUploadPercent(0);
    setIsProcessing(false);
    if (onFileRemove) {
      onFileRemove();
    }
    message.info('Đã hủy chọn tệp.');
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isLoadingState = loading || isProcessing;

  return (
    <div style={{ width: '100%', margin: '12px 0' }}>
      {/* 1. Khu vực Drag & Drop khi chưa có file */}
      {!currentFile ? (
        <Spin spinning={isLoadingState} tip="Đang kiểm tra tệp Excel...">
          <Dragger
            accept=".xlsx, .xls"
            multiple={false}
            showUploadList={false}
            beforeUpload={handleBeforeUpload}
            disabled={disabled || isLoadingState}
            style={{
              padding: '28px 16px',
              backgroundColor: disabled ? '#f5f5f5' : '#fafafa',
              border: '2px dashed #1677ff',
              borderRadius: 12,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
              <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            </p>
            <Paragraph strong style={{ fontSize: 16, marginBottom: 6, color: '#1f2937' }}>
              Nhấp hoặc kéo thả file Excel vào đây để tải lên
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
              Hỗ trợ định dạng: <Tag color="blue">.xlsx</Tag> <Tag color="cyan">.xls</Tag> • Dung lượng tối đa: <Tag color="orange">&lt; 5MB</Tag>
            </Text>
          </Dragger>

          {/* Thanh tiến trình khi đang chờ */}
          {isLoadingState && (
            <div style={{ marginTop: 14 }}>
              <Progress percent={uploadPercent} status="active" strokeColor="#1677ff" />
            </div>
          )}
        </Spin>
      ) : (
        /* 2. Giao diện hiển thị tệp đã chọn thành công */
        <Card
          size="small"
          style={{
            borderRadius: 10,
            borderColor: '#91caff',
            backgroundColor: '#e6f4ff',
            boxShadow: '0 2px 6px rgba(22, 119, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Space align="center" size={14}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                }}
              >
                <FileExcelFilled style={{ fontSize: 26, color: '#52c41a' }} />
              </div>
              <div>
                <Space size={8}>
                  <Text strong style={{ fontSize: 15, color: '#0958d9' }}>
                    {currentFile.name}
                  </Text>
                  <Tag icon={<CheckCircleFilled />} color="success">
                    Hợp lệ &lt; 5MB
                  </Tag>
                </Space>
                <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
                  Kích thước: <strong>{formatFileSize(currentFile.size)}</strong> • Loại tệp: Excel Workbook
                </div>
              </div>
            </Space>

            <Space>
              <Button
                danger
                size="middle"
                icon={<DeleteOutlined />}
                onClick={handleRemove}
                disabled={disabled || loading}
              >
                Đổi file khác
              </Button>
            </Space>
          </div>

          {/* Thanh tiến trình / Loading khi thao tác gửi API */}
          {loading && (
            <div style={{ marginTop: 12 }}>
              <Spin tip="Đang tải dữ liệu lên hệ thống...">
                <Progress percent={85} status="active" strokeColor="#52c41a" />
              </Spin>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
