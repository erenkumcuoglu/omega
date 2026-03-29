import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock data for alerts and notifications (in real app this would come from database)
let mockAlerts = [
  {
    id: '1',
    productId: 'prod1',
    alertType: 'LOW_STOCK',
    threshold: 50,
    isActive: true,
    notifyEmail: ['admin@omega.com', 'ops@omega.com'],
    lastTriggeredAt: new Date('2024-09-20T10:30:00Z').toISOString(),
    createdAt: new Date().toISOString(),
    product: {
      id: 'prod1',
      name: 'PUBG Mobile 60 UC',
      sku: 'PUBGMTR60',
      stock: 25
    }
  },
  {
    id: '2',
    productId: 'prod2',
    alertType: 'OUT_OF_STOCK',
    threshold: null,
    isActive: true,
    notifyEmail: ['admin@omega.com'],
    lastTriggeredAt: new Date('2024-09-25T14:15:00Z').toISOString(),
    createdAt: new Date().toISOString(),
    product: {
      id: 'prod2',
      name: 'Valorant 950 RP',
      sku: 'VALOR950',
      stock: 0
    }
  }
];

let mockNotifications = [
  {
    id: '1',
    type: 'STOCK_ALERT',
    title: 'Stok Uyarısı: PUBG Mobile 60 UC',
    message: 'PUBG Mobile 60 UC ürününün stoğu 50 adedin altına düştü. Mevcut stok: 25 adet.',
    meta: { productId: 'prod1', stockLevel: 25, threshold: 50 },
    isRead: false,
    readAt: null,
    createdAt: new Date('2024-09-26T09:00:00Z').toISOString()
  },
  {
    id: '2',
    type: 'BALANCE_ALERT',
    title: 'Bakiye Uyarısı',
    message: 'Turkpin bakiyeniz kritik seviyenin altına düştü. Mevcut bakiye: 850 TL',
    meta: { balance: 850, threshold: 1000 },
    isRead: true,
    readAt: new Date('2024-09-25T11:30:00Z').toISOString(),
    createdAt: new Date('2024-09-25T11:00:00Z').toISOString()
  },
  {
    id: '3',
    type: 'ORDER_FAILED',
    title: 'Sipariş Başarısız',
    message: 'Trendyol siparişi fulfillment başarısız oldu. Fazlalık kod olarak işlendi.',
    meta: { orderId: 'TRD123456', channel: 'Trendyol', reason: 'FULFILLMENT_FAILED' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2024-09-26T10:30:00Z').toISOString()
  }
];

// Mock SMTP transporter (in real app this would use actual SMTP settings)
const createMockTransporter = () => {
  return {
    sendMail: async (options: any) => {
      logger.info('Mock email sent', { to: options.to, subject: options.subject });
      return { messageId: 'mock-message-id' };
    }
  };
};

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
const createAlertSchema = z.object({
  productId: z.string(),
  alertType: z.enum(['LOW_STOCK', 'OUT_OF_STOCK']),
  threshold: z.number().positive().optional(),
  notifyEmail: z.array(z.string().email())
});

const updateAlertSchema = z.object({
  threshold: z.number().positive().optional(),
  notifyEmail: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional()
});

const notificationsQuerySchema = z.object({
  isRead: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('20')
});

// Helper function to send email notifications
const sendEmailNotification = async (alert: any, product: any) => {
  try {
    const transporter = createMockTransporter();
    
    const subject = `Stok Uyarısı: ${product.name}`;
    const message = alert.alertType === 'LOW_STOCK' 
      ? `${product.name} ürününün stoğu ${alert.threshold} adedin altına düştü. Mevcut stok: ${product.stock} adet.`
      : `${product.name} ürününün stoğu tükendi. Lütfen stok takibi yapın.`;
    
    for (const email of alert.notifyEmail) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@omega.com',
        to: email,
        subject,
        text: message,
        html: `<p>${message}</p><p><small>Bu otomatik bir bildirimdir.</small></p>`
      });
    }
    
    logger.info(`Email notification sent for ${alert.alertType}`, {
      productId: alert.productId,
      emails: alert.notifyEmail
    });
    
  } catch (error) {
    logger.error('Failed to send email notification:', error);
    throw error;
  }
};

// Helper function to create notification
const createNotification = async (type: string, title: string, message: string, meta: any) => {
  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    meta,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString()
  };
  
  mockNotifications.unshift(notification);
  
  logger.info('Notification created', { type, title });
  
  return notification;
};

// GET /alerts - List all alert rules
router.get('/', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    res.json(mockAlerts);
    
  } catch (error) {
    logger.error('Error listing alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /alerts - Create new alert rule
router.post('/', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const validatedData = createAlertSchema.parse(req.body);
    
    // Check if alert already exists for this product and type
    const existingAlert = mockAlerts.find(alert => 
      alert.productId === validatedData.productId && alert.alertType === validatedData.alertType
    );
    
    if (existingAlert) {
      return res.status(400).json({ error: 'Alert rule already exists for this product and type' });
    }
    
    // Validate threshold for LOW_STOCK alerts
    if (validatedData.alertType === 'LOW_STOCK' && !validatedData.threshold) {
      return res.status(400).json({ error: 'Threshold is required for LOW_STOCK alerts' });
    }
    
    // Create new alert
    const newAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...validatedData,
      threshold: validatedData.threshold || 0,
      isActive: true,
      lastTriggeredAt: null as any,
      createdAt: new Date().toISOString(),
      product: {
        id: validatedData.productId,
        name: 'Mock Product', // In real app, fetch from database
        sku: 'MOCK001',
        stock: 100
      }
    };
    
    mockAlerts.push(newAlert);
    
    // Log audit
    logger.info('Alert rule created', { 
      alertId: newAlert.id, 
      productId: validatedData.productId,
      alertType: validatedData.alertType 
    });
    
    res.status(201).json(newAlert);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /alerts/:id - Update alert rule
router.patch('/:id', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateAlertSchema.parse(req.body);
    
    const alertIndex = mockAlerts.findIndex(alert => alert.id === id);
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    // Update alert
    const updatedAlert = { 
      ...mockAlerts[alertIndex], 
      ...validatedData,
      threshold: validatedData.threshold !== undefined ? validatedData.threshold : mockAlerts[alertIndex].threshold
    };
    mockAlerts[alertIndex] = updatedAlert;
    
    // Log audit
    logger.info('Alert rule updated', { alertId: id, changes: validatedData });
    
    res.json(updatedAlert);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /alerts/:id - Delete alert rule
router.delete('/:id', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const alertIndex = mockAlerts.findIndex(alert => alert.id === id);
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    const alert = mockAlerts[alertIndex];
    mockAlerts.splice(alertIndex, 1);
    
    // Log audit
    logger.info('Alert rule deleted', { alertId: id, productId: alert.productId });
    
    res.json({ message: 'Alert deleted successfully' });
    
  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notifications - List notifications
router.get('/notifications', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = notificationsQuerySchema.parse(req.query);
    const { isRead, page, limit } = validatedQuery;
    
    // Filter notifications
    let filteredNotifications = [...mockNotifications];
    if (isRead !== undefined) {
      filteredNotifications = filteredNotifications.filter(n => n.isRead === isRead);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
    
    res.json({
      notifications: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        pages: Math.ceil(filteredNotifications.length / limit)
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    logger.error('Error listing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const notificationIndex = mockNotifications.findIndex(n => n.id === id);
    if (notificationIndex === -1) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Mark as read
    mockNotifications[notificationIndex] = {
      ...mockNotifications[notificationIndex],
      isRead: true,
      readAt: new Date().toISOString()
    } as any;
    
    res.json({ message: 'Notification marked as read' });
    
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/read-all - Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    mockNotifications = mockNotifications.map(notification => ({
      ...notification,
      isRead: true,
      readAt: new Date().toISOString()
    })) as any[];
    
    res.json({ message: 'All notifications marked as read' });
    
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /alerts/check - Manual stock check (for testing)
router.post('/check', authMiddleware(['ADMIN', 'OPERATIONS']), async (req: Request, res: Response) => {
  try {
    // Mock stock check logic
    const triggeredAlerts = [];
    
    for (const alert of mockAlerts) {
      if (!alert.isActive) continue;
      
      const product = alert.product;
      const shouldTrigger = alert.alertType === 'LOW_STOCK' 
        ? product.stock <= (alert.threshold || 0)
        : alert.alertType === 'OUT_OF_STOCK' 
        ? product.stock === 0
        : false;
      
      // Check 24-hour cooldown
      const lastTriggered = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt) : null;
      const cooldownPeriod = lastTriggered ? (Date.now() - lastTriggered.getTime()) > (24 * 60 * 60 * 1000) : true;
      
      if (shouldTrigger && cooldownPeriod) {
        // Update last triggered time
        alert.lastTriggeredAt = new Date().toISOString();
        
        // Create notification
        const notification = await createNotification(
          'STOCK_ALERT',
          `Stok Uyarısı: ${product.name}`,
          alert.alertType === 'LOW_STOCK' 
            ? `${product.name} ürününün stoğu ${alert.threshold} adedin altına düştü. Mevcut stok: ${product.stock} adet.`
            : `${product.name} ürününün stoğu tükendi.`,
          { productId: alert.productId, stockLevel: product.stock, threshold: alert.threshold }
        );
        
        // Send email
        await sendEmailNotification(alert, product);
        
        triggeredAlerts.push({ alert, notification });
      }
    }
    
    res.json({
      message: 'Stock check completed',
      triggeredAlerts: triggeredAlerts.length,
      alerts: triggeredAlerts
    });
    
  } catch (error) {
    logger.error('Error during stock check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as alertsRouter }
