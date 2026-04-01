import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, createRateLimit } from '../middleware/security';
import { OzonService } from '../services/OzonService';
import { HTTP_STATUS, RATE_LIMITS } from '@omega/shared';

const router: Router = Router();
const ozonService = OzonService.getInstance();

const productsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  lastId: z.string().optional()
});

const postingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  since: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional()
});

router.use(authenticate);
router.use(authorize(['ADMIN', 'OPERATIONS']));
router.use(createRateLimit(RATE_LIMITS.API));

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const result = await ozonService.healthCheck();

    return res.status(result.ok ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: result.ok,
      data: result
    });
  } catch (_error: any) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'OZON_HEALTH_CHECK_FAILED',
      message: 'Ozon health check failed'
    });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const query = productsQuerySchema.parse(req.query);
    const response = await ozonService.getProducts(query);

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
      code: 'OZON_FETCH_PRODUCTS_FAILED',
      message: 'Failed to fetch Ozon products'
    });
  }
});

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const query = postingsQuerySchema.parse(req.query);
    const response = await ozonService.getPostings(query);

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
      code: 'OZON_FETCH_ORDERS_FAILED',
      message: 'Failed to fetch Ozon orders'
    });
  }
});

export { router as ozonRouter };
