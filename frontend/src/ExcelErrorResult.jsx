import React from 'react';

// FE 2: Component hiển thị thông báo, danh sách mảng errors và nút Tải file lỗi
const ExcelErrorResult = ({ successMsg, errorMsg, errorList, onDownloadErrorLog }) => {
  if (!successMsg && !errorMsg) return null;

  return (
    <div>
      {/* Thông báo thành công */}
      {successMsg && (
        <div style={{ padding: '12px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '6px', marginBottom: '15px' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Thông báo lỗi & mảng errors */}
      {errorMsg && (
        <div style={{ padding: '12px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '15px', textAlign: 'left' }}>
          <strong>⚠️ {errorMsg}</strong>

          {/* Mảng lỗi trả về từ BE */}
          {errorList && errorList.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>Chi tiết danh sách các dòng lỗi:</p>
              <ul style={{ maxHeight: '160px', overflowY: 'auto', paddingLeft: '20px', backgroundColor: '#fff', padding: '10px 10px 10px 30px', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
                {errorList.map((err, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', color: '#dc3545' }}>{err}</li>
                ))}
              </ul>

              {/* Nút Export mảng errors ra file .txt */}
              <button
                type="button"
                onClick={onDownloadErrorLog}
                style={{
                  marginTop: '10px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📥 Tải xuống danh sách lỗi (.txt)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelErrorResult;