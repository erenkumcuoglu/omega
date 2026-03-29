import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock data for excess codes (in real app this would come from database)
let mockExcessCodes = [
  {
    id: '1',
    productId: 'prod1',
    channelId: 'chan1',
    digitalCode: 'PUBGMTR60-ABC123-XYZ789',
    providerOrderNo: 'PROV123456',
    reason: 'FULFILLMENT_FAILED',
    status: 'PENDING',
    resolvedAt: null,
    resolvedBy: null,
    createdAt: new Date('2024-09-25T14:30:00Z').toISOString(),
    product: {
      id: 'prod1',
      name: 'PUBG Mobile 60 UC',
      sku: 'PUBGMTR60'
    },
    channel: {
      id: 'chan1',
      name: 'Trendyol'
    }
  },
  {
    id: '2',
    productId: 'prod2',
    channelId: 'chan2',
    digitalCode: 'VALOR950-DEF456-UVW012',
    providerOrderNo: 'PROV789012',
    reason: 'ORDER_CANCELLED',
    status: 'SENT_TO_CUSTOMER',
    resolvedAt: new Date('2024-09-26T10:15:00Z').toISOString(),
    resolvedBy: 'user1',
    createdAt: new Date('2024-09-24T16:45:00Z').toISOString(),
    product: {
      id: 'prod2',
      name: 'Valorant 950 RP',
      sku: 'VALOR950'
    },
    channel: {
      id: 'chan2',
      name: 'Ozan'
    }
  },
  {
    id: '3',
    productId: 'prod3',
    channelId: null,
    digitalCode: 'MARTI25-GHI789-RST345',
    providerOrderNo: 'PROV345678',
    reason: 'FULFILLMENT_FAILED',
    status: 'WRITTEN_OFF',
    resolvedAt: new Date('2024-09-23T09:30:00Z').toISOString(),
    resolvedBy: 'user1',
    createdAt: new Date('2024-09-22T11:20:00Z').toISOString(),
    product: {
      id: 'prod3',
      name: 'Martı 25 TL',
      sku: 'MARTI25'
    },
    channel: null
  }
];

// Mock orders (in real app this would come from database)
let mockOrders = [
  {
    id: 'order1',
    idempotencyKey: 'TRD123456',
    channelId: 'chan1',
    providerId: 'prov1',
    productId: 'prod1',
    customerName: 'Ahmet Yılmaz',
    status: 'PENDING',
    externalId: 'TRD123456',
    createdAt: new Date('2024-09-27T10:30:00Z').toISOString()
  },
  {
    id: 'order2',
    idempotencyKey: 'OZN789012',
    channelId: 'chan2',
    providerId: 'prov1',
    productId: 'prod2',
    customerName: 'Mehmet Kaya',
    status: 'PENDING',
    externalId: 'OZN789012',
    createdAt: new Date('2024-09-26T14:15:00Z').toISOString()
  }
];

// Simple auth middleware with role checking
const authMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user with role (in real app this would verify JWT)
  const userRole = token.includes('admin') ? 'ADMIN' : 
                  token.includes('ops') ? 'OPERATIONS' : 'ADMIN';
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  (req as any).user = { id: '1', role: userRole };
  next();
};

// Zod schemas
const excessCodesQuerySchema = z.object({
  status: z.enum(['PENDING', 'SENT_TO_CUSTOMER', 'RETURNED_TO_PROVIDER', 'WRITTEN_OFF']).optional(),
  productId: z.string().optional(),
  channelId: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20')
});

const sendToCustomerSchema = z.object({
  orderId: z.string()
});

const writeOffSchema = z.object({
  reason: z.string().min(1, 'Reason is required')
});

// GET /excess-codes - List excess codes
router.get('/', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = excessCodesQuerySchema.parse(req.query);
    const { status, productId, channelId, page, limit } = validatedQuery;
    
    // Filter excess codes
    let filteredCodes = [...mockExcessCodes];
    
    if (status) {
      filteredCodes = filteredCodes.filter(code => code.status === status);
    }
    
    if (productId) {
      filteredCodes = filteredCodes.filter(code => code.productId === productId);
    }
    
    if (channelId) {
      filteredCodes = filteredCodes.filter(code => code.channelId === channelId);
    }
    
    // Sort by creation date (newest first)
    filteredCodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCodes = filteredCodes.slice(startIndex, endIndex);
    
    res.json({
      excessCodes: paginatedCodes,
      pagination: {
        page,
        limit,
        total: filteredCodes.length,
        pages: Math.ceil(filteredCodes.length / limit)
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error listing excess codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /excess-codes/summary - Get excess codes summary
router.get('/summary', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const summary = {
      pending: mockExcessCodes.filter(code => code.status === 'PENDING').length,
      sentToCustomer: mockExcessCodes.filter(code => code.status === 'SENT_TO_CUSTOMER').length,
      returnedToProvider: mockExcessCodes.filter(code => code.status === 'RETURNED_TO_PROVIDER').length,
      writtenOff: mockExcessCodes.filter(code => code.status === 'WRITTEN_OFF').length
    };
    
    res.json(summary);
    
  } catch (error) {
    logger.error('Error getting excess codes summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /excess-codes/:id/send - Send excess code to customer
router.post('/:id/send', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = sendToCustomerSchema.parse(req.body);
    const { orderId } = validatedData;
    
    // Find excess code
    const excessCodeIndex = mockExcessCodes.findIndex(code => code.id === id);
    if (excessCodeIndex === -1) {
      return res.status(404).json({ error: 'Excess code not found' });
    }
    
    const excessCode = mockExcessCodes[excessCodeIndex];
    
    // Check if already resolved
    if (excessCode.status !== 'PENDING') {
      return res.status(400).json({ error: 'Excess code already resolved' });
    }
    
    // Find order
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if order is pending
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not pending' });
    }
    
    // Check if order matches the excess code product
    if (order.productId !== excessCode.productId) {
      return res.status(400).json({ error: 'Order product does not match excess code' });
    }
    
    // Update excess code status
    mockExcessCodes[excessCodeIndex] = {
      ...excessCode,
      status: 'SENT_TO_CUSTOMER',
      resolvedAt: new Date().toISOString(),
      resolvedBy: (req as any).user.id
    };
    
    // Update order status
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      mockOrders[orderIndex] = {
        ...mockOrders[orderIndex],
        status: 'FULFILLED'
      };
    }
    
    // Log audit
    logger.info('Excess code sent to customer', { 
      excessCodeId: id, 
      orderId, 
      resolvedBy: (req as any).user.id 
    });
    
    res.json({
      message: 'Excess code sent to customer successfully',
      excessCode: mockExcessCodes[excessCodeIndex],
      order: mockOrders[orderIndex]
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error sending excess code to customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /excess-codes/:id/write-off - Write off excess code
router.post('/:id/write-off', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = writeOffSchema.parse(req.body);
    const { reason } = validatedData;
    
    // Find excess code
    const excessCodeIndex = mockExcessCodes.findIndex(code => code.id === id);
    if (excessCodeIndex === -1) {
      return res.status(404).json({ error: 'Excess code not found' });
    }
    
    const excessCode = mockExcessCodes[excessCodeIndex];
    
    // Check if already resolved
    if (excessCode.status !== 'PENDING') {
      return res.status(400).json({ error: 'Excess code already resolved' });
    }
    
    // Update excess code status
    mockExcessCodes[excessCodeIndex] = {
      ...excessCode,
      status: 'WRITTEN_OFF',
      resolvedAt: new Date().toISOString(),
      resolvedBy: (req as any).user.id,
      reason
    };
    
    // Log audit
    logger.info('Excess code written off', { 
      excessCodeId: id, 
      reason, 
      resolvedBy: (req as any).user.id 
    });
    
    res.json({
      message: 'Excess code written off successfully',
      excessCode: mockExcessCodes[excessCodeIndex]
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error writing off excess code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /excess-codes/simulate - Simulate excess code creation (for testing)
router.post('/simulate', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { productId, channelId, reason } = body;
    
    // Create simulated excess code
    const newExcessCode = {
      id: `excess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: productId || 'prod1',
      channelId: channelId || 'chan1',
      digitalCode: `SIMCODE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      providerOrderNo: `PROV${Date.now()}`,
      reason: reason || 'FULFILLMENT_FAILED',
      status: 'PENDING',
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date().toISOString(),
      product: {
        id: productId || 'prod1',
        name: 'Mock Product',
        sku: 'MOCK001'
      },
      channel: channelId ? {
        id: channelId,
        name: 'Mock Channel'
      } : null as any
    };
    
    mockExcessCodes.unshift(newExcessCode);
    
    // Create notification
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ORDER_FAILED',
      title: 'Sipariş Başarısız',
      message: `Fulfillment başarısız oldu. Fazlalık kod oluştu: ${newExcessCode.digitalCode}`,
      meta: { 
        excessCodeId: newExcessCode.id,
        productId: newExcessCode.productId,
        reason: newExcessCode.reason
      },
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString()
    };
    
    logger.info('Excess code simulated', { excessCodeId: newExcessCode.id, reason });
    
    res.status(201).json({
      message: 'Excess code simulated successfully',
      excessCode: newExcessCode,
      notification
    });
    
  } catch (error) {
    logger.error('Error simulating excess code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as excessCodesRouter }
