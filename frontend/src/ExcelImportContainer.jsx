import React, { useState } from 'react';
import axios from 'axios';

const ExcelImportContainer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]); // Mảng chứa các dòng lỗi trả về từ BE

  // 1. Lắng nghe sự kiện chọn file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setSuccessMsg('');
    setErrorMsg('');
    setErrorList([]);

    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // 2. Gọi API Axios gửi FormData
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Vui lòng chọn file Excel trước khi bấm Upload!');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    setErrorList([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/v1/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMsg(response.data?.message || 'Import dữ liệu từ Excel thành công!');
      setFile(null);
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        setErrorMsg(data.message || 'Import thất bại, vui lòng kiểm tra lại file!');

        // Nhận mảng lỗi chi tiết từ Backend
        if (data.errors && Array.isArray(data.errors)) {
          setErrorList(data.errors);
        }
      } else {
        setErrorMsg('Lỗi kết nối máy chủ! Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Logic Nút "Tải xuống danh sách lỗi" (.txt)
  const handleDownloadErrorLog = () => {
    if (errorList.length === 0) return;

    const fileContent = "DANH SÁCH LỖI IMPORT EXCEL:\n\n" + errorList.join("\n");
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_loi_import_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Quản lý Import Excel (Task N1-225)</h2>

      {/* Alert Thành Công */}
      {successMsg && (
        <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '15px' }}>
          {successMsg}
        </div>
      )}

      {/* Alert Lỗi & Hiển thị danh sách lỗi */}
      {errorMsg && (
        <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px' }}>
          <strong>{errorMsg}</strong>

          {errorList.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ margin: '5px 0' }}>Chi tiết các dòng bị lỗi:</p>
              <ul style={{ maxHeight: '150px', overflowY: 'auto', paddingLeft: '20px', textAlign: 'left' }}>
                {errorList.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>

              {/* Nút Tải File Lỗi */}
              <button
                type="button"
                onClick={handleDownloadErrorLog}
                style={{
                  marginTop: '10px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                📥 Tải xuống danh sách lỗi (.txt)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Chọn & Upload File */}
      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: '8px 16px',
            backgroundColor: !file || loading ? '#ccc' : '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: !file || loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Đang xử lý...' : 'Upload & Import'}
        </button>
      </form>
    </div>
  );
};

export default ExcelImportContainer;