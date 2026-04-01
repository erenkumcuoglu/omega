import { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { redis } from '../config/redis';
import { CryptoService } from '../utils/crypto';
import { 
  RATE_LIMITS, 
  REDIS_KEYS, 
  HTTP_STATUS,
  AuditAction 
} from '@omega/shared';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Rate limiting middleware factory
export const createRateLimit = (config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.requests,
    message: {
      error: 'Too many requests',
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP for auth endpoints, user ID for authenticated endpoints
      if (req.headers.authorization) {
        return `user:${req.user?.id || 'unknown'}`;
      }
      return `ip:${getClientIp(req)}`;
    },
    // Fallback to in-memory store for rate limiting in this environment
    handler: async (req: Request, res: Response) => {
      await logAuditEvent({
        action: AuditAction.RATE_LIMIT_HIT,
        entity: 'RateLimit',
        ip: getClientIp(req),
        meta: {
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent')
        }
      });

      res.status(429).json({ error: 'Too many requests' });
    }
  });
};

// IP Whitelist middleware
export const ipWhitelist = (allowedIps: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);
    const normalized = allowedIps.map((ip) => ip.trim()).filter(Boolean);

    if (normalized.includes('*') || normalized.includes('sandbox')) {
      return next();
    }
    
    if (!normalized.includes(clientIp)) {
      await logAuditEvent({
        action: AuditAction.WEBHOOK_BLOCKED,
        entity: 'Webhook',
        ip: clientIp,
        meta: {
          endpoint: req.path,
          reason: 'IP_NOT_WHITELISTED',
          allowedIps
        }
      });

      logger.warn('Webhook blocked - IP not whitelisted', { 
        ip: clientIp, 
        endpoint: req.path,
        allowedIps 
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this endpoint'
      });
    }

    next();
  };
};

export const hmacVerify = (secret: string, signatureHeader: string = 'x-signature') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!secret) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Webhook signature secret is not configured'
      });
    }

    const signature = req.headers[signatureHeader] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      await logAuditEvent({
        action: AuditAction.WEBHOOK_BLOCKED,
        entity: 'Webhook',
        ip: getClientIp(req),
        meta: {
          endpoint: req.path,
          reason: 'MISSING_SIGNATURE'
        }
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Signature is required'
      });
    }

    // Calculate expected signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison
    if (!CryptoService.timingSafeEqual(signature, expectedSignature)) {
      await logAuditEvent({
        action: AuditAction.WEBHOOK_BLOCKED,
        entity: 'Webhook',
        ip: getClientIp(req),
        meta: {
          endpoint: req.path,
          reason: 'INVALID_SIGNATURE',
          providedSignature: signature.substring(0, 10) + '...',
          expectedSignature: expectedSignature.substring(0, 10) + '...'
        }
      });

      logger.warn('Webhook blocked - Invalid signature', { 
        ip: getClientIp(req), 
        endpoint: req.path 
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid signature'
      });
    }

    next();
  };
};

// JWT Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid token or user not found'
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(() => {}); // Ignore errors

    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Helper function to get client IP
function getClientIp(req: Request): string {
  // Check Cloudflare header first
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.split(',')[0].trim();
  }

  // Check X-Forwarded-For header
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }

  // Fall back to remote address
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// Helper function to generate request ID
function generateRequestId(): string {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

// Helper function to log audit events
export async function logAuditEvent(data: {
  action: AuditAction;
  entity: string;
  entityId?: string;
  ip: string;
  meta: any;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        meta: data.meta,
        ip: data.ip
      }
    });
  } catch (error: any) {
    logger.error('Failed to create audit log', { error: error.message, data });
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
        lastLoginAt?: Date | null;
      };
    }
  }
}
