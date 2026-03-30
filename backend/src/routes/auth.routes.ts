import { Router, Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { logger } from '../config/logger'
import { z } from 'zod'

const router = Router()
const authService = new AuthService()

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Input validation
    const { email, password } = loginSchema.parse(req.body)
    
    // Get IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // Login
    const result = await authService.login(email, password, ip)
    
    // Set refresh token in cookie
    res.cookie('omega_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    
    // Set access token in cookie
    res.cookie('omega_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })
    
    logger.info(`User logged in: ${result.user.email}`)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Login error:', error)
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed'
    })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.omega_refresh_token || req.body?.refreshToken
    
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token required'
      })
      return
    }
    
    // Get IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // Refresh token
    const result = await authService.refresh(refreshToken, ip)
    
    // Set new access token in cookie
    res.cookie('omega_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })
    
    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Token refresh error:', error)
    res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed'
    })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get IP
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // Get user from token (if available)
    const token = req.cookies?.omega_access_token || req.headers.authorization?.substring(7)
    if (token) {
      try {
        const jwt = require('jsonwebtoken')
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production'
        const decoded = jwt.verify(token, jwtSecret) as any
        await authService.logout(decoded.sub, ip)
      } catch (error) {
        // Token invalid, just clear cookies
      }
    }
    
    // Clear cookies
    res.clearCookie('omega_access_token')
    res.clearCookie('omega_refresh_token')
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error: any) {
    logger.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
})

export default router
