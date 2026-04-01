import { Routes, Route } from 'react-router-dom'
import Products from './pages/Products'

function AppTest() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Omega Digital - Test</h1>
      <p>Frontend çalışıyor!</p>
      <Routes>
        <Route path="/" element={<div>Ana Sayfa</div>} />
        <Route path="/products" element={<Products />} />
        <Route path="/product-management" element={<div>Product Management</div>} />
      </Routes>
    </div>
  )
}

export default AppTest
