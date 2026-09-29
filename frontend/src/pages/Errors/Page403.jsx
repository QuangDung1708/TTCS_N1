function Page403() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '80px',
          marginBottom: '16px',
        }}
      >
        ⚠️
      </div>

      <h1
        style={{
          fontSize: '48px',
          marginBottom: '12px',
          color: '#d4380d',
        }}
      >
        403
      </h1>

      <p style={{ fontSize: '20px' }}>
        Bạn không có quyền truy cập vào chức năng này.
      </p>

      <p style={{ color: '#666' }}>
        Vui lòng liên hệ quản trị viên nếu bạn cần được cấp quyền.
      </p>
    </div>
  )
}

export default Page403