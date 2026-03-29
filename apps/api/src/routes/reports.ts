import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock data for reports (in real app this would come from database with aggregate queries)
const generateMockRevenueData = (months: number) => {
  const data = []
  const currentDate = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
    const month = date.toISOString().slice(0, 7)
    
    const revenue = 400000 + Math.random() * 200000
    const cost = revenue * (0.5 + Math.random() * 0.2)
    const profit = revenue - cost
    const orderCount = Math.floor(3000 + Math.random() * 2000)
    
    data.push({
      month,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      orderCount
    })
  }
  
  return data
}

const generateMockChannelData = (month: string) => {
  const channels = [
    'Trendyol', 'Ozan', 'Migros', 'Daraz PK', 'Daraz BD', 'Allegro', 'Ozon'
  ]
  
  return channels.map(channel => {
    const orderCount = Math.floor(500 + Math.random() * 2500)
    const revenue = orderCount * (50 + Math.random() * 100)
    const commissionPct = 8 + Math.random() * 12
    const commissionPaid = revenue * commissionPct / 100
    const netReceivable = revenue - commissionPaid
    const cost = revenue * (0.4 + Math.random() * 0.2)
    const profit = netReceivable - cost
    const profitMarginPct = (profit / netReceivable) * 100
    
    return {
      channelName: channel,
      orderCount,
      revenue: Math.round(revenue * 100) / 100,
      commissionPaid: Math.round(commissionPaid * 100) / 100,
      netReceivable: Math.round(netReceivable * 100) / 100,
      profitMarginPct: Math.round(profitMarginPct * 100) / 100,
      avgOrderValue: Math.round((revenue / orderCount) * 100) / 100
    }
  }).sort((a, b) => b.netReceivable - a.netReceivable)
}

const generateMockProviderData = (month: string) => {
  const providers = [
    { name: 'Coda', topProducts: ['PUBGMTR60', 'VALOR950', 'FREEF1000'] },
    { name: 'Epin', topProducts: ['PUBGMTR60', 'VALOR950', 'FREEF500'] },
    { name: 'Martı', topProducts: ['MARTI25', 'MARTI50', 'MARTI100'] }
  ]
  
  return providers.map(provider => {
    const codesPulled = Math.floor(1000 + Math.random() * 3000)
    const totalCost = codesPulled * (5 + Math.random() * 3)
    const avgCostPerCode = totalCost / codesPulled
    
    const topProducts = provider.topProducts.map(sku => ({
      sku,
      count: Math.floor(codesPulled / 3 + Math.random() * 500),
      cost: Math.round((codesPulled / 3) * (5 + Math.random() * 3) * 100) / 100
    }))
    
    return {
      providerName: provider.name,
      codesPulled,
      totalCost: Math.round(totalCost * 100) / 100,
      avgCostPerCode: Math.round(avgCostPerCode * 100) / 100,
      topProducts
    }
  })
}

const generateMockProductData = (month: string) => {
  const products = [
    { sku: 'PUBGMTR60', name: 'PUBG Mobile 60 UC' },
    { sku: 'VALOR950', name: 'Valorant 950 RP' },
    { sku: 'FREEF1000', name: 'Free Fire 1000 Diamonds' },
    { sku: 'MARTI25', name: 'Martı 25 TL' },
    { sku: 'MARTI50', name: 'Martı 50 TL' },
    { sku: 'MARTI100', name: 'Martı 100 TL' }
  ]
  
  const channels = ['Trendyol', 'Ozan', 'Migros', 'Daraz PK']
  
  return products.map(product => {
    const totalSold = Math.floor(500 + Math.random() * 1500)
    const revenue = totalSold * (50 + Math.random() * 100)
    const cost = revenue * (0.4 + Math.random() * 0.2)
    const profit = revenue - cost
    const profitMarginPct = (profit / revenue) * 100
    
    const byChannel = channels.map(channel => ({
      channelName: channel,
      count: Math.floor(totalSold / channels.length + Math.random() * 200)
    }))
    
    return {
      sku: product.sku,
      productName: product.name,
      totalSold,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMarginPct: Math.round(profitMarginPct * 100) / 100,
      byChannel
    }
  }).sort((a, b) => b.totalSold - a.totalSold)
}

const generateMockHourlyData = (month: string) => {
  const data = []
  
  for (let hour = 0; hour < 24; hour++) {
    let avgOrders = 10
    
    // Peak hours: 10-12, 14-16, 20-22
    if ((hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 16) || (hour >= 20 && hour <= 22)) {
      avgOrders = 30 + Math.floor(Math.random() * 20)
    } else if (hour >= 0 && hour <= 6) {
      avgOrders = 2 + Math.floor(Math.random() * 5)
    } else {
      avgOrders = 8 + Math.floor(Math.random() * 10)
    }
    
    data.push({
      hour,
      avgOrders
    })
  }
  
  return data
}

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
const monthsQuerySchema = z.object({
  months: z.string().transform(Number).pipe(z.number().min(1).max(24)).default('6')
});

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

const productQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  providerId: z.string().optional(),
  channelId: z.string().optional()
});

const hourlyQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  channelId: z.string().optional()
});

const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  month: z.string().optional(),
  providerId: z.string().optional(),
  channelId: z.string().optional()
});

// GET /reports/revenue-trend - Monthly revenue trend
router.get('/revenue-trend', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthsQuerySchema.parse(req.query);
    const { months } = validatedQuery;
    
    const data = generateMockRevenueData(months);
    
    res.json({ data });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in revenue trend report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/channel-performance - Channel performance comparison
router.get('/channel-performance', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    const data = generateMockChannelData(month);
    
    res.json({ data });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in channel performance report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/provider-cost - Provider cost analysis
router.get('/provider-cost', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = monthQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    const data = generateMockProviderData(month);
    
    res.json({ data });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in provider cost report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/product-performance - Product performance analysis
router.get('/product-performance', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = productQuerySchema.parse(req.query);
    
    const data = generateMockProductData(validatedQuery.month);
    
    // Filter by provider if specified
    let filteredData = data;
    if (validatedQuery.providerId) {
      // Mock filtering by provider
      filteredData = data.filter(product => 
        product.sku.includes('PUBG') && validatedQuery.providerId === 'coda' ||
        product.sku.includes('VALOR') && validatedQuery.providerId === 'epin' ||
        product.sku.includes('MARTI') && validatedQuery.providerId === 'marti'
      );
    }
    
    // Filter by channel if specified
    if (validatedQuery.channelId) {
      filteredData = filteredData.map(product => ({
        ...product,
        byChannel: product.byChannel.filter(channel => 
          channel.channelName.toLowerCase().includes(validatedQuery.channelId!.toLowerCase())
        )
      }));
    }
    
    res.json({ data: filteredData });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in product performance report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/hourly-distribution - Hourly order distribution
router.get('/hourly-distribution', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = hourlyQuerySchema.parse(req.query);
    const { month } = validatedQuery;
    
    const data = generateMockHourlyData(month);
    
    res.json({ data });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in hourly distribution report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /reports/:reportType/export - Export reports
router.get('/:reportType/export', authMiddleware(['ADMIN', 'ACCOUNTING']), async (req: Request, res: Response) => {
  try {
    const { reportType } = req.params;
    const validatedQuery = exportQuerySchema.parse(req.query);
    const { format } = validatedQuery;
    
    // Validate report type
    const validReportTypes = ['revenue-trend', 'channel-performance', 'provider-cost', 'product-performance', 'hourly-distribution'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // Mock export generation
    const filename = `${reportType}-${validatedQuery.month || '2024-09'}.${format}`;
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      // Mock Excel data (in real app, use xlsx library)
      res.send('Mock Excel data for ' + reportType);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      // Mock PDF data (in real app, use puppeteer or pdfkit)
      res.send('Mock PDF data for ' + reportType);
    }
    
    logger.info(`Report exported: ${reportType} as ${format}`);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error in report export:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as reportsRouter }
