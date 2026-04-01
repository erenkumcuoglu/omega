import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, createRateLimit } from '../middleware/security';
import { TrendyolService } from '../services/TrendyolService';
import { HTTP_STATUS, RATE_LIMITS } from '@omega/shared';

const router: Router = Router();
const trendyolService = TrendyolService.getInstance();

const packageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional(),
  size: z.coerce.number().int().min(1).max(200).optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

router.use(authenticate);
router.use(authorize(['ADMIN', 'OPERATIONS']));
router.use(createRateLimit(RATE_LIMITS.API));

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const result = await trendyolService.healthCheck();

    return res.status(result.ok ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: result.ok,
      data: result
    });
  } catch (error: any) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Trendyol health check failed',
      code: 'TRENDYOL_HEALTH_CHECK_FAILED'
    });
  }
});

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const query = packageQuerySchema.parse(req.query);
    const response = await trendyolService.getOrders(query);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: response.data
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters',
        details: error.errors
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch Trendyol orders',
      code: 'TRENDYOL_FETCH_ORDERS_FAILED'
    });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const q = z.object({
      page: z.coerce.number().int().min(0).optional(),
      size: z.coerce.number().int().min(1).max(200).optional()
    }).parse(req.query);
    const response = await trendyolService.getProducts(q);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: response.data
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters',
        details: error.errors
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch Trendyol products',
      code: 'TRENDYOL_FETCH_PRODUCTS_FAILED'
    });
  }
});

router.get('/shipment-packages', async (req: Request, res: Response) => {
  try {
    const query = packageQuerySchema.parse(req.query);
    const response = await trendyolService.getShipmentPackages(query);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: response.data
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch Trendyol shipment packages',
      code: 'TRENDYOL_FETCH_PACKAGES_FAILED'
    });
  }
});

export { router as trendyolRouter };
