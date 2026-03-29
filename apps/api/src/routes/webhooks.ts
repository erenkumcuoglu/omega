import { Router, Request, Response } from 'express';
import { OrderFulfillmentService } from '../services/OrderFulfillmentService';
import { validateWebhook } from '../middleware/validation';
import { createRateLimit, ipWhitelist, hmacVerify } from '../middleware/security';
import { RATE_LIMITS, HTTP_STATUS } from '@omega/shared';

const router = Router();
const orderFulfillment = OrderFulfillmentService.getInstance();

// Apply webhook-specific rate limiting
router.use(createRateLimit(RATE_LIMITS.WEBHOOKS));

// Trendyol webhook
router.post('/trendyol', 
  validateWebhook,
  ipWhitelist(process.env.TRENDYOL_WEBHOOK_IPS?.split(',') || []),
  hmacVerify(process.env.TRENDYOL_WEBHOOK_SECRET!),
  async (req: Request, res: Response) => {
    try {
      await orderFulfillment.processWebhookOrder({
        payload: req.body,
        channelName: 'trendyol',
        clientIp: req.ip || 'unknown'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error: any) {
      console.error('Trendyol webhook error:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Hepsiburada webhook
router.post('/hepsiburada',
  validateWebhook,
  ipWhitelist(process.env.HEPSIBURADA_WEBHOOK_IPS?.split(',') || []),
  hmacVerify(process.env.HEPSIBURADA_WEBHOOK_SECRET!),
  async (req: Request, res: Response) => {
    try {
      await orderFulfillment.processWebhookOrder({
        payload: req.body,
        channelName: 'hepsiburada',
        clientIp: req.ip || 'unknown'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error: any) {
      console.error('Hepsiburada webhook error:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Ozan webhook
router.post('/ozan',
  validateWebhook,
  ipWhitelist(process.env.OZAN_WEBHOOK_IPS?.split(',') || []),
  hmacVerify(process.env.OZAN_WEBHOOK_SECRET!),
  async (req: Request, res: Response) => {
    try {
      await orderFulfillment.processWebhookOrder({
        payload: req.body,
        channelName: 'ozan',
        clientIp: req.ip || 'unknown'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error: any) {
      console.error('Ozan webhook error:', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export { router as webhooksRouter };
