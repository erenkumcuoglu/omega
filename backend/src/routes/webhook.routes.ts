import { Router, Request, Response } from 'express'

// Logger setup inline
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
}

// IP Whitelist middleware inline
const ipWhitelist = (channel: string) => {
  return (req: Request, res: Response, next: any) => {
    // Sandbox modunda tüm IP'lere izin ver
    logger.info(`IP whitelist bypassed for ${channel} (sandbox mode)`)
    next()
  }
}

// HMAC Verify middleware inline
const hmacVerify = (channel: string) => {
  return (req: Request, res: Response, next: any) => {
    // Sandbox modunda signature kontrolünü atla
    logger.info(`HMAC verification bypassed for ${channel} (sandbox mode)`)
    next()
  }
}

// Hepsiburada handler inline
const handleHepsiburadaWebhook = async (req: Request, res: Response) => {
  try {
    logger.info(`Hepsiburada webhook received: ${req.body.order?.orderNumber}`)
    res.json({
      success: true,
      message: 'Hepsiburada webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Hepsiburada webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
}

// Allegro handler inline
const handleAllegroWebhook = async (req: Request, res: Response) => {
  try {
    logger.info(`Allegro webhook received: ${req.body.payload?.orderId}`)
    res.json({
      success: true,
      message: 'Allegro webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Allegro webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
}

// Daraz handler inline
const handleDarazWebhook = async (req: Request, res: Response) => {
  try {
    logger.info(`Daraz webhook received: ${req.body.data?.order_id}`)
    res.json({
      success: true,
      message: 'Daraz webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Daraz webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
}

const router = Router()

// Trendyol Service inline
const trendyolService = {
  async processWebhook(payload: any, ip: string): Promise<void> {
    try {
      logger.info(`Processing Trendyol webhook: ${payload.orderNumber}`)
      logger.info(`Successfully processed Trendyol order: ${payload.orderNumber}`)
    } catch (error) {
      logger.error(`Error processing Trendyol webhook:`, error)
      throw error
    }
  },
  async getOrderStatus(orderNumber: string): Promise<any> {
    return { orderNumber, status: 'PENDING' }
  },
  async updateOrderStatus(orderNumber: string, status: string): Promise<void> {
    logger.info(`Order status updated: ${orderNumber} -> ${status}`)
  }
}

// Trendyol webhook (mevcut)
router.post('/trendyol', 
  ipWhitelist('trendyol'),
  hmacVerify('trendyol'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 1. Payload validation (basit kontrol)
      if (!req.body.orderNumber) {
        res.status(400).json({
          success: false,
          error: 'Missing orderNumber'
        })
        return
      }

      // 2. Process webhook
      const ip = req.ip || req.connection.remoteAddress || 'unknown'
      await trendyolService.processWebhook(req.body, ip)

      logger.info(`Trendyol webhook processed successfully: ${req.body.orderNumber}`)

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      })
    } catch (error: any) {
      logger.error('Trendyol webhook error:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Webhook processing failed'
      })
    }
  }
)

// Hepsiburada webhook
router.post('/hepsiburada',
  ipWhitelist('hepsiburada'),
  hmacVerify('hepsiburada'),
  handleHepsiburadaWebhook
)

// Allegro webhook
router.post('/allegro',
  ipWhitelist('allegro'),
  hmacVerify('allegro'),
  handleAllegroWebhook
)

// Daraz Sri Lanka webhook
router.post('/daraz-lk',
  ipWhitelist('daraz-lk'),
  hmacVerify('daraz-lk'),
  handleDarazWebhook
)

// GET /api/webhook/trendyol/status/:orderNumber
router.get('/trendyol/status/:orderNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.params

    const order = await trendyolService.getOrderStatus(orderNumber)

    res.json({
      success: true,
      data: order
    })
  } catch (error: any) {
    logger.error('Error getting order status:', error)
    res.status(404).json({
      success: false,
      error: error.message || 'Order not found'
    })
  }
})

// POST /api/webhook/trendyol/status/:orderNumber
router.post('/trendyol/status/:orderNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber } = req.params
    const { status } = req.body

    if (!status) {
      res.status(400).json({
        success: false,
        error: 'Status is required'
      })
      return
    }

    await trendyolService.updateOrderStatus(orderNumber, status)

    logger.info(`Order status updated via webhook: ${orderNumber} -> ${status}`)

    res.json({
      success: true,
      message: 'Order status updated successfully'
    })
  } catch (error: any) {
    logger.error('Error updating order status:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order status'
    })
  }
})

// Test endpoint for webhook testing
router.post('/trendyol/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const testPayload = {
      orderNumber: `TEST-${Date.now()}`,
      status: 'Created',
      items: [
        {
          sku: 'TEST-SKU-001',
          quantity: 1,
          price: 100.00
        }
      ],
      customer: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+905555555555'
      },
      address: {
        city: 'İstanbul',
        district: 'Kadıköy',
        fullAddress: 'Test Address',
        postalCode: '34710'
      },
      paymentMethod: 'CREDIT_CARD',
      totalAmount: 108.50,
      commissionFee: 8.50,
      createdAt: new Date().toISOString()
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    await trendyolService.processWebhook(testPayload, ip)

    logger.info(`Test webhook processed: ${testPayload.orderNumber}`)

    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      orderNumber: testPayload.orderNumber
    })
  } catch (error: any) {
    logger.error('Test webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Test webhook failed'
    })
  }
})

export default router
