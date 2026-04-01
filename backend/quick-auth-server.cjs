const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'omega-jwt-secret-key-change-in-production';

// Hardcoded SuperAdmin user (temporary solution)
const SUPER_ADMIN = {
  id: 'super-admin-123',
  email: 'eren@omegadijital.com',
  passwordHash: '$2a$12$sLlEe0plMDJjpQY/0aped.S0KC5UO9yaKZenCn.IoLyOujjyKkMsC', // admin123
  name: 'Eren Kumcuoğlu',
  role: 'SUPER_ADMIN',
  isActive: true,
  forcePasswordChange: false,
  lastLoginAt: null
};

console.log('🔐 SuperAdmin user hardcoded:');
console.log(`   Email: ${SUPER_ADMIN.email}`);
console.log(`   Password: admin123`);
console.log(`   Role: ${SUPER_ADMIN.role}`);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Quick Auth Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email);
    
    // Check if it's SuperAdmin - NO PASSWORD CHECK
    if (email === SUPER_ADMIN.email) {
      // Generate JWT (no password validation)
      const accessToken = jwt.sign(
        { 
          sub: SUPER_ADMIN.id, 
          role: SUPER_ADMIN.role, 
          type: 'access' 
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      // Set cookie
      res.cookie('omega_access_token', accessToken, {
        httpOnly: true,
        secure: false, // development
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });
      
      // Update last login (in memory only)
      SUPER_ADMIN.lastLoginAt = new Date();
      
      console.log('✅ SuperAdmin login successful (no password check):', email);
      
      return res.json({
        success: true,
        data: {
          accessToken,
          user: {
            id: SUPER_ADMIN.id,
            email: SUPER_ADMIN.email,
            name: SUPER_ADMIN.name,
            role: SUPER_ADMIN.role,
            forcePasswordChange: SUPER_ADMIN.forcePasswordChange
          }
        }
      });
    }
    
    // If not SuperAdmin
    console.log('User not found:', email);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Validate endpoint
app.get('/api/auth/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.substring(7) || req.cookies?.omega_access_token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's SuperAdmin
    if (decoded.sub === SUPER_ADMIN.id) {
      return res.json({
        success: true,
        data: {
          id: SUPER_ADMIN.id,
          email: SUPER_ADMIN.email,
          name: SUPER_ADMIN.name,
          role: SUPER_ADMIN.role
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('omega_access_token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Quick Auth Server running on port ${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 SuperAdmin: eren@omegadijital.com / admin123`);
  console.log('✅ Ready for login!');
});

console.log(`
🎯 LOGIN BİLGİLERİ:
   Email: eren@omegadijital.com
   Password: admin123
   Role: SUPER_ADMIN
   
🚀 Frontend'i başlat: http://localhost:3001
🔐 Backend hazır: http://localhost:3004
`);
