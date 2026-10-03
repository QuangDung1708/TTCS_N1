import React, { useState, useRef } from 'react';

export default function AvatarUploadModal({ isOpen, onClose, onUploadSuccess, currentAvatar }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Xử lý khi người dùng chọn file
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setErrorMsg('');

        if (!file) return;

        // 1. Kiểm tra định dạng (JPG, PNG)
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setErrorMsg('⚠️ Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG!');
            return;
        }

        // 2. Kiểm tra dung lượng tối đa 2MB (2 * 1024 * 1024 bytes)
        if (file.size > 2 * 1024 * 1024) {
            setErrorMsg('⚠️ Dung lượng ảnh vượt quá giới hạn 2MB!');
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    // Gửi ảnh lên Backend
    const handleUpload = async () => {
        if (!selectedFile) {
            setErrorMsg('Vui lòng chọn một file ảnh trước khi lưu!');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const formData = new FormData();
            formData.append('avatar', selectedFile);

            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/users/avatar', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi khi tải ảnh lên!');

            // Cập nhật lại user trong localStorage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            storedUser.avatar = data.avatar;
            localStorage.setItem('user', JSON.stringify(storedUser));

            alert('✅ Tải lên ảnh đại diện thành công!');
            onUploadSuccess(data.avatar);
            handleClose();
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setErrorMsg('');
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                backgroundColor: '#161b22', border: '1px solid #30363d',
                borderRadius: '10px', width: '420px', padding: '24px',
                color: '#e6edf3', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>📸 Đổi Ảnh Đại Diện (S2-03)</h3>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>

                {errorMsg && (
                    <div style={{
                        padding: '10px', backgroundColor: '#3d1d1d', border: '1px solid #f85149',
                        borderRadius: '6px', color: '#f85149', fontSize: '13px', marginBottom: '16px'
                    }}>
                        {errorMsg}
                    </div>
                )}

                {/* Khung Preview ảnh vuông/tròn */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
                    <div style={{
                        width: '140px', height: '140px', borderRadius: '50%',
                        border: '3px solid #238636', overflow: 'hidden',
                        backgroundColor: '#0d1117', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : currentAvatar ? (
                            <img src={`http://localhost:5001${currentAvatar}`} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '40px', color: '#8b949e' }}>👤</span>
                        )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#8b949e', marginTop: '8px' }}>
                        Ảnh được tự động cắt vuông 200x200 pixel
                    </span>
                </div>

                {/* Nút chọn file */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        style={{
                            padding: '8px 16px', backgroundColor: '#21262d', color: '#58a6ff',
                            border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        📁 Chọn ảnh mới (Tối đa 2MB)
                    </button>
                    {selectedFile && <div style={{ fontSize: '12px', color: '#7ee787', marginTop: '6px' }}>{selectedFile.name}</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            padding: '6px 14px', backgroundColor: '#21262d', color: '#c9d1d9',
                            border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer'
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={loading || !selectedFile}
                        style={{
                            padding: '6px 16px', backgroundColor: loading || !selectedFile ? '#1f4827' : '#238636',
                            color: '#fff', border: 'none', borderRadius: '6px', cursor: loading || !selectedFile ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {loading ? 'Đang lưu...' : 'Lưu ảnh'}
                    </button>
                </div>
            </div>
        </div>
    );
}