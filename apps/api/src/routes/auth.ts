import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation';
import { createRateLimit, authenticate } from '../middleware/security';
import { LoginRequestSchema, LoginResponseSchema, JWT_CONFIG, HTTP_STATUS, UserRole, RATE_LIMITS } from '@omega/shared';

const router = Router();

// Apply auth-specific rate limiting
router.use(createRateLimit(RATE_LIMITS.AUTH));

// POST /auth/login
router.post('/login',
  createRateLimit(RATE_LIMITS.AUTH_LOGIN), // Stricter limit for login
  validate(LoginRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email, isActive: true },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Verify password (using simple hash for demo)
      const passwordHash = createHash('sha256').update(password).digest('hex');
      const isPasswordValid = passwordHash === user.passwordHash;
      if (!isPasswordValid) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Generate access token
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET!,
        { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN }
      );

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        ...JWT_CONFIG.COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      }).catch(() => {}); // Ignore errors

      // Log successful login
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN' as any,
          entity: 'User',
          entityId: user.id,
          ip: req.ip || 'unknown',
          meta: {
            email: user.email,
            role: user.role,
            success: true
          }
        }
      }).catch(() => {}); // Ignore errors

      const response: LoginResponseSchema = {
        accessToken,
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN
      };

      res.json(response);

    } catch (error: any) {
      console.error('Login error:', error);

      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN' as any,
          entity: 'User',
          ip: req.ip || 'unknown',
          meta: {
            email: req.body.email,
            success: false,
            error: error.message
          }
        }
      }).catch(() => {}); // Ignore errors

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Login failed'
      });
    }
  }
);

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN }
    );

    const response: LoginResponseSchema = {
      accessToken: newAccessToken,
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN
    };

    res.json(response);

  } catch (error: any) {
    console.error('Token refresh error:', error);

    // Clear invalid refresh token
    res.clearCookie('refreshToken');

    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token'
    });
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Log logout
    await prisma.auditLog.create({
      data: {
        action: 'LOGOUT' as any,
        entity: 'User',
        entityId: req.user!.id,
        ip: req.ip || 'unknown',
        meta: {
          email: req.user!.email,
          role: req.user!.role
        }
      }
    }).catch(() => {}); // Ignore errors

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      message: 'Logout failed'
    });
  }
});

// GET /auth/me (get current user info)
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    res.json(user);

  } catch (error: any) {
    console.error('Get user error:', error);

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

export { router as authRouter };
