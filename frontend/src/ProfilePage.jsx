import React, { useState } from 'react';

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);

  // Dữ liệu mẫu (sau này ghép API chỉ cần thay đổi ở đây)
  const [user, setUser] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    phone: '0987654321',
    gender: 'Nam',
    address: 'Hà Nội, Việt Nam',
    avatar: 'https://via.placeholder.com/150'
  });

  const [formData, setFormData] = useState({ ...user });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, avatar: imageUrl }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUser({ ...formData });
    setIsEditing(false);
    alert('Cập nhật thông tin thành công!');
  };

  const handleCancel = () => {
    setFormData({ ...user });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-xl shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Hồ Sơ Cá Nhân</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Chỉnh sửa
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <img
              src={formData.avatar}
              alt="Avatar"
              className="w-28 h-28 rounded-full object-cover border-2 border-blue-500"
            />
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs p-1.5 rounded-full cursor-pointer hover:bg-blue-700">
                Sửa
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Họ và tên */}
        <div>
          <label className="block text-sm font-semibold text-gray-600">Họ và tên</label>
          {isEditing ? (
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          ) : (
            <p className="mt-1 text-gray-800 font-medium">{user.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-600">Email</label>
          <p className="mt-1 text-gray-500 bg-gray-100 p-2 rounded-md">{user.email} (Không thể thay đổi)</p>
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-sm font-semibold text-gray-600">Số điện thoại</label>
          {isEditing ? (
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="mt-1 text-gray-800 font-medium">{user.phone}</p>
          )}
        </div>

        {/* Giới tính */}
        <div>
          <label className="block text-sm font-semibold text-gray-600">Giới tính</label>
          {isEditing ? (
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          ) : (
            <p className="mt-1 text-gray-800 font-medium">{user.gender}</p>
          )}
        </div>

        {/* Địa chỉ */}
        <div>
          <label className="block text-sm font-semibold text-gray-600">Địa chỉ</label>
          {isEditing ? (
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="mt-1 text-gray-800 font-medium">{user.address}</p>
          )}
        </div>

        {/* Các nút bấm */}
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Lưu thay đổi
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfilePage;