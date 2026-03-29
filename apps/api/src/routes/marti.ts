import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock Martı stock data
const mockMartiStock = {
  "25": 324,
  "50": 252, 
  "100": 77
};

// Mock Martı orders data
const mockMartiOrders = [
  {
    orderedAt: "28.03.2026 14:30:15",
    denomination: "25 TL",
    transactionId: "TXN123456",
    merchantId: "MERCHANT789",
    martiCode: "MARTI25ABC123",
    status: "Başarılı"
  },
  {
    orderedAt: "28.03.2026 14:25:42", 
    denomination: "50 TL",
    transactionId: "TXN123457",
    merchantId: "MERCHANT790",
    martiCode: "MARTI50XYZ789",
    status: "Başarılı"
  },
  {
    orderedAt: "28.03.2026 14:20:18",
    denomination: "100 TL", 
    transactionId: "TXN123458",
    merchantId: "MERCHANT791",
    martiCode: "MARTI100DEF456",
    status: "Başarısız"
  }
];

// Mock Martı summary data
const mockMartiSummary = {
  total: 200,
  byDenomination: {
    "25": 100,
    "50": 50,
    "100": 50
  }
};

// Simple auth middleware
const mockAuth = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  (req as any).user = { id: '1', role: 'ADMIN' };
  next();
};

// Zod schemas for validation
const ordersQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  denomination: z.enum(['25', '50', '100']).optional(),
  status: z.enum(['Başarılı', 'Başarısız']).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10')
});

const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

// GET /marti/stock-summary - Stock summary by denomination
router.get('/stock-summary', mockAuth, async (req: Request, res: Response) => {
  try {
    logger.info('Getting Martı stock summary');
    
    res.json(mockMartiStock);
  } catch (error) {
    logger.error('Error getting Martı stock summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /marti/orders - Martı orders list
router.get('/orders', mockAuth, async (req: Request, res: Response) => {
  try {
    const validatedQuery = ordersQuerySchema.parse(req.query);
    
    let filteredOrders = [...mockMartiOrders];
    
    // Filter by month if provided
    if (validatedQuery.month) {
      const [year, month] = validatedQuery.month.split('-');
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.orderedAt.split(' ')[0].split('.').reverse().join('-'));
        return orderDate.getFullYear() === parseInt(year) && 
               (orderDate.getMonth() + 1) === parseInt(month);
      });
    }
    
    // Filter by denomination if provided
    if (validatedQuery.denomination) {
      filteredOrders = filteredOrders.filter(order => 
        order.denomination === `${validatedQuery.denomination} TL`
      );
    }
    
    // Filter by status if provided
    if (validatedQuery.status) {
      filteredOrders = filteredOrders.filter(order => order.status === validatedQuery.status);
    }
    
    // Pagination
    const page = validatedQuery.page;
    const limit = validatedQuery.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    res.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        pages: Math.ceil(filteredOrders.length / limit)
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error getting Martı orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /marti/summary - Monthly summary
router.get('/summary', mockAuth, async (req: Request, res: Response) => {
  try {
    const validatedQuery = summaryQuerySchema.parse(req.query);
    
    // In a real app, this would filter by month
    // For mock, we'll return the same data regardless of month
    logger.info('Getting Martı summary for month:', validatedQuery.month);
    
    res.json(mockMartiSummary);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error getting Martı summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as martiRouter }
