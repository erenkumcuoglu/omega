import { Router } from 'express'
import TurkpinService from '../services/turkpin.service'
import logger from '../utils/logger'

const router = Router()
const turkpinService = new TurkpinService()

router.get('/turkpin/status', async (req, res) => {
  try {
    const startTime = Date.now()
    
    // Get balance to check connection
    const balance = await turkpinService.checkBalance()
    const latency = Date.now() - startTime
    
    res.json({
      status: 'success',
      data: {
        provider: 'Turkpin',
        connected: true,
        balance: balance.balance,
        credit: balance.credit,
        bonus: balance.bonus,
        spending: balance.spending,
        latencyMs: latency,
        lastChecked: new Date().toISOString()
      }
    })
  } catch (error: any) {
    logger.error('Turkpin status check failed:', error)
    
    res.status(500).json({
      status: 'error',
      data: {
        provider: 'Turkpin',
        connected: false,
        error: error.message,
        lastChecked: new Date().toISOString(),
        ...(error.isInsufficientBalance && { isInsufficientBalance: true }),
        ...(error.isMaintenance && { isMaintenance: true })
      }
    })
  }
})

export default router
