import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, createRateLimit } from '../middleware/security';
import { HepsiburadaService } from '../services/HepsiburadaService';
import { HTTP_STATUS, RATE_LIMITS } from '@omega/shared';

const router: Router = Router();
const hepsiburadaService = HepsiburadaService.getInstance();

function sanitizeUpstreamData(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }

  const value = data.trim();
  if (value.startsWith('<!DOCTYPE html') || value.startsWith('<html')) {
    return {
      code: 'HEPSIBURADA_UPSTREAM_HTML_ERROR',
      message: 'Hepsiburada upstream returned an HTML error page'
    };
  }

  return value.length > 2000 ? `${value.slice(0, 2000)}...` : value;
}

const querySchema = z.object({
  page: z.coerce.number().int().min(0).optional(),
  size: z.coerce.number().int().min(1).max(200).optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const recipeSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z
    .string()
    .min(1)
    .refine((value) => !value.includes('://'), { message: 'External URLs are not allowed' }),
  query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  body: z.unknown().optional()
});

router.use(authenticate);
router.use(authorize(['ADMIN', 'OPERATIONS']));
router.use(createRateLimit(RATE_LIMITS.API));

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const result = await hepsiburadaService.healthCheck();

    return res.status(result.ok ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: result.ok,
      data: result
    });
  } catch (_error: any) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'HEPSIBURADA_HEALTH_CHECK_FAILED',
      message: 'Hepsiburada health check failed'
    });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const response = await hepsiburadaService.getProducts(query);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: sanitizeUpstreamData(response.data)
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
      code: 'HEPSIBURADA_FETCH_PRODUCTS_FAILED',
      message: 'Failed to fetch Hepsiburada products'
    });
  }
});

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    const response = await hepsiburadaService.getOrders(query);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: sanitizeUpstreamData(response.data)
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
      code: 'HEPSIBURADA_FETCH_ORDERS_FAILED',
      message: 'Failed to fetch Hepsiburada orders'
    });
  }
});

router.post('/recipes/request', async (req: Request, res: Response) => {
  try {
    const payload = recipeSchema.parse(req.body);
    const response = await hepsiburadaService.requestRecipe(payload);

    return res.status(response.status < 400 ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST).json({
      success: response.status < 400,
      status: response.status,
      data: sanitizeUpstreamData(response.data)
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid request payload',
        details: error.errors
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'HEPSIBURADA_RECIPE_REQUEST_FAILED',
      message: 'Failed to call Hepsiburada recipe endpoint'
    });
  }
});

export { router as hepsiburadaRouter };