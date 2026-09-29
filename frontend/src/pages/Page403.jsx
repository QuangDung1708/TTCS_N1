import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Page403() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.errorCode}>403</h1>
      <h2 style={styles.title}>Truy cập bị từ chối</h2>
      <p style={styles.description}>
        Bạn không có quyền truy cập vào tài nguyên hoặc trang này.
      </p>
      <button onClick={() => navigate('/')} style={styles.button}>
        Quay lại Trang chủ
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    padding: '20px',
  },
  errorCode: {
    fontSize: '96px',
    fontWeight: 'bold',
    color: '#f59e0b',
    margin: 0,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '16px 0 8px 0',
    color: '#1e293b',
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '24px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};