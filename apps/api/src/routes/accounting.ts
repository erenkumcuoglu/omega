import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock data for accounting (in real app this would come from database)
const mockOrders = [
  {
    orderedAt: "28.03.2026 14:30:15",
    channel: "Trendyol",
    provider: "Coda",
    customerName: "Ahmet Yılmaz",
    productName: "PUBG Mobile 60 UC",
    sellingPrice: 100.00,
    commissionPct: 15.0,
    purchasePrice: 80.00,
    marginPct: 14.0,
    orderId: "TRD123456"
  },
  {
    orderedAt: "27.03.2026 16:25:42",
    channel: "Ozan",
    provider: "Epin",
    customerName: "Mehmet Kaya",
    productName: "Valorant 950 RP",
    sellingPrice: 150.00,
    commissionPct: 8.0,
    purchasePrice: 120.00,
    marginPct: 12.0,
    orderId: "OZN789012"
  },
  {
    orderedAt: "26.03.2026 10:15:30",
    channel: "Migros",
    provider: "Martı",
    customerName: "Ayşe Demir",
    productName: "Martı 25 TL",
    sellingPrice: 25.00,
    commissionPct: 10.0,
    purchasePrice: 20.00,
    marginPct: 8.0,
    orderId: "MGR345678"
  },
  {
    orderedAt: "25.03.2026 09:45:18",
    channel: "Daraz PK",
    provider: "Coda",
    customerName: "Ali Öztürk",
    productName: "Free Fire 1000 Diamonds",
    sellingPrice: 80.00,
    commissionPct: 12.0,
    purchasePrice: 65.00,
    marginPct: 10.0,
    orderId: "DRZ901234"
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
                  token.includes('accounting') ? 'ACCOUNTING' : 'ADMIN';
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  (req as any).user = { id: '1', role: userRole };
  next();
};

// Zod schemas
const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

const ordersQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  providerId: z.string().optional(),
  channelId: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('50')
});

// Helper functions for financial calculations
const calculateProviderNet = (purchasePrice: number, marginPct: number) => {
  return purchasePrice - (purchasePrice * marginPct / 100);
};

const calculateCommission = (sellingPrice: number, commissionPct: number) => {
  return sellingPrice * commissionPct / 100;
};

const calculateChannelReceivable = (sellingPrice: number, commissionAmount: number) => {
  return sellingPrice - commissionAmount;
};

const calculateProfit = (sellingPrice: number, providerNet: number, commissionAmount: number) => {
  return sellingPrice - providerNet - commissionAmount;
};

// GET /accounting/provider-summary - Provider reconciliation summary
router.get('/provider-summary', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    // Filter orders by month (mock implementation)
    const monthOrders = mockOrders.filter(order => {
      // In real app, this would parse the date and filter by month
      return true; // Mock: return all orders
    });
    
    // Group by provider
    const providerSummary = monthOrders.reduce((acc: any, order) => {
      const providerName = order.provider;
      const providerNet = calculateProviderNet(order.purchasePrice, order.marginPct);
      
      if (!acc[providerName]) {
        acc[providerName] = {
          providerId: providerName.toLowerCase().replace(/\s+/g, '-'),
          providerName,
          codesPulled: 0,
          payable: 0
        };
      }
      
      acc[providerName].codesPulled += 1;
      acc[providerName].payable += providerNet;
      
      return acc;
    }, {});
    
    const totalCodesPulled = monthOrders.length;
    const totalPayable = Object.values(providerSummary).reduce((sum: number, provider: any) => sum + provider.payable, 0);
    
    res.json({
      month,
      totalCodesPulled,
      totalPayable: Math.round(totalPayable * 100) / 100,
      byProvider: Object.values(providerSummary)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in provider summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /accounting/channel-summary - Channel receivables summary
router.get('/channel-summary', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    // Filter orders by month (mock implementation)
    const monthOrders = mockOrders.filter(order => {
      return true; // Mock: return all orders
    });
    
    // Group by channel
    const channelSummary = monthOrders.reduce((acc: any, order) => {
      const channelName = order.channel;
      const commissionAmount = calculateCommission(order.sellingPrice, order.commissionPct);
      const receivable = calculateChannelReceivable(order.sellingPrice, commissionAmount);
      
      if (!acc[channelName]) {
        acc[channelName] = {
          channelName,
          receivable: 0
        };
      }
      
      acc[channelName].receivable += receivable;
      
      return acc;
    }, {});
    
    const totalReceivable = Object.values(channelSummary).reduce((sum: number, channel: any) => sum + channel.receivable, 0);
    
    res.json({
      month,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
      byChannel: Object.values(channelSummary)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in channel summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /accounting/orders - Raw order details
router.get('/orders', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = ordersQuerySchema.parse(req.query);
    
    let filteredOrders = [...mockOrders];
    
    // Filter by month
    // In real app, this would parse dates and filter by month
    // Mock: return all orders
    
    // Filter by provider
    if (validatedQuery.providerId) {
      filteredOrders = filteredOrders.filter(order => 
        order.provider.toLowerCase().includes(validatedQuery.providerId!.toLowerCase())
      );
    }
    
    // Filter by channel
    if (validatedQuery.channelId) {
      filteredOrders = filteredOrders.filter(order => 
        order.channel.toLowerCase().includes(validatedQuery.channelId!.toLowerCase())
      );
    }
    
    // Sort by date descending
    filteredOrders.sort((a, b) => {
      // In real app, this would properly parse Turkish dates
      return b.orderedAt.localeCompare(a.orderedAt);
    });
    
    // Pagination
    const page = validatedQuery.page;
    const limit = validatedQuery.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    // Calculate financial metrics for each order
    const ordersWithCalculations = paginatedOrders.map(order => {
      const providerNet = calculateProviderNet(order.purchasePrice, order.marginPct);
      const commissionAmount = calculateCommission(order.sellingPrice, order.commissionPct);
      const profit = calculateProfit(order.sellingPrice, providerNet, commissionAmount);
      
      return {
        orderedAt: order.orderedAt,
        channel: order.channel,
        provider: order.provider,
        customerName: order.customerName,
        productName: order.productName,
        sellingPrice: order.sellingPrice,
        commissionPct: order.commissionPct,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        providerNet: Math.round(providerNet * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        orderId: order.orderId,
        paymentDate: null // Mock: no payment date
      };
    });
    
    res.json({
      orders: ordersWithCalculations,
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
    
    logger.error('Error in accounting orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /accounting/profit-summary - Profit summary with trends
router.get('/profit-summary', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    // Calculate current month profit (mock implementation)
    const currentMonthOrders = mockOrders.filter(order => true); // Mock: all orders
    
    const totalRevenue = currentMonthOrders.reduce((sum, order) => sum + order.sellingPrice, 0);
    const totalPayable = currentMonthOrders.reduce((sum, order) => {
      return sum + calculateProviderNet(order.purchasePrice, order.marginPct);
    }, 0);
    const totalCommissions = currentMonthOrders.reduce((sum, order) => {
      return sum + calculateCommission(order.sellingPrice, order.commissionPct);
    }, 0);
    const totalProfit = currentMonthOrders.reduce((sum, order) => {
      const providerNet = calculateProviderNet(order.purchasePrice, order.marginPct);
      const commissionAmount = calculateCommission(order.sellingPrice, order.commissionPct);
      return sum + calculateProfit(order.sellingPrice, providerNet, commissionAmount);
    }, 0);
    
    // Mock trend data for last 3 months
    const byMonth = [
      { month: "2024-07", profit: 580000.00 },
      { month: "2024-08", profit: 610000.00 },
      { month: "2024-09", profit: Math.round(totalProfit * 100) / 100 }
    ];
    
    res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      byMonth
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in profit summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as accountingRouter }
