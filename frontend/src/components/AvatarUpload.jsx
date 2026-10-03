import React, { useState, useRef } from 'react';
import { Upload, Modal, Slider, message, Avatar } from 'antd';
import { CameraOutlined, UserOutlined, LoadingOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

/**
 * Component Tải & Cắt ảnh đại diện vuông chuẩn Ant Design (Tương thích 100% React 19)
 */
export default function AvatarUpload({ defaultUrl = '', onCropComplete, size = 100 }) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(defaultUrl);
  const [rawImage, setRawImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);

  // 1. Kiểm tra định dạng & dung lượng file
  const beforeUpload = (file) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type);
    if (!isImage) {
      message.error('Chỉ được chọn file ảnh (JPG, PNG, WEBP)!');
      return Upload.LIST_IGNORE;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Dung lượng ảnh phải nhỏ hơn 2MB!');
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsModalOpen(true); // Mở Modal cắt ảnh
    };
    reader.readAsDataURL(file);
    return false; // Ngăn chặn tự động upload
  };

  // 2. Kéo thả chuột để căn chỉnh vị trí ảnh trong khung
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 3. Thực hiện cắt ảnh vuông (tỉ lệ 1:1) bằng Canvas
  const handleCropAndSave = () => {
    if (!rawImage) return;
    setLoading(true);

    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const outputSize = 300; // Độ phân giải ảnh vuông xuất ra (300x300)
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');

      const containerSize = 240; // Kích thước khung xem trước
      const scale = outputSize / containerSize;

      // Nền trắng
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);

      const displayWidth = img.width * (containerSize / Math.max(img.width, img.height)) * zoom;
      const displayHeight = img.height * (containerSize / Math.max(img.width, img.height)) * zoom;

      const centerX = (containerSize - displayWidth) / 2 + offset.x;
      const centerY = (containerSize - displayHeight) / 2 + offset.y;

      ctx.drawImage(
        img,
        centerX * scale,
        centerY * scale,
        displayWidth * scale,
        displayHeight * scale
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const localUrl = URL.createObjectURL(blob);
          setPreviewUrl(localUrl);

          if (onCropComplete) {
            onCropComplete(croppedFile);
          }
          message.success('Cắt ảnh đại diện thành công!');
        }
        setLoading(false);
        setIsModalOpen(false);
      }, 'image/jpeg', 0.9);
    };
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Upload
        showUploadList={false}
        beforeUpload={beforeUpload}
        accept="image/png, image/jpeg, image/jpg, image/webp"
      >
        <div style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }}>
          {/* Avatar xem trước */}
          <Avatar
            size={size}
            src={previewUrl}
            icon={!previewUrl && (loading ? <LoadingOutlined /> : <UserOutlined />)}
            style={{
              backgroundColor: '#f5f5f5',
              border: '2px solid #d9d9d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          {/* Nút camera nhỏ ở góc */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: '#1677ff',
              color: '#fff',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
            }}
          >
            <CameraOutlined style={{ fontSize: 13 }} />
          </div>
        </div>
      </Upload>

      <span style={{ fontSize: 12, color: '#8c8c8c' }}>Nhấp vào ảnh để thay đổi</span>

      {/* Modal Căn chỉnh & Cắt ảnh vuông */}
      <Modal
        title="Căn chỉnh & Cắt ảnh đại diện vuông"
        open={isModalOpen}
        onOk={handleCropAndSave}
        onCancel={() => setIsModalOpen(false)}
        okText="Cắt & Lưu ảnh"
        cancelText="Hủy"
        width={360}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 12 }}>
          {/* Khung cắt vuông 1:1 */}
          <div
            style={{
              width: 240,
              height: 240,
              border: '2px dashed #1677ff',
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#f0f2f5',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {rawImage && (
              <img
                ref={imgRef}
                src={rawImage}
                alt="Preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  pointerEvents: 'none',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out'
                }}
              />
            )}
          </div>

          {/* Thanh trượt thu phóng (Zoom) */}
          <div style={{ width: '100%', padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
              <span><ZoomOutOutlined /> Thu nhỏ</span>
              <span><ZoomInOutlined /> Phóng to</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(val) => setZoom(val)}
            />
          </div>

          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            💡 Dùng chuột kéo ảnh để căn giữa, kéo thanh trượt để phóng to
          </span>
        </div>
      </Modal>
    </div>
  );
}
