import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pino from 'pino';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { productsRouter } from './routes/products-mock';
import { martiRouter } from './routes/marti';
import { ozanRouter } from './routes/ozan';
import { accountingRouter } from './routes/accounting';
import { usersRouter } from './routes/users';
import { globalChannelsRouter } from './routes/global-channels';
import { reportsRouter } from './routes/reports';
import { alertsRouter } from './routes/alerts';
import { excessCodesRouter } from './routes/excess-codes';
import { systemHealthRouter } from './routes/system-health';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = process.env.PORT || 3000;

// Mock user data
const users = [
  {
    id: '1',
    email: 'admin@omega.com',
    passwordHash: createHash('sha256').update('admin123').digest('hex'),
    role: 'ADMIN',
    isActive: true,
  }
];

// Mock products data
const mockProducts = [
  {
    id: 'prod1',
    name: 'PUBG Mobile 60 UC',
    sku: 'PUBGMTR60',
    sellingPrice: 100,
    marginPct: 14,
    purchasePrice: 80,
    providerId: 'prov1',
    provider: { name: 'Coda' }
  },
  {
    id: 'prod2', 
    name: 'Valorant 950 RP',
    sku: 'VALOR950',
    sellingPrice: 150,
    marginPct: 12,
    purchasePrice: 120,
    providerId: 'prov1',
    provider: { name: 'Coda' }
  }
];

// Mock channels data
const mockChannels = [
  {
    id: 'chan1',
    name: 'Trendyol',
    commissionPct: 15,
    isActive: true
  },
  {
    id: 'chan2', 
    name: 'HepsiBurada',
    commissionPct: 12,
    isActive: true
  },
  {
    id: 'chan3',
    name: 'Ozan',
    commissionPct: 8,
    isActive: true
  }
];

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.isActive);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const passwordHash = createHash('sha256').update(password).digest('hex');
    const isPasswordValid = passwordHash === user.passwordHash;
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Generate access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      accessToken
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed'
    });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret') as any;
    
    const user = users.find(u => u.id === decoded.sub && u.isActive);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    res.json({ accessToken });

  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  // This is a simple mock - in production, you'd verify the JWT token
  const user = users[0]; // Return the admin user for demo
  if (user) {
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Dashboard endpoints
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const summary = {
      totalOrders: 150,
      successfulOrders: 142,
      totalRevenue: 15000,
      totalProfit: 2250,
      providerStats: [
        { providerId: '1', providerName: 'Turkpin', orderCount: 150, revenue: 15000 },
      ],
      channelStats: [
        { channelId: '1', channelName: 'Trendyol', orderCount: 100, revenue: 10000, profit: 1500 },
        { channelId: '2', channelName: 'Hepsiburada', orderCount: 50, revenue: 5000, profit: 750 },
      ]
    };
    res.json(summary);
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mock data endpoints
app.get('/api/orders', (req, res) => {
  const orders = [
    {
      id: '1',
      customerName: 'John Doe',
      channelName: 'Trendyol',
      providerName: 'Turkpin',
      productName: 'Steam Wallet 100 TL',
      sellingPrice: 100,
      status: 'FULFILLED',
      digitalCodeEnc: 'encrypted-code',
      orderedAt: new Date().toISOString(),
      fulfilledAt: new Date().toISOString(),
    }
  ];
  res.json(orders);
});

app.get('/api/products', (req, res) => {
  const products = [
    {
      id: '1',
      name: 'Steam Wallet 100 TL',
      sku: 'STEAM100',
      providerName: 'Turkpin',
      purchasePrice: 95,
      sellingPrice: 100,
      marginPct: 5,
      stock: 100,
      isActive: true,
    }
  ];
  res.json(products);
});

app.get('/api/providers', (req, res) => {
  const providers = [
    {
      id: '1',
      name: 'Turkpin',
      type: 'API',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];
  res.json(providers);
});

app.get('/api/channels', (req, res) => {
  const channels = [
    {
      id: '1',
      name: 'Trendyol',
      commissionPct: 15,
      isActive: true,
      orderCount: 100,
      revenue: 10000,
    }
  ];
  res.json(channels);
});

app.get('/api/audit-logs', (req, res) => {
  const logs = [
    {
      id: '1',
      action: 'LOGIN',
      entity: 'User',
      ip: '127.0.0.1',
      createdAt: new Date().toISOString(),
    }
  ];
  res.json(logs);
});

app.get('/api/system/health', (req, res) => {
  const health = {
    database: {
      status: 'healthy',
      connectionCount: 5,
      responseTime: 10,
    },
    redis: {
      status: 'healthy',
      memory: '10MB',
      connectedClients: 2,
    },
    queue: {
      status: 'healthy',
      activeJobs: 0,
      failedJobs: 0,
      completedJobs: 150,
    },
    uptime: 3600,
    version: '1.0.0',
  };
  res.json(health);
});

// Products routes
app.use('/api/products', productsRouter);

// Martı routes
app.use('/api/marti', martiRouter);

// Ozan routes  
app.use('/api/ozan', ozanRouter);

// Accounting routes
app.use('/api/accounting', accountingRouter);

// User management routes
app.use('/api/users', usersRouter);

// Global channels routes
app.use('/api', globalChannelsRouter);

// Phase 4 routes
app.use('/api/reports', reportsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/excess-codes', excessCodesRouter);
app.use('/api/system', systemHealthRouter);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📝 Login with: admin@omega.com / admin123`);
});
