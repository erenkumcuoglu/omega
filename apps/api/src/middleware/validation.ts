import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS } from '@omega/shared';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      
      // Replace the request data with validated data
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: validationErrors
        });
      }

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Validation failed',
        message: 'Invalid input data'
      });
    }
  };
};

// Custom validation middleware for webhook signatures
export const validateWebhook = (req: Request, res: Response, next: NextFunction) => {
  const requiredFields = ['orderId', 'channel', 'productId', 'quantity', 'sellingPrice', 'orderedAt'];
  
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Validation failed',
        message: `Missing required field: ${field}`
      });
    }
  }

  // Validate channel
  const validChannels = ['trendyol', 'hepsiburada', 'ozan'];
  if (!validChannels.includes(req.body.channel)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation failed',
      message: `Invalid channel. Must be one of: ${validChannels.join(', ')}`
    });
  }

  // Validate quantity
  if (!Number.isInteger(req.body.quantity) || req.body.quantity < 1) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation failed',
      message: 'Quantity must be a positive integer'
    });
  }

  // Validate selling price
  if (typeof req.body.sellingPrice !== 'number' || req.body.sellingPrice <= 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation failed',
      message: 'Selling price must be a positive number'
    });
  }

  // Validate orderedAt date
  const orderedAt = new Date(req.body.orderedAt);
  if (isNaN(orderedAt.getTime())) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation failed',
      message: 'Invalid orderedAt date format'
    });
  }

  next();
};
