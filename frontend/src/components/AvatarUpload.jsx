import React, { useState } from 'react';
import { Upload, Modal, Button, Avatar, message } from 'antd';
import { LoadingOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

// Chuyển file ảnh sang dạng Base64 để xem trước (Preview)
const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const AvatarUpload = ({ currentAvatarUrl, onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentAvatarUrl || '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState([]);

  // 1. Kiểm tra định dạng và dung lượng ảnh trước khi chọn
  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
    if (!isJpgOrPng) {
      message.error('Bạn chỉ có thể tải lên định dạng JPG/PNG/WEBP!');
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Kích thước ảnh phải nhỏ hơn 2MB!');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 2. Xử lý xem trước ảnh (Preview Modal)
  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
  };

  // 3. Xử lý khi chọn hoặc đổi file
  const handleChange = ({ fileList: newFileList, file }) => {
    setFileList(newFileList);
    
    if (file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (file.status === 'done') {
      setLoading(false);
    } else if (file.status === 'error') {
      setLoading(false);
    }
  };

  // 4. Hàm giả lập upload (Mock Upload) để test giao diện không cần Backend
  const customRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    
    // Giả lập độ trễ mạng 1 giây
    setTimeout(async () => {
      try {
        const url = await getBase64(file);
        setImageUrl(url);
        setLoading(false);
        message.success('Cập nhật ảnh đại diện thành công!');
        onSuccess({ url });
        if (onUploadSuccess) onUploadSuccess(url);
      } catch (err) {
        setLoading(false);
        onError(err);
        message.error('Cập nhật ảnh đại diện thất bại!');
      }
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Hiển thị Avatar hiện tại */}
      <Avatar
        size={100}
        src={imageUrl}
        icon={<UserOutlined />}
        style={{ border: '2px solid #1890ff' }}
      />

      {/* Nút Upload và Chọn ảnh */}
      <Upload
        name="avatar"
        listType="picture-card"
        showUploadList={{ showRemoveIcon: true, showPreviewIcon: true }}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onPreview={handlePreview}
        onChange={handleChange}
        customRequest={customRequest}
        maxCount={1}
      >
        {fileList.length >= 1 ? null : (
          <div>
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>Chọn ảnh</div>
          </div>
        )}
      </Upload>

      {/* Modal Xem Trước Ảnh (Preview) */}
      <Modal
        open={previewOpen}
        title="Xem trước ảnh đại diện"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt="Preview Avatar" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default AvatarUpload;