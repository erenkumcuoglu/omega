import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../config/logger'
import { AuthenticatedRequest } from '../types/auth'

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Authorization header'dan token al
    const authHeader = req.headers.authorization
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    // 2. Yoksa cookie'den al
    if (!token) {
      token = req.cookies?.omega_access_token
    }

    // 3. Token yoksa 401
    if (!token) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // 4. Token'ı doğrula
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production'
    const decoded = jwt.verify(token, jwtSecret) as any

    // 5. Token type kontrolü
    if (decoded.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }

    // 6. User bilgisini req.user'a set et
    req.user = {
      id: decoded.sub,
      role: decoded.role
    }

    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}

export default authenticate
