import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../types/auth'
import { logger } from '../config/logger'

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // User authenticate middleware'dan gelmelidir
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' })
        return
      }

      // Rol kontrolü
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(`Unauthorized access attempt: ${req.user.role} tried to access resource requiring ${allowedRoles.join(', ')}`)
        res.status(403).json({ error: 'Insufficient permissions' })
        return
      }

      next()
    } catch (error) {
      logger.error('Authorization error:', error)
      res.status(500).json({ error: 'Authorization error' })
    }
  }
}

export default authorize
