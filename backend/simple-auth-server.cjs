const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const adapter = new PrismaPg({ 
  connectionString: 'postgresql://postgres:postgres@localhost:5432/omega_db' 
});
const prisma = new PrismaClient({ adapter });

// JWT Secret
const JWT_SECRET = 'omega-jwt-secret-key-change-in-production';

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Simple Auth Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !user.isActive) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Generate JWT
    const accessToken = jwt.sign(
      { 
        sub: user.id, 
        role: user.role, 
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
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    console.log('Login successful:', email);
    
    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          forcePasswordChange: user.forcePasswordChange
        }
      }
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
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    res.json({
      success: true,
      data: user
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
app.listen(PORT, async () => {
  console.log(`🚀 Simple Auth Server running on port ${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Check if SuperAdmin exists
    const adminUser = await prisma.user.findUnique({
      where: { email: 'eren@omegadijital.com' }
    });
    
    if (adminUser) {
      console.log('✅ SuperAdmin user found:', adminUser.email);
    } else {
      console.log('❌ SuperAdmin user not found');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
