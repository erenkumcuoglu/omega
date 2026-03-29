import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock Ozan summary data
const mockOzanSummary = {
  totalCodes: 200,
  byProduct: [
    { productName: "PUBG Mobile", count: 100 },
    { productName: "Valorant", count: 50 },
    { productName: "Free Fire", count: 50 }
  ]
};

// Mock Ozan orders data
const mockOzanOrders = [
  {
    orderedAt: "28.03.2026 14:30:15",
    provider: "Coda",
    productName: "PUBG Mobile",
    sellingPrice: 100,
    commissionPct: 8,
    commissionAmount: 8,
    orderTotal: 108,
    status: "Başarılı",
    orderId: "OZN123456"
  },
  {
    orderedAt: "28.03.2026 14:25:42",
    provider: "Epin", 
    productName: "Valorant",
    sellingPrice: 150,
    commissionPct: 8,
    commissionAmount: 12,
    orderTotal: 162,
    status: "Başarılı",
    orderId: "OZN123457"
  },
  {
    orderedAt: "28.03.2026 14:20:18",
    provider: "Coda",
    productName: "Free Fire", 
    sellingPrice: 80,
    commissionPct: 8,
    commissionAmount: 6.4,
    orderTotal: 86.4,
    status: "Başarısız",
    orderId: "OZN123458"
  },
  {
    orderedAt: "27.03.2026 16:15:30",
    provider: "Epin",
    productName: "PUBG Mobile",
    sellingPrice: 100,
    commissionPct: 8,
    commissionAmount: 8,
    orderTotal: 108,
    status: "Başarılı",
    orderId: "OZN123459"
  }
];

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
const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

const ordersQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10')
});

// Helper function to parse Turkish date format
const parseTurkishDate = (dateStr: string) => {
  const [datePart, timePart] = dateStr.split(' ');
  const [day, month, year] = datePart.split('.').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
};

// Helper function to get week of month
const getWeekOfMonth = (date: Date) => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start
  const firstMonday = new Date(firstDayOfMonth);
  firstMonday.setDate(firstDayOfMonth.getDate() + (7 - offset) % 7);
  
  if (date < firstMonday) return 1;
  
  const weekNumber = Math.ceil((date.getDate() - firstMonday.getDate() + 1) / 7) + 1;
  return weekNumber;
};

// GET /ozan/summary - Monthly summary by product
router.get('/summary', mockAuth, async (req: Request, res: Response) => {
  try {
    const validatedQuery = summaryQuerySchema.parse(req.query);
    
    // In a real app, this would filter by month
    // For mock, we'll return the same data regardless of month
    logger.info('Getting Ozan summary for month:', validatedQuery.month);
    
    res.json(mockOzanSummary);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error getting Ozan summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /ozan/orders - Ozan orders list
router.get('/orders', mockAuth, async (req: Request, res: Response) => {
  try {
    const validatedQuery = ordersQuerySchema.parse(req.query);
    
    let filteredOrders = [...mockOzanOrders];
    
    // Filter by month if provided
    if (validatedQuery.month) {
      const [year, month] = validatedQuery.month.split('-').map(Number);
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = parseTurkishDate(order.orderedAt);
        return orderDate.getFullYear() === year && 
               (orderDate.getMonth() + 1) === month;
      });
    }
    
    // Sort by date descending (newest first)
    filteredOrders.sort((a, b) => {
      const dateA = parseTurkishDate(a.orderedAt);
      const dateB = parseTurkishDate(b.orderedAt);
      return dateB.getTime() - dateA.getTime();
    });
    
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
    
    logger.error('Error getting Ozan orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as ozanRouter }
