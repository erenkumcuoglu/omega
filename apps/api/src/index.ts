import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { prisma } from './config/database';
import { requestId } from './middleware/security';
import { authRouter } from './routes/auth';
import { webhooksRouter } from './routes/webhooks';
import { HTTP_STATUS } from '@omega/shared';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

// Trust proxy for Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestId);

// Request logging
app.use((req, res, next) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, 'Request received');
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    }, 'Request completed');
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/auth', authRouter);
app.use('/webhooks', webhooksRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url
  }, 'Unhandled error');

  // Don't expose stack trace in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Close server
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
    
  } catch (error: any) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '127.0.0.1', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

export { app, server };
