import React from 'react';

// FE 1: Component giao diện chọn file và nút bấm Submit
const ExcelUploadForm = ({ file, loading, onFileChange, onSubmit }) => {
  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={onFileChange}
          disabled={loading}
          style={{ padding: '6px' }}
        />
      </div>

      <button
        type="submit"
        disabled={!file || loading}
        style={{
          padding: '8px 18px',
          backgroundColor: !file || loading ? '#ccc' : '#28a745',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? '⏳ Đang xử lý...' : '📤 Upload & Import Excel'}
      </button>
    </form>
  );
};

export default ExcelUploadForm;