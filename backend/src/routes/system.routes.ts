import { Router } from 'express'
import TurkpinService from '../services/turkpin.service'
import logger from '../utils/logger'

const router = Router()
const turkpinService = new TurkpinService()

// Simple in-memory rate limiter for sync endpoint
const syncCalls = new Map<string, number>()
const SYNC_RATE_LIMIT = 2 // calls per minute
const SYNC_WINDOW = 60 * 1000 // 1 minute in milliseconds

const checkRateLimit = (key: string): boolean => {
  const now = Date.now()
  const calls = syncCalls.get(key) || 0
  
  if (calls >= SYNC_RATE_LIMIT) {
    return false
  }
  
  syncCalls.set(key, calls + 1)
  
  // Reset counter after window expires
  setTimeout(() => {
    syncCalls.delete(key)
  }, SYNC_WINDOW)
  
  return true
}

router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now()
    const uptime = process.uptime()
    
    // Check Turkpin connection
    let turkpinStatus: 'healthy' | 'error' = 'healthy'
    let turkpinBalance: number | undefined
    let turkpinLatency: number
    
    try {
      const balance = await turkpinService.checkBalance()
      turkpinBalance = balance.balance
      turkpinLatency = Date.now() - startTime
    } catch (error: any) {
      turkpinStatus = 'error'
      turkpinLatency = Date.now() - startTime
      logger.error('Turkpin health check failed', { error: error.message })
    }

    const overallStatus = turkpinStatus === 'healthy' ? 'healthy' : 'degraded'

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        turkpin: {
          status: turkpinStatus,
          latencyMs: turkpinLatency,
          ...(turkpinBalance !== undefined && { balance: turkpinBalance })
        },
        api: {
          status: 'healthy',
          uptime
        }
      }
    })
  } catch (error) {
    logger.error('Health check error:', error)
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
})

router.get('/balance', async (req, res) => {
  try {
    const balance = await turkpinService.checkBalance()
    
    res.json({
      status: 'success',
      data: balance
    })
  } catch (error: any) {
    logger.error('Balance check error:', error)
    
    res.status(500).json({
      status: 'error',
      message: error.message,
      ...(error.isInsufficientBalance && { isInsufficientBalance: true }),
      ...(error.isMaintenance && { isMaintenance: true })
    })
  }
})

export default router
