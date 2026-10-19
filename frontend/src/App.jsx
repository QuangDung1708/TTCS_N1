import AvatarUpload from './components/AvatarUpload';

function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '20px' }}>
      <div style={{ background: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '24px', color: '#262626' }}>Ảnh đại diện</h3>
        <AvatarUpload />
      </div>
    </div>
  );
}

export default App;