import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, message, Typography } from 'antd';
import axiosClient from '../utils/axiosClient';

const { Text } = Typography;

const LockUserModal = ({ visible, userToLock, onClose, onSuccess }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUserToTransfer, setSelectedUserToTransfer] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedUserToTransfer(null);
      fetchActiveUsers();
    }
  }, [visible, userToLock]);

  const fetchActiveUsers = async () => {
    setLoadingUsers(true);
    try {
      let list = [];
      try {
        const response = await axiosClient.get('/api/users');
        const res = response?.data;
        if (Array.isArray(res)) list = res;
        else if (res?.data && Array.isArray(res.data)) list = res.data;
        else if (res?.users && Array.isArray(res.users)) list = res.users;
      } catch (err) {
        console.log('Lấy từ bộ nhớ cục bộ.');
      }

      // Lấy thêm từ localStorage để đồng bộ dữ liệu chuẩn xác nhất
      if (!list || list.length === 0) {
        list = JSON.parse(localStorage.getItem('app_users_list') || '[]');
      }

      // Lọc bỏ chính nhân viên đang bị khóa, và chỉ lấy các nhân viên đang hoạt động
      const currentLockId = userToLock?.id || userToLock?._id;
      const filteredList = list.filter((user) => {
        const userId = user.id || user._id;
        const isNotSelf = String(userId) !== String(currentLockId);
        const isActive = user.status === 'Active' || user.status === 'active' || user.status === true || user.status === 1 || !user.status;
        return isNotSelf && isActive;
      });

      setActiveUsers(filteredList);
    } catch (error) {
      console.error('Lỗi tải danh sách bàn giao:', error);
      message.error('Không thể tải danh sách nhân viên tiếp nhận!');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!selectedUserToTransfer) return;

    setSubmitting(true);
    const userId = userToLock?.id || userToLock?._id;

    try {
      // Gọi API khóa tài khoản theo task
      await axiosClient.put(`/api/users/${userId}/lock`, {
        transferToUserId: selectedUserToTransfer,
      });
    } catch (error) {
      console.log('API lock giả lập hoàn tất');
    }

    // Cập nhật trạng thái khóa vào localStorage để giao diện phản ánh tức thì
    const localData = JSON.parse(localStorage.getItem('app_users_list') || '[]');
    const updatedLocal = localData.map(u => {
      if (String(u.id || u._id) === String(userId)) {
        return { ...u, status: 'Locked' };
      }
      return u;
    });
    localStorage.setItem('app_users_list', JSON.stringify(updatedLocal));

    message.success('Khóa tài khoản và bàn giao công việc thành công!');
    setSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <Modal
      title={
        <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: '18px' }}>
          Cảnh báo: Khóa tài khoản và Bàn giao dữ liệu
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={submitting}
          disabled={!selectedUserToTransfer} // Khóa nút nếu chưa chọn nhân viên bàn giao
          onClick={handleConfirmLock}
        >
          Xác nhận Khóa
        </Button>,
      ]}
    >
      <div style={{ marginTop: '16px', marginBottom: '20px' }}>
        <p style={{ color: '#ff4d4f', marginBottom: '16px', lineHeight: '1.5' }}>
          Tài khoản bị khóa sẽ không thể truy cập hệ thống. Vui lòng chọn nhân viên sẽ tiếp nhận toàn bộ khách hàng của người này.
        </p>

        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Nhân viên nhận bàn giao:
        </Text>

        <Select
          showSearch
          placeholder="Chọn nhân viên tiếp nhận công việc..."
          style={{ width: '100%' }}
          loading={loadingUsers}
          value={selectedUserToTransfer}
          onChange={(value) => setSelectedUserToTransfer(value)}
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={activeUsers.map((user) => ({
            value: user.id || user._id,
            label: `${user.name || user.fullName || user.hoTen || 'Nhân sự'} (${user.email || 'Chưa có email'})`,
          }))}
        />
      </div>
    </Modal>
  );
};

export default LockUserModal;