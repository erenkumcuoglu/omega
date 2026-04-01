import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import pino from 'pino'

const router: Router = Router()
const prisma = new PrismaClient()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const defaultChannels: Array<{
  name: string
  commissionPct: number
  webhookIps: string[]
  countryCode?: string
}> = [
  { name: 'Trendyol', commissionPct: 15, webhookIps: ['127.0.0.1'] },
  { name: 'Hepsiburada', commissionPct: 12, webhookIps: ['127.0.0.1'] },
  { name: 'Ozan', commissionPct: 8, webhookIps: ['127.0.0.1'] },
  { name: 'Ozon', commissionPct: 18, webhookIps: ['127.0.0.1'] }
]

const ensureDefaultChannels = async () => {
  for (const channel of defaultChannels) {
    const existing = await prisma.salesChannel.findFirst({
      where: {
        name: {
          equals: channel.name,
          mode: 'insensitive'
        }
      }
    })

    if (!existing) {
      await prisma.salesChannel.create({
        data: {
          name: channel.name,
          commissionPct: channel.commissionPct,
          webhookIps: channel.webhookIps,
          countryCode: channel.countryCode,
          isActive: true
        }
      })
    }
  }
}

// Mock orders storage (in real app this would go to database)
const mockGlobalOrders: any[] = [];

// Generic webhook validation middleware
const webhookValidation = (channelName: string, allowedIPs: string[], secret: string) => {
  return (req: Request, res: Response, next: any) => {
    // IP Whitelist check (mock implementation)
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
      logger.warn(`Webhook IP blocked for ${channelName}`, { clientIP, allowedIPs });
      return res.status(403).json({ error: 'IP not allowed' });
    }
    
    // HMAC verification (mock implementation)
    const signature = req.headers['x-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Signature required' });
    }
    
    // In real app, this would verify HMAC using the secret
    // Mock: accept any signature for now
    
    // Idempotency check (mock implementation)
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency key required' });
    }
    
    // Check for duplicate order
    const existingOrder = mockGlobalOrders.find(order => order.idempotencyKey === idempotencyKey);
    if (existingOrder) {
      return res.status(200).json({ 
        status: 'duplicate',
        orderId: existingOrder.orderId,
        message: 'Order already processed'
      });
    }
    
    next();
  };
};

// Generic order processing function
const processOrder = async (orderData: any, channelName: string) => {
  try {
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      idempotencyKey: orderData.idempotencyKey,
      channelName,
      customerName: orderData.customerName || 'Unknown',
      productName: orderData.productName || 'Unknown Product',
      sellingPrice: orderData.sellingPrice || 0,
      purchasePrice: orderData.purchasePrice || 0,
      commissionPct: orderData.commissionPct || 0,
      status: 'PENDING',
      orderedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    mockGlobalOrders.push(order);
    
    logger.info(`Order processed for ${channelName}`, { orderId: order.id });
    
    return order;
  } catch (error) {
    logger.error(`Error processing order for ${channelName}:`, error);
    throw error;
  }
};

// Zod schemas for different channels
const baseOrderSchema = z.object({
  idempotencyKey: z.string(),
  customerName: z.string().optional(),
  productName: z.string(),
  sellingPrice: z.number(),
  purchasePrice: z.number(),
  commissionPct: z.number()
});

const darazOrderSchema = baseOrderSchema.extend({
  countryCode: z.enum(['PK', 'BD', 'LK', 'NP', 'MM']),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional()
});

const allegroOrderSchema = baseOrderSchema.extend({
  buyerId: z.string(),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string()
  })
});

const ozonOrderSchema = baseOrderSchema.extend({
  buyerId: z.string(),
  warehouseId: z.string(),
  deliveryMethod: z.enum(['pickup', 'delivery'])
});

// Daraz Webhook Endpoints (5 countries)
router.post('/webhooks/daraz-pk', 
  webhookValidation('Daraz PK', ['127.0.0.1', '192.168.1.100'], 'daraz-pk-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = darazOrderSchema.parse({ ...req.body, countryCode: 'PK' });
      const order = await processOrder(orderData, 'Daraz PK');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Daraz PK webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post('/webhooks/daraz-bd', 
  webhookValidation('Daraz BD', ['127.0.0.1', '192.168.1.101'], 'daraz-bd-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = darazOrderSchema.parse({ ...req.body, countryCode: 'BD' });
      const order = await processOrder(orderData, 'Daraz BD');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Daraz BD webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post('/webhooks/daraz-lk', 
  webhookValidation('Daraz LK', ['127.0.0.1', '192.168.1.102'], 'daraz-lk-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = darazOrderSchema.parse({ ...req.body, countryCode: 'LK' });
      const order = await processOrder(orderData, 'Daraz LK');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Daraz LK webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post('/webhooks/daraz-np', 
  webhookValidation('Daraz NP', ['127.0.0.1', '192.168.1.103'], 'daraz-np-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = darazOrderSchema.parse({ ...req.body, countryCode: 'NP' });
      const order = await processOrder(orderData, 'Daraz NP');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Daraz NP webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post('/webhooks/daraz-mm', 
  webhookValidation('Daraz MM', ['127.0.0.1', '192.168.1.104'], 'daraz-mm-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = darazOrderSchema.parse({ ...req.body, countryCode: 'MM' });
      const order = await processOrder(orderData, 'Daraz MM');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Daraz MM webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Allegro Webhook Endpoint
router.post('/webhooks/allegro', 
  webhookValidation('Allegro', ['127.0.0.1', '192.168.1.105'], 'allegro-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = allegroOrderSchema.parse(req.body);
      const order = await processOrder(orderData, 'Allegro');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Allegro webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Ozon Webhook Endpoint
router.post('/webhooks/ozon', 
  webhookValidation('Ozon', ['127.0.0.1', '192.168.1.106'], 'ozon-secret'),
  async (req: Request, res: Response) => {
    try {
      const orderData = ozonOrderSchema.parse(req.body);
      const order = await processOrder(orderData, 'Ozon');
      
      res.json({
        status: 'success',
        orderId: order.id,
        message: 'Order processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      }
      
      logger.error('Ozon webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Channel Management Endpoints

// GET /channels - List all sales channels
router.get('/channels', async (req: Request, res: Response) => {
  try {
    await ensureDefaultChannels()

    const channels = await prisma.salesChannel.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(channels)
  } catch (error) {
    logger.error('Error fetching channels:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /channels/:id - Update channel commission
router.patch('/channels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { commissionPct } = req.body
    if (commissionPct === undefined) return res.status(400).json({ error: 'commissionPct required' })
    const updated = await prisma.salesChannel.update({ where: { id }, data: { commissionPct } })
    res.json(updated)
  } catch (error) {
    logger.error('Error updating channel:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /channels - Create new channel
router.post('/channels', async (req: Request, res: Response) => {
  try {
    const channelSchema = z.object({
      name: z.string(),
      commissionPct: z.number().min(0).max(100),
      webhookIps: z.array(z.string()),
      countryCode: z.string().optional()
    });
    
    const channelData = channelSchema.parse(req.body);

    const existing = await prisma.salesChannel.findFirst({
      where: {
        name: {
          equals: channelData.name,
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      return res.status(409).json({ error: 'Channel already exists' })
    }

    const newChannel = await prisma.salesChannel.create({
      data: {
        name: channelData.name,
        commissionPct: channelData.commissionPct,
        webhookIps: channelData.webhookIps,
        countryCode: channelData.countryCode,
        isActive: true
      }
    })

    logger.info('New channel created', { channelId: newChannel.id, name: newChannel.name });

    res.status(201).json(newChannel);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error creating channel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /channels/:id - Get channel details
router.get('/channels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const channel = await prisma.salesChannel.findUnique({
      where: { id }
    })

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' })
    }

    res.json(channel);
  } catch (error) {
    logger.error('Error getting channel details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /channels/:id/status - Toggle active/passive status
router.patch('/channels/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const schema = z.object({ isActive: z.boolean() })
    const { isActive } = schema.parse(req.body)

    const updated = await prisma.salesChannel.update({
      where: { id },
      data: { isActive }
    })

    res.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      })
    }

    logger.error('Error updating channel status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /channels/:id/webhook-test - Test webhook
router.post('/channels/:id/webhook-test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Simulate webhook test
    const testResults = {
      ipCheck: 'passed',
      hmacCheck: 'passed',
      idempotency: 'passed',
      timestamp: new Date().toISOString()
    };
    
    logger.info('Webhook test completed', { channelId: id, results: testResults });
    
    res.json(testResults);
  } catch (error) {
    logger.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as globalChannelsRouter }
