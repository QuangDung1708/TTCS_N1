function Page404() {
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
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>😢</div>

      <h1 style={{ fontSize: '48px', marginBottom: '12px' }}>404</h1>

      <p style={{ fontSize: '20px' }}>
        Ôi! Trang bạn tìm kiếm không tồn tại.
      </p>

      <p style={{ color: '#666' }}>
        Vui lòng kiểm tra lại đường dẫn hoặc quay lại trang trước.
      </p>
    </div>
  )
}

export default Page404