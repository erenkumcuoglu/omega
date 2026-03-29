import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { prisma } from './config/database';
import { authRouter } from './routes/auth';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);

// Simple dashboard endpoint
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

// Start server
async function start() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
