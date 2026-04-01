import { Router } from 'express'
import TurkpinService from '../services/turkpin.service'
import logger from '../utils/logger'

const router = Router()
const turkpinService = new TurkpinService()

// Simple in-memory rate limiter for sync endpoint
const syncCalls = new Map<string, number>()
const SYNC_RATE_LIMIT = 10 // calls per minute
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
    
    // Use sandbox API for now
    const axios = require('axios')
    const { XMLParser } = require('fast-xml-parser')
    
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })

    // Sandbox'tan veri çek
    const sandboxUrl = 'http://localhost:3099'
    
    const makeRequest = async (command: string, params: Record<string, any> = {}) => {
      let xml = `<?xml version="1.0"?>
<APIRequest>
  <params>
    <username>sandbox_user</username>
    <password>sandbox_pass</password>
    <cmd>${command}</cmd>`
      
      for (const [key, value] of Object.entries(params)) {
        xml += `\n    <${key}>${value}</${key}>`
      }
      
      xml += `
  </params>
</APIRequest>`
      
      const formData = new URLSearchParams()
      formData.append('DATA', xml)
      
      const response = await axios.post(sandboxUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      })
      
      return xmlParser.parse(response.data)
    }

    const getEpinList = async () => {
      const response = await makeRequest('epinList')
      
      if (response.result && response.result.category) {
        const categories = Array.isArray(response.result.category) 
          ? response.result.category 
          : [response.result.category]
        
        return categories.map(cat => ({
          id: cat.id,
          name: cat.name
        }))
      }
      
      return []
    }

    const getProducts = async (epinId: string) => {
      const response = await makeRequest('epinProducts', { epinId })
      
      if (response.result && response.result.product) {
        const products = Array.isArray(response.result.product) 
          ? response.result.product 
          : [response.result.product]
        
        return products.map(product => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price || 0),
          stock: parseInt(product.stock || 0),
          minOrder: parseInt(product.min_order || 1),
          maxOrder: parseInt(product.max_order || 0)
        }))
      }
      
      return []
    }

    const categories = []
    const epinList = await getEpinList()
    
    logger.info(`Found ${epinList.length} categories`)
    
    for (const epin of epinList) {
      try {
        const products = await getProducts(epin.id)
        categories.push({
          epinId: epin.id,
          epinName: epin.name,
          products
        })
        logger.info(`Synced ${products.length} products from ${epin.name}`)
      } catch (error: any) {
        logger.error(`Failed to sync products for ${epin.name}:`, error)
      }
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
          source: 'sandbox_api'
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
