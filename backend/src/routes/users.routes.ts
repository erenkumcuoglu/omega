import { Router, Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { logger } from '../config/logger'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

const router = Router()
const authService = new AuthService()

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'ACCOUNTING', 'PRICING'])
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'ACCOUNTING', 'PRICING']).optional(),
  isActive: z.boolean().optional(),
  forcePasswordChange: z.boolean().optional()
})

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6)
})

// Middleware: Check if user is SUPER_ADMIN
const requireSuperAdmin = async (req: Request & { user?: any }, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.substring(7) || req.cookies?.omega_access_token
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token required' })
    }

    const user = await authService.validate(token)
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Super Admin access required' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// GET /api/users - Get all users (SUPER_ADMIN only)
router.get('/', requireSuperAdmin, async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        forcePasswordChange: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: users
    })
  } catch (error: any) {
    logger.error('Get users error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    })
  }
})

// POST /api/users - Create user (SUPER_ADMIN only)
router.post('/', requireSuperAdmin, async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body)
    const ip = req.ip || req.connection.remoteAddress || 'unknown'

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Email already exists'
      })
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        isActive: true,
        forcePasswordChange: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        forcePasswordChange: true,
        createdAt: true
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        meta: { email: user.email, role: user.role },
        ip
      }
    })

    logger.info(`User created: ${user.email} by ${(req as any).user.email}`)

    res.status(201).json({
      success: true,
      data: user
    })
  } catch (error: any) {
    logger.error('Create user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    })
  }
})

// PATCH /api/users/:id - Update user (SUPER_ADMIN only)
router.patch('/:id', requireSuperAdmin, async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const data = updateUserSchema.parse(req.body)
    const ip = req.ip || req.connection.remoteAddress || 'unknown'

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    // Prevent deactivating self
    if (existingUser.id === (req as any).user.id && data.isActive === false) {
      res.status(400).json({
        success: false,
        error: 'Cannot deactivate yourself'
      })
      return
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        forcePasswordChange: true,
        updatedAt: true
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: user.id,
        meta: { changes: data },
        ip
      }
    })

    logger.info(`User updated: ${user.email} by ${(req as any).user.email}`)

    res.json({
      success: true,
      data: user
    })
  } catch (error: any) {
    logger.error('Update user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    })
  }
})

// DELETE /api/users/:id - Delete user (SUPER_ADMIN only)
router.delete('/:id', requireSuperAdmin, async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const ip = req.ip || req.connection.remoteAddress || 'unknown'

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    // Prevent deleting self
    if (existingUser.id === (req as any).user.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete yourself'
      })
      return
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: existingUser.id,
        meta: { email: existingUser.email },
        ip
      }
    })

    logger.info(`User deleted: ${existingUser.email} by ${(req as any).user.email}`)

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error: any) {
    logger.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    })
  }
})

// POST /api/users/:id/reset-password - Reset user password (SUPER_ADMIN only)
router.post('/:id/reset-password', requireSuperAdmin, async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { newPassword } = resetPasswordSchema.parse(req.body)
    const ip = req.ip || req.connection.remoteAddress || 'unknown'

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password and force change on next login
    const user = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        forcePasswordChange: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        forcePasswordChange: true
      }
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
        meta: { email: user.email },
        ip
      }
    })

    logger.info(`Password reset for user: ${user.email} by ${(req as any).user.email}`)

    res.json({
      success: true,
      data: user,
      message: 'Password reset successfully. User will need to change password on next login.'
    })
  } catch (error: any) {
    logger.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    })
  }
})

export default router
