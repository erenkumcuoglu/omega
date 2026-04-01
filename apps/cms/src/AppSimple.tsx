function AppSimple() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'red' }}>
      <h1 style={{ color: 'white', fontSize: '48px' }}>TEST SAYFASI</h1>
      <p style={{ fontSize: '24px' }}>Bu sayfa görüyorsanız frontend çalışıyor!</p>
      <button onClick={() => alert('Button çalışıyor!')}>Test Button</button>
    </div>
  )
}

export default AppSimple
