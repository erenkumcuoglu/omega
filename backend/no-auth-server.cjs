const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Mock SuperAdmin user (no authentication needed)
const SUPER_ADMIN = {
  id: 'super-admin-123',
  email: 'eren@omegadijital.com',
  name: 'Eren Kumcuoğlu',
  role: 'SUPER_ADMIN',
  isActive: true,
  forcePasswordChange: false
};

console.log('🔐 NO AUTH - Direct access enabled');
console.log(`👤 User: ${SUPER_ADMIN.email} (Role: ${SUPER_ADMIN.role})`);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'No Auth Server is running!',
    timestamp: new Date().toISOString()
  });
});

// FAKE Login endpoint - always succeeds
app.post('/api/auth/login', async (req, res) => {
  console.log('🔓 FAKE Login - always successful');
  
  const accessToken = 'fake-jwt-token-for-development';
  
  res.cookie('omega_access_token', accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });
  
  res.json({
    success: true,
    data: {
      accessToken,
      user: SUPER_ADMIN
    }
  });
});

// FAKE Validate endpoint - always succeeds
app.get('/api/auth/validate', async (req, res) => {
  res.json({
    success: true,
    data: SUPER_ADMIN
  });
});

// FAKE Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('omega_access_token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Mock endpoints for Turkpin integration
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Turkpin',
        type: 'API',
        isActive: true,
        apiUsername: 'test',
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Test Product',
        sku: 'TEST-001',
        providerId: '1',
        purchasePrice: 10.00,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 No Auth Server running on port ${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔐 FAKE Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Direct access - NO AUTH REQUIRED`);
  console.log('✅ Ready for Turkpin integration!');
});

console.log(`
🎯 DİREKT ERİŞİM:
   ✅ Giriş gerekmiyor
   ✅ Credentials kontrolü yok
   ✅ Direkt dashboard açılacak
   ✅ Turkpin entegrasyonu hazır
   
🚀 Frontend: http://localhost:3001
🔐 Backend: http://localhost:3004
`);
