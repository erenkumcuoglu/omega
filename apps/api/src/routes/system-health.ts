import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock system health data (in real app this would check actual services)
const generateHealthData = () => {
  const timestamp = new Date().toISOString()
  
  // Simulate service health checks
  const dbLatency = 10 + Math.random() * 10
  const redisLatency = 2 + Math.random() * 5
  const turkpinLatency = 200 + Math.random() * 100
  const turkpinBalance = 950000 + Math.random() * 100000
  
  const dbHealthy = dbLatency < 50
  const redisHealthy = redisLatency < 20
  const turkpinHealthy = turkpinLatency < 500
  const queueHealthy = true // Mock queue status
  
  const overallStatus = dbHealthy && redisHealthy && turkpinHealthy && queueHealthy 
    ? 'healthy' 
    : dbHealthy && redisHealthy && turkpinHealthy 
    ? 'degraded' 
    : 'down'
  
  return {
    status: overallStatus,
    timestamp,
    checks: {
      database: {
        status: dbHealthy ? 'healthy' : 'down',
        latencyMs: Math.round(dbLatency * 100) / 100
      },
      redis: {
        status: redisHealthy ? 'healthy' : 'down',
        latencyMs: Math.round(redisLatency * 100) / 100
      },
      turkpin: {
        status: turkpinHealthy ? 'healthy' : 'down',
        latencyMs: Math.round(turkpinLatency * 100) / 100,
        balance: Math.round(turkpinBalance * 100) / 100
      },
      queue: {
        status: queueHealthy ? 'healthy' : 'down',
        waiting: Math.floor(Math.random() * 5),
        active: Math.floor(Math.random() * 3),
        failed: Math.floor(Math.random() * 2)
      }
    }
  }
}

// Mock webhook statistics
const generateWebhookStats = (hours: number) => {
  const channels = [
    'Trendyol', 'Ozan', 'Migros', 'Daraz PK', 'Daraz BD', 'Allegro', 'Ozon'
  ]
  
  return {
    byChannel: channels.map(channel => {
      const received = Math.floor(100 + Math.random() * 500)
      const fulfilled = received - Math.floor(Math.random() * 10)
      const failed = Math.floor(Math.random() * 3)
      const duplicate = Math.floor(Math.random() * 2)
      const blocked = Math.floor(Math.random() * 1)
      
      return {
        channelName: channel,
        received,
        fulfilled,
        failed,
        duplicate,
        blocked
      }
    })
  }
}

// Mock queue status
const generateQueueStatus = () => {
  return {
    waiting: Math.floor(Math.random() * 10),
    active: Math.floor(Math.random() * 5),
    failed: Math.floor(Math.random() * 3),
    delayed: Math.floor(Math.random() * 2),
    completed: Math.floor(Math.random() * 1000),
    total: Math.floor(Math.random() * 1200)
  }
}

// Simple auth middleware with role checking (optional for public health endpoint)
const authMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user with role (in real app this would verify JWT)
  const userRole = token.includes('admin') ? 'ADMIN' : 'ADMIN';
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  (req as any).user = { id: '1', role: userRole };
  next();
};

// Zod schemas
const webhookStatsQuerySchema = z.object({
  hours: z.string().transform(Number).pipe(z.number().min(1).max(168)).default('24')
});

// GET /system/health - Public health check (no auth required)
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthData = generateHealthData()
    
    // Set appropriate status code
    const statusCode = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503
    
    res.status(statusCode).json(healthData);
    
  } catch (error) {
    logger.error('Error in health check:', error);
    res.status(500).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// GET /system/health/details - Detailed health check (auth required)
router.get('/health/details', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const healthData = generateHealthData()
    
    // Add more detailed information for authenticated users
    const detailedHealth = {
      ...healthData,
      details: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        lastRestart: new Date(Date.now() - process.uptime() * 1000).toISOString()
      }
    };
    
    res.json(detailedHealth);
    
  } catch (error) {
    logger.error('Error in detailed health check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /system/webhook-stats - Webhook statistics
router.get('/webhook-stats', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = webhookStatsQuerySchema.parse(req.query);
    const { hours } = validatedQuery;
    
    const stats = generateWebhookStats(hours);
    
    res.json(stats);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error getting webhook stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /system/queue-status - Queue status
router.get('/queue-status', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const queueStatus = generateQueueStatus()
    
    res.json(queueStatus);
    
  } catch (error) {
    logger.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /system/queue/retry-failed - Retry failed jobs
router.post('/queue/retry-failed', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    // Mock retry failed jobs logic
    const retriedCount = Math.floor(Math.random() * 5) + 1;
    
    logger.info('Failed jobs retried', { retriedCount, userId: (req as any).user.id });
    
    res.json({
      message: 'Failed jobs retried successfully',
      retriedCount
    });
    
  } catch (error) {
    logger.error('Error retrying failed jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /system/metrics - System metrics (for monitoring)
router.get('/metrics', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    res.json(metrics);
    
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /system/test-email - Test email configuration
router.post('/test-email', authMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Mock email test
    logger.info('Test email sent', { to, userId: (req as any).user.id });
    
    res.json({
      message: 'Test email sent successfully',
      to,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as systemHealthRouter }
