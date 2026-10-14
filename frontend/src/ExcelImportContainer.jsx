import React, { useState } from 'react';
import axios from 'axios';
import ExcelUploadForm from './ExcelUploadForm'; // Import Component FE 1
import ExcelErrorResult from './ExcelErrorResult'; // Import Component FE 2

// FILE CHA: Quản lý State, gọi API Axios POST FormData và ghép nối FE 1 + FE 2
const ExcelImportContainer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorList, setErrorList] = useState([]); // Mảng errors

  // 1. Quản lý State chọn file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setSuccessMsg('');
    setErrorMsg('');
    setErrorList([]);
    if (selectedFile) setFile(selectedFile);
  };

  // 2. Viết hàm axios.post gửi FormData
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Vui lòng chọn file Excel trước!');
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

      setSuccessMsg(response.data?.message || 'Import dữ liệu Excel thành công!');
      setFile(null);
    } catch (err) {
      if (err.response) {
        const data = err.response.data;
        setErrorMsg(data.message || 'Import thất bại, dữ liệu file có lỗi!');

        // Nhận mảng errors trả về từ Backend
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

  // 3. Logic xuất mảng errors ra file .txt
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
    <div style={{ maxWidth: '650px', margin: '40px auto', padding: '24px', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>[N1-225] Quản lý Import Excel</h2>

      {/* Ghép nối FE 1: Form chọn & gửi file */}
      <ExcelUploadForm
        file={file}
        loading={loading}
        onFileChange={handleFileChange}
        onSubmit={handleUpload}
      />

      {/* Ghép nối FE 2: Hiển thị kết quả & Danh sách lỗi */}
      <ExcelErrorResult
        successMsg={successMsg}
        errorMsg={errorMsg}
        errorList={errorList}
        onDownloadErrorLog={handleDownloadErrorLog}
      />
    </div>
  );
};

export default ExcelImportContainer;