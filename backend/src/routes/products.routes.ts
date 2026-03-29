import { Router } from 'express'
import TurkpinService from '../services/turkpin.service'
import logger from '../utils/logger'

const router = Router()
const turkpinService = new TurkpinService()

// Simple in-memory rate limiter for sync endpoint
const syncCalls = new Map<string, number>()
const SYNC_RATE_LIMIT = 10 // calls per minute (increased from 2)
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

router.get('/test-turkpin', async (req, res) => {
  try {
    logger.info('[Turkpin] Testing direct API call...')
    
    // Test direct Turkpin API call
    const axios = require('axios')
    const params = new URLSearchParams({
      cmd: 'epinList',
      username: 'eren@omegadijital.com',
      password: 'ErenYamaha11#.'
    })
    
    const response = await axios.post('https://www.turkpin.com', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Omega-Digital/1.0'
      },
      timeout: 15000
    })
    
    logger.info('[Turkpin] Direct API call response:', response.data)
    
    res.json({
      status: 'success',
      data: {
        rawResponse: response.data,
        headers: response.headers,
        status: response.status
      }
    })
  } catch (error: any) {
    logger.error('[Turkpin] Direct API call error:', error)
    res.status(500).json({
      status: 'error',
      message: error.message,
      response: error.response?.data
    })
  }
})

router.get('/sync', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded. Maximum 10 sync calls per minute.'
    })
  }

  try {
    logger.info('Starting product sync from Turkpin')
    
    // Try real Turkpin API first
    let categories = []
    let useMockData = false
    
    try {
      const epinList = await turkpinService.getEpinList()
      
      // If no epins returned, use mock data
      if (!epinList || epinList.length === 0) {
        throw new Error('No epin categories found - check IP whitelist and API credentials')
      }
      
      // Get products for each category
      for (const epin of epinList) {
        try {
          const products = await turkpinService.getProducts(epin.id)
          categories.push({
            epinId: epin.id,
            epinName: epin.name,
            products
          })
          logger.info(`Synced ${products.length} products from ${epin.name}`)
        } catch (error: any) {
          logger.error(`Failed to sync products for ${epin.name}:`, error)
          // Continue with other categories even if one fails
        }
      }
    } catch (turkpinError) {
      logger.error('Turkpin API failed:', turkpinError)
      useMockData = true
      
      // Use mock data as fallback
      categories = [
        {
          epinId: 'pubg_mobile',
          epinName: 'PUBG Mobile',
          products: [
            {
              id: 'pubg_100',
              name: 'PUBG Mobile 100 TL',
              stock: 45,
              minOrder: 1,
              maxOrder: 10,
              price: 100.00
            },
            {
              id: 'pubg_50',
              name: 'PUBG Mobile 50 TL',
              stock: 23,
              minOrder: 1,
              maxOrder: 20,
              price: 50.00
            }
          ]
        },
        {
          epinId: 'free_fire',
          epinName: 'Free Fire',
          products: [
            {
              id: 'ff_100',
              name: 'Free Fire 100 TL',
              stock: 67,
              minOrder: 1,
              maxOrder: 15,
              price: 100.00
            }
          ]
        },
        {
          epinId: 'valorant',
          epinName: 'Valorant',
          products: [
            {
              id: 'val_100',
              name: 'Valorant 100 TL',
              stock: 12,
              minOrder: 1,
              maxOrder: 5,
              price: 100.00
            }
          ]
        }
      ]
    }

    const totalProducts = categories.reduce((sum, epin) => sum + epin.products.length, 0)
    
    res.json({
      status: 'success',
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalProducts,
          syncedAt: new Date().toISOString(),
          source: useMockData ? 'mock_data' : 'turkpin_api'
        }
      }
    })
    
    logger.info(`Product sync completed: ${categories.length} categories, ${totalProducts} products`)
    
  } catch (error: any) {
    logger.error('Product sync failed:', error)
    
    res.status(500).json({
      status: 'error',
      message: error.message,
      ...(error.isOutOfStock && { isOutOfStock: true }),
      ...(error.isInsufficientBalance && { isInsufficientBalance: true }),
      ...(error.isMaintenance && { isMaintenance: true })
    })
  }
})

router.get('/:epinId', async (req, res) => {
  try {
    const { epinId } = req.params
    
    const products = await turkpinService.getProducts(epinId)
    
    res.json({
      status: 'success',
      data: {
        epinId,
        products
      }
    })
  } catch (error: any) {
    logger.error(`Failed to get products for ${req.params.epinId}:`, error)
    
    res.status(500).json({
      status: 'error',
      message: error.message,
      ...(error.isOutOfStock && { isOutOfStock: true }),
      ...(error.isInsufficientBalance && { isInsufficientBalance: true }),
      ...(error.isMaintenance && { isMaintenance: true })
    })
  }
})

export default router
