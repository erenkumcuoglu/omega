const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const pino = require('pino')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const { XMLParser } = require('fast-xml-parser')

// Load environment variables
dotenv.config()

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
})

// Prisma setup - geçici olarak devre dışı
let prisma = null
let memoryCache = null

// Veritabanı bağlantısını dene
try {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
  prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error']
  })
} catch (error) {
  logger.warn('Database connection failed, using memory cache:', error.message)
  prisma = null
}

// Turkpin Service inline
class TurkpinService {
  constructor() {
    this.username = process.env.TURKPIN_USERNAME || ''
    this.password = process.env.TURKPIN_PASSWORD || ''
    this.baseUrl = process.env.TURKPIN_API_URL || 'https://api.turkpin.com'
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
  }

  async makeRequest(command, params = {}) {
    const maxRetries = 3
    let lastError

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startTime = Date.now()
      
      try {
        // Build XML request
        let xml = `<?xml version="1.0"?>
<APIRequest>
  <params>
    <username>${this.username}</username>
    <password>${this.password}</password>
    <cmd>${command}</cmd>`
        
        for (const [key, value] of Object.entries(params)) {
          xml += `\n    <${key}>${value}</${key}>`
        }
        
        xml += `
  </params>
</APIRequest>`
        
        console.log(`[Turkpin] ${command} → Request XML:`, xml)
        
        // Send as form-data
        const formData = new URLSearchParams()
        formData.append('DATA', xml)
        
        const response = await axios.post(this.baseUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Omega-Digital/1.0'
          },
          timeout: 15000
        })

        logger.info(`[Turkpin] ${command} → ${response.status} → ${response.statusText}`)
        
        const parsedResponse = this.xmlParser.parse(response.data)
        this.handleTurkpinError(parsedResponse)
        
        return parsedResponse
      } catch (error) {
        lastError = error
        const latency = Date.now() - startTime
        logger.error(`[Turkpin] ${command} → ${latency}ms → ERROR`, error.message)
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000
          logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error('Max retries exceeded')
  }

  handleTurkpinError(responseData) {
    const errorCode = responseData?.HATA_NO || responseData?.error || responseData?.code
    
    if (!errorCode || errorCode === '000') {
      return // No error
    }
    
    const errorMessage = responseData?.HATA_ACIKLAMA || responseData?.error_desc || responseData?.message || 'Unknown error'
    
    logger.error('[Turkpin] API Error:', { errorCode, errorMessage })
    
    const error = new Error(errorMessage)
    error.code = errorCode

    // Add special flags for specific error codes
    if (errorCode === '12') error.isOutOfStock = true
    if (errorCode === '14') error.isInsufficientBalance = true
    if (errorCode === '23') error.isMaintenance = true

    throw error
  }

  async checkBalance() {
    const response = await this.makeRequest('checkBalance')
    const result = response.result || response

    return {
      balance: parseFloat(result.balance || 0),
      credit: parseFloat(result.credit || 0),
      bonus: parseFloat(result.bonus || 0),
      spending: parseFloat(result.spending || 0)
    }
  }

  async getEpinList() {
    try {
      const response = await this.makeRequest('epinList')
      
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
    } catch (error) {
      logger.error('[Turkpin] getEpinList error:', error)
      throw error
    }
  }

  async getProducts(epinId) {
    try {
      const response = await this.makeRequest('epinProducts', { epinId })
      
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
    } catch (error) {
      logger.error('[Turkpin] getProducts error:', error)
      throw error
    }
  }
}

const turkpinService = new TurkpinService()

// Express app setup
const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Omega Backend is running!',
    timestamp: new Date().toISOString()
  })
})

// Turkpin routes
app.get('/api/turkpin/balance', async (req, res) => {
  try {
    const balance = await turkpinService.checkBalance()
    
    res.json({
      success: true,
      data: balance
    })
  } catch (error) {
    logger.error('Balance error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/turkpin/categories', async (req, res) => {
  try {
    logger.info('Fetching all categories from Sandbox API')
    
    const username = 'eren@omegadijital.com'
    const password = 'ErenYamaha11#.'
    const sandboxUrl = 'http://localhost:3099/'
    
    // Önce kategorileri al
    const categoriesResponse = await axios.post(sandboxUrl, 
      new URLSearchParams({ 
        'DATA': `<APIRequest><params><cmd>epinList</cmd><username>${username}</username><password>${password}</password></params></APIRequest>` 
      }),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        timeout: 60000 
      }
    )
    
    // Sandbox XML formatını parse et
    const xmlParser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      isArray: (name) => {
        if (name === 'category' || name === 'product') return true
        return false
      }
    })
    
    const parsedCategories = xmlParser.parse(categoriesResponse.data)
    const categories = parsedCategories.result?.category || []
    
    logger.info(`Found ${categories.length} categories, fetching products...`)
    
    // Her kategori için ürünleri çek
    const categoriesWithProducts = []
    
    for (const category of categories.slice(0, 10)) {
      try {
        const productsResponse = await axios.post(sandboxUrl,
          new URLSearchParams({
            'DATA': `<APIRequest><params><cmd>epinProducts</cmd><username>${username}</username><password>${password}</password><epinId>${category.id}</epinId></params></APIRequest>`
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 60000
          }
        )
        
        const parsedProducts = xmlParser.parse(productsResponse.data)
        const products = parsedProducts.result?.product || []
        
        categoriesWithProducts.push({
          epinId: category.id,
          epinName: category.name,
          products: products.map(product => ({
            id: product.id || '',
            name: product.name || '',
            price: parseFloat(product.price) || 0,
            stock: parseInt(product.stock) || 0,
            minOrder: parseInt(product.minOrder) || 1,
            maxOrder: parseInt(product.maxOrder) || 0
          }))
        })
        
        logger.info(`Fetched ${products.length} products for ${category.epinName}`)
        
      } catch (error) {
        logger.warn(`Failed to fetch products for ${category.epinName}:`, error.message)
        categoriesWithProducts.push({
          epinId: category.epinId,
          epinName: category.epinName,
          products: []
        })
      }
    }
    
    const totalProducts = categoriesWithProducts.reduce((sum, cat) => sum + cat.products.length, 0)
    
    res.json({
      success: true,
      data: categoriesWithProducts,
      summary: {
        totalCategories: categoriesWithProducts.length,
        totalProducts,
        fetchedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    logger.error('Categories fetch failed:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/products - Seçili ürünleri getir
app.get('/api/products', async (req, res) => {
  try {
    console.log('[Products] Getting selected products...')
    
    // Mock data - Prisma çalışmadığı için doğrudan mock data döndür
    const mockProducts = [
      {
        id: '1',
        productId: '8886',
        epinId: '44',
        epinName: 'Steam USD',
        productName: 'Steam USA 5 USD',
        purchasePrice: 231.47,
        sellingPrice: 266.19,
        marginPct: 15.0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        productId: '8887',
        epinId: '44',
        epinName: 'Steam USD',
        productName: 'Steam USA 10 USD',
        purchasePrice: 462.93,
        sellingPrice: 532.37,
        marginPct: 15.0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        productId: '31956',
        epinId: '1360',
        epinName: 'PUBG Mobile',
        productName: 'PUBG Mobile 60 UC',
        purchasePrice: 39.19,
        sellingPrice: 45.07,
        marginPct: 15.0,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        productId: '32000',
        epinId: '1380',
        epinName: 'VALORANT VP',
        productName: 'VALORANT 475 VP',
        purchasePrice: 95.00,
        sellingPrice: 109.25,
        marginPct: 15.0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '5',
        productId: '32050',
        epinId: '1395',
        epinName: 'Apple iTunes',
        productName: 'iTunes USA 5 USD',
        purchasePrice: 185.50,
        sellingPrice: 213.33,
        marginPct: 15.0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    
    console.log(`[Products] Found ${mockProducts.length} selected products`)
    
    res.json({
      success: true,
      data: mockProducts
    })
    
  } catch (error) {
    console.error('[Products] Error fetching products:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// PATCH /api/products/:productId/price - Fiyat güncelleme
app.patch('/api/products/:productId/price', async (req, res) => {
  try {
    const { productId } = req.params
    const { sellingPrice, marginPct } = req.body
    
    if (!sellingPrice || !marginPct) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz parametreler'
      })
    }
    
    // Mock data ile güncelleme simülasyonu
    const mockProduct = {
      id: '1',
      productId,
      epinId: '44',
      epinName: 'Steam USD',
      productName: 'Steam USA 5 USD',
      purchasePrice: 231.47,
      sellingPrice,
      marginPct,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Validasyon: satış fiyatı alış fiyatından düşük olamaz
    if (sellingPrice <= 231.47) {
      return res.status(400).json({
        success: false,
        message: 'Satış fiyatı alış fiyatından düşük olamaz'
      })
    }
    
    res.json({
      success: true,
      data: mockProduct
    })
    
  } catch (error) {
    console.error('[Products] Error updating price:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// PATCH /api/products/:productId/toggle - Durum değiştir
app.patch('/api/products/:productId/toggle', async (req, res) => {
  try {
    const { productId } = req.params
    
    // Mock data ile toggle simülasyonu
    const mockProduct = {
      id: '1',
      productId,
      epinId: '44',
      epinName: 'Steam USD',
      productName: 'Steam USA 5 USD',
      purchasePrice: 231.47,
      sellingPrice: 266.19,
      marginPct: 15.0,
      isActive: Math.random() > 0.5, // Rastgele durum
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    res.json({
      success: true,
      data: mockProduct
    })
    
  } catch (error) {
    console.error('[Products] Error toggling product:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// POST /api/products/sync - Stok senkronizasyonu
app.post('/api/products/sync', async (req, res) => {
  try {
    console.log('[Products] Starting stock sync...')
    
    // Mock sync simülasyonu
    const updated = 3
    const deactivated = 1
    
    console.log(`[Products] Sync completed: ${updated} updated, ${deactivated} deactivated`)
    
    res.json({
      success: true,
      data: {
        updated,
        deactivated,
        message: `${updated} ürün güncellendi, ${deactivated} ürün stok bitti`
      }
    })
    
  } catch (error) {
    console.error('[Products] Error syncing products:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// GET /api/products/turkpin - Tüm Turkpin ürünlerini getir
app.get('/api/products/turkpin', async (req, res) => {
  try {
    console.log('[Products] Getting all Turkpin products...')
    
    const TurkpinService = require('./src/services/TurkpinService.cjs')
    const products = await TurkpinService.getAllProducts()
    
    // Sadece stok > 0 olan ürünleri filtrele
    const inStockProducts = products.filter(product => product.stock > 0)
    
    console.log(`[Products] Found ${inStockProducts.length} products in stock`)
    
    res.json({
      success: true,
      data: inStockProducts.map(product => ({
        epinId: product.epinId,
        epinName: product.epinName,
        productId: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        minOrder: product.min_order
      }))
    })
    
  } catch (error) {
    console.error('[Products] Error fetching Turkpin products:', error.message)
    res.status(500).json({
      success: false,
      message: 'Turkpin bağlantısı kurulamadı'
    })
  }
})

// GET /api/products/selected - Seçili ürünleri getir
app.get('/api/products/selected', async (req, res) => {
  try {
    const selectedProducts = await prisma.selectedProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({
      success: true,
      data: selectedProducts
    })
    
  } catch (error) {
    console.error('[Products] Error fetching selected products:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// POST /api/products/select - Ürün seçimi
app.post('/api/products/select', async (req, res) => {
  try {
    const { productId, epinId, isSelected } = req.body
    
    if (!productId || !epinId || typeof isSelected !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz parametreler'
      })
    }
    
    if (isSelected) {
      // Ürünü seçili olarak ekle
      await prisma.selectedProduct.upsert({
        where: { productId },
        update: { isActive: true },
        create: {
          productId,
          epinId,
          epinName: '', // Bu bilgi Turkpin'den alınabilir
          productName: '', // Bu bilgi Turkpin'den alınabilir
          purchasePrice: 0,
          sellingPrice: 0,
          marginPct: 15
        }
      })
    } else {
      // Ürünü pasif yap
      await prisma.selectedProduct.updateMany({
        where: { productId },
        data: { isActive: false }
      })
    }
    
    res.json({
      success: true,
      message: isSelected ? 'Ürün seçildi' : 'Ürün seçimi kaldırıldı'
    })
    
  } catch (error) {
    console.error('[Products] Error updating product selection:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// TurkpinService test endpoint
app.get('/api/turkpin/test', async (req, res) => {
  try {
    const TurkpinService = require('./src/services/TurkpinService.cjs')
    
    console.log('[Turkpin] Test → Starting...')
    
    // Test checkBalance
    const balanceResult = await TurkpinService.checkBalance()
    
    // Test getEpinList
    const epinListResult = await TurkpinService.getEpinList()
    
    res.json({
      success: true,
      data: {
        balance: balanceResult,
        epinList: epinListResult,
        summary: {
          categoriesFound: epinListResult.length,
          testCompletedAt: new Date().toISOString()
        }
      }
    })
    
  } catch (error) {
    console.error('[Turkpin] Test → Error:', error.message)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Environment variables test route
app.get('/api/test/env', (req, res) => {
  res.json({
    username: process.env.TURKPIN_USERNAME,
    password: process.env.TURKPIN_PASSWORD ? '***' : 'MISSING',
    apiUrl: process.env.TURKPIN_API_URL,
    nodeEnv: process.env.NODE_ENV
  })
})

// Test route for live API
app.get('/api/test/live-api', async (req, res) => {
  try {
    const username = 'eren@omegadijital.com'
    const password = 'ErenYamaha11#.'
    const apiUrl = 'http://localhost:3099/api/turkpin'
    
    // Sandbox service kullan
    const sandboxUrl = 'http://localhost:3099/'
    
    const response = await axios.post(sandboxUrl, 
      new URLSearchParams({ 
        'DATA': `<APIRequest><params><cmd>epinList</cmd><username>${username}</username><password>${password}</password></params></APIRequest>` 
      }),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        timeout: 15000 
      }
    )
    
    res.json({
      success: true,
      data: response.data
    })
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    })
  }
})

// Batch sync products route (parti parti senkronizasyon için)
app.get('/api/products/sync/batch/:batchNumber', async (req, res) => {
  try {
    const { batchNumber } = req.params
    const batchSize = 5 // Her parti sadece 5 oyun
    const skip = (parseInt(batchNumber) - 1) * batchSize
    
    logger.info(`Starting BATCH ${batchNumber} product sync from Turkpin Live API`)
    
    // Önceki sync'leri deaktif et
    await prisma.productSync.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })
    
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: '#text',
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (name === 'oyun' || name === 'urun') return true
        return false
      }
    })

    // Live API'den veri çek
    const makeRequest = async (command, params = {}) => {
      let xml = `<APIRequest>
  <params>
    <username>eren@omegadijital.com</username>
    <password>ErenYamaha11#.</password>
    <cmd>${command}</cmd>`
      
      for (const [key, value] of Object.entries(params)) {
        xml += `\n    <${key}>${value}</${key}>`
      }
      
      xml += `
  </params>
</APIRequest>`
      
      const formData = new URLSearchParams()
      formData.append('DATA', xml)
      
      const response = await axios.post(process.env.TURKPIN_API_URL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 600000 // 10 dakika
      })
      
      // XML parsing yerine doğrudan string manipulation kullan
      const xmlData = response.data
      
      if (command === 'epinOyunListesi') {
        // Oyun listesi parse et
        const oyunMatches = xmlData.match(/<oyun>\s*<id>(.*?)<\/id>\s*<name>(.*?)<\/name>\s*<\/oyun>/gs) || []
        const games = oyunMatches.map(oyunXml => {
          const idMatch = oyunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = oyunXml.match(/<name>(.*?)<\/name>/)
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : ''
          }
        }).filter(game => game.id && game.name)
        
        return {
          oyunListesi: {
            oyun: games
          }
        }
      } else if (command === 'epinUrunleri') {
        // Ürün listesi parse et
        const urunMatches = xmlData.match(/<urun>.*?<\/urun>/gs) || []
        const products = urunMatches.map(urunXml => {
          const idMatch = urunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = urunXml.match(/<name>(.*?)<\/name>/)
          const priceMatch = urunXml.match(/<price>(.*?)<\/price>/)
          const stockMatch = urunXml.match(/<stock>(.*?)<\/stock>/)
          const minOrderMatch = urunXml.match(/<min_order>(.*?)<\/min_order>/)
          const maxOrderMatch = urunXml.match(/<max_order>(.*?)<\/max_order>/)
          
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : '',
            price: priceMatch ? parseFloat(priceMatch[1]) : 0,
            stock: stockMatch ? parseInt(stockMatch[1]) : 0,
            min_order: minOrderMatch ? parseInt(minOrderMatch[1]) : 1,
            max_order: maxOrderMatch ? parseInt(maxOrderMatch[1]) : 0
          }
        }).filter(product => product.id && product.name)
        
        return {
          epinUrunListesi: {
            urun: products
          }
        }
      }
      
      return {}
    }

    const getProducts = async (epinId) => {
      try {
        const response = await makeRequest('epinUrunleri', { oyunKodu: epinId })
        
        if (response.epinUrunListesi && response.epinUrunListesi.urun) {
          const products = Array.isArray(response.epinUrunListesi.urun) 
            ? response.epinUrunListesi.urun 
            : [response.epinUrunListesi.urun]
          
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
      } catch (error) {
        logger.error(`Live API epinUrunleri failed for ${epinId}:`, error.message)
        return []
      }
    }

    // Önce mevcut sync'i al
    const existingSync = await prisma.productSync.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    let categories = existingSync?.syncData?.categories || []
    
    // Live API'den oyun listesini al
    try {
      logger.info('Connecting to Live API (BATCH SYNC)...')
      const liveGames = await makeRequest('epinOyunListesi')
      
      if (liveGames.oyunListesi && liveGames.oyunListesi.oyun) {
        const allGames = Array.isArray(liveGames.oyunListesi.oyun) 
          ? liveGames.oyunListesi.oyun 
          : [liveGames.oyunListesi.oyun]
        
        logger.info(`Found ${allGames.length} total games, processing batch ${batchNumber} (${skip}-${skip + batchSize})`)
        
        // Zaten senkronize edilmiş oyunları filtrele
        const existingGameIds = new Set(categories.map(cat => cat.epinId))
        const gamesToProcess = allGames.filter(game => !existingGameIds.has(game.id))
        
        // Parti halinde işle
        const batchGames = gamesToProcess.slice(skip, skip + batchSize)
        
        logger.info(`Processing ${batchGames.length} games in batch ${batchNumber}`)
        
        for (const game of batchGames) {
          try {
            logger.info(`Processing game: ${game.name} (ID: ${game.id})`)
            const products = await getProducts(game.id)
            if (products.length > 0) {
              categories.push({
                epinId: game.id,
                epinName: game.name,
                products
              })
              logger.info(`✅ Synced ${products.length} products for ${game.name} (ID: ${game.id})`)
            } else {
              logger.info(`⚠️ No products found for ${game.name} (ID: ${game.id})`)
            }
          } catch (error) {
            logger.error(`❌ Failed to sync products for ${game.name}:`, error.message)
          }
        }
        
        // Veritabanını güncelle
        const syncData = {
          categories,
          summary: {
            totalCategories: categories.length,
            totalProducts: categories.reduce((sum, cat) => sum + cat.products.length, 0),
            syncedAt: new Date().toISOString(),
            source: 'batch_sync',
            batchNumber: parseInt(batchNumber),
            totalBatches: Math.ceil(gamesToProcess.length / batchSize),
            remainingGames: Math.max(0, gamesToProcess.length - skip - batchSize)
          }
        }

        // Mevcut sync'i güncelle veya yeni oluştur
        if (existingSync) {
          await prisma.productSync.update({
            where: { id: existingSync.id },
            data: {
              totalCategories: categories.length,
              totalProducts: categories.reduce((sum, cat) => sum + cat.products.length, 0),
              syncData,
              isActive: true
            }
          })
        } else {
          await prisma.productSync.create({
            data: {
              totalCategories: categories.length,
              totalProducts: categories.reduce((sum, cat) => sum + cat.products.length, 0),
              syncData,
              isActive: true
            }
          })
        }

        logger.info(`BATCH ${batchNumber} completed: ${categories.length} categories, ${syncData.summary.totalProducts} products`)
        
        res.json({
          status: 'success',
          data: syncData
        })
      } else {
        logger.error('❌ No games found in Live API response')
        res.status(500).json({
          status: 'error',
          message: 'No games found'
        })
      }
    } catch (error) {
      logger.error('❌ Live API connection failed:', error.message)
      res.status(500).json({
        status: 'error',
        message: error.message
      })
    }
  } catch (error) {
    logger.error('Batch sync failed:', error)
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Force sync products route (yeni senkronizasyon için)
app.get('/api/products/sync/force', async (req, res) => {
  try {
    logger.info('Starting FORCE product sync from Turkpin Live API')
    
    // Önceki sync'leri deaktif et
    await prisma.productSync.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })
    
    // Force sync flag'i ile normal sync logic'ini çalıştır
    // Burada sync logic'ini kopyalayacağız ama force=true parametresi ile
    // Şimdilik doğrudan sync endpoint'ini çağırıyoruz
    req.forceSync = true
    
    // Sync logic'ini buraya kopyalayalım
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: '#text',
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (name === 'oyun' || name === 'urun') return true
        return false
      }
    })

    // Live API'den veri çek
    const makeRequest = async (command, params = {}) => {
      let xml = `<APIRequest>
  <params>
    <username>eren@omegadijital.com</username>
    <password>ErenYamaha11#.</password>
    <cmd>${command}</cmd>`
      
      for (const [key, value] of Object.entries(params)) {
        xml += `\n    <${key}>${value}</${key}>`
      }
      
      xml += `
  </params>
</APIRequest>`
      
      const formData = new URLSearchParams()
      formData.append('DATA', xml)
      
      const response = await axios.post(process.env.TURKPIN_API_URL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 600000 // 10 dakika
      })
      
      // XML parsing yerine doğrudan string manipulation kullan
      const xmlData = response.data
      
      if (command === 'epinOyunListesi') {
        // Oyun listesi parse et - daha iyi regex
        const oyunMatches = xmlData.match(/<oyun>\s*<id>(.*?)<\/id>\s*<name>(.*?)<\/name>\s*<\/oyun>/gs) || []
        const games = oyunMatches.map(oyunXml => {
          const idMatch = oyunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = oyunXml.match(/<name>(.*?)<\/name>/)
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : ''
          }
        }).filter(game => game.id && game.name)
        
        return {
          oyunListesi: {
            oyun: games
          }
        }
      } else if (command === 'epinUrunleri') {
        // Ürün listesi parse et
        const urunMatches = xmlData.match(/<urun>.*?<\/urun>/gs) || []
        const products = urunMatches.map(urunXml => {
          const idMatch = urunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = urunXml.match(/<name>(.*?)<\/name>/)
          const priceMatch = urunXml.match(/<price>(.*?)<\/price>/)
          const stockMatch = urunXml.match(/<stock>(.*?)<\/stock>/)
          const minOrderMatch = urunXml.match(/<min_order>(.*?)<\/min_order>/)
          const maxOrderMatch = urunXml.match(/<max_order>(.*?)<\/max_order>/)
          
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : '',
            price: priceMatch ? parseFloat(priceMatch[1]) : 0,
            stock: stockMatch ? parseInt(stockMatch[1]) : 0,
            min_order: minOrderMatch ? parseInt(minOrderMatch[1]) : 1,
            max_order: maxOrderMatch ? parseInt(maxOrderMatch[1]) : 0
          }
        }).filter(product => product.id && product.name)
        
        return {
          epinUrunListesi: {
            urun: products
          }
        }
      }
      
      return {}
    }

    const getEpinList = async () => {
      try {
        const response = await makeRequest('epinOyunListesi')
        
        if (response.oyunListesi && response.oyunListesi.oyun) {
          const games = Array.isArray(response.oyunListesi.oyun) 
            ? response.oyunListesi.oyun 
            : [response.oyunListesi.oyun]
          
          return games.map(game => ({
            id: game.id,
            name: game.name
          }))
        }
        
        return []
      } catch (error) {
        logger.error('Live API epinOyunListesi failed:', error.message)
        throw error
      }
    }

    const getProducts = async (epinId) => {
      try {
        const response = await makeRequest('epinUrunleri', { oyunKodu: epinId })
        
        if (response.epinUrunListesi && response.epinUrunListesi.urun) {
          const products = Array.isArray(response.epinUrunListesi.urun) 
            ? response.epinUrunListesi.urun 
            : [response.epinUrunListesi.urun]
          
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
      } catch (error) {
        logger.error(`Live API epinUrunleri failed for ${epinId}:`, error.message)
        throw error
      }
    }

    const categories = []
    
    // Doğrudan live API'den oyun listesini al
    try {
      logger.info('Connecting to Live API (FORCE SYNC)...')
      const liveGames = await makeRequest('epinOyunListesi')
      
      if (liveGames.oyunListesi && liveGames.oyunListesi.oyun) {
        const games = Array.isArray(liveGames.oyunListesi.oyun) 
          ? liveGames.oyunListesi.oyun 
          : [liveGames.oyunListesi.oyun]
        
        logger.info(`Found ${games.length} games from Live API`)
        
        // Sadece en popüler 5 oyunu çek
        const popularGames = ['PUBG Mobile', 'VALORANT VP', 'Google Play', 'Steam USD', 'Apple iTunes']
        
        // Popüler oyunları filtrele ve öne al
        const popularGamesToProcess = games.filter(game => 
          popularGames.some(popular => game.name.toLowerCase().includes(popular.toLowerCase()))
        ).sort((a, b) => {
          const aIndex = popularGames.findIndex(popular => a.name.toLowerCase().includes(popular.toLowerCase()))
          const bIndex = popularGames.findIndex(popular => b.name.toLowerCase().includes(popular.toLowerCase()))
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          
          return 0
        })
        
        logger.info(`Processing only ${popularGamesToProcess.length} popular games (reduced from ${games.length})`)
        
        // Sadece popüler oyunları işle
        for (const game of popularGamesToProcess) {
          try {
            logger.info(`Processing popular game: ${game.name} (ID: ${game.id})`)
            const products = await getProducts(game.id)
            if (products.length > 0) {
              categories.push({
                epinId: game.id,
                epinName: game.name,
                products
              })
              logger.info(`✅ Synced ${products.length} products for ${game.name} (ID: ${game.id}) - Total: ${categories.length}/${popularGamesToProcess.length}`)
            } else {
              logger.info(`⚠️ No products found for ${game.name} (ID: ${game.id})`)
            }
          } catch (error) {
            logger.error(`❌ Failed to sync products for ${game.name}:`, error.message)
          }
        }
      } else {
        logger.error('❌ No games found in Live API response')
      }
    } catch (error) {
      logger.error('❌ Live API connection failed:', error.message)
      throw new Error('Live API connection failed: ' + error.message)
    }

    const totalProducts = categories.reduce((sum, epin) => sum + epin.products.length, 0)
    
    // Veritabanına kaydet
    const syncData = {
      categories,
      summary: {
        totalCategories: categories.length,
        totalProducts,
        syncedAt: new Date().toISOString(),
        source: 'live_api'
      }
    }

    // Yeni sync'i kaydet
    await prisma.productSync.create({
      data: {
        totalCategories: categories.length,
        totalProducts,
        syncData,
        isActive: true
      }
    })

    logger.info(`FORCE Sync completed and saved: ${categories.length} categories, ${totalProducts} products`)
    
    res.json({
      status: 'success',
      data: syncData
    })
    
  } catch (error) {
    logger.error('Force sync failed:', error)
    
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Get all categories with products for product management
app.get('/api/turkpin/categories', async (req, res) => {
  try {
    logger.info('Fetching all categories with products from Turkpin Live API')
    
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: '#text',
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (name === 'oyun' || name === 'urun') return true
        return false
      }
    })

    // Önce kategorileri al - Live API
    const categoriesRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.turkpin.com/WebService">
   <soapenv:Header/>
   <soapenv:Body>
      <web:epinOyunListesi>
         <web:kullaniciAdi>${process.env.TURKPIN_USERNAME}</web:kullaniciAdi>
         <web:sifre>${process.env.TURKPIN_PASSWORD}</web:sifre>
      </web:epinOyunListesi>
   </soapenv:Body>
</soapenv:Envelope>`

    const categoriesFormData = new URLSearchParams()
    categoriesFormData.append('DATA', categoriesRequest)

    const categoriesResponse = await axios.post(process.env.TURKPIN_API_URL, categoriesFormData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Omega-Digital/1.0'
      },
      timeout: 60000 // 1 dakika timeout
    })

    const parsedCategories = xmlParser.parse(categoriesResponse.data)
    
    let games = []
    if (parsedCategories?.['soapenv:Envelope']?.['soapenv:Body']?.['web:epinOyunListesiResponse']?.['web:return']) {
      const returnData = parsedCategories['soapenv:Envelope']['soapenv:Body']['web:epinOyunListesiResponse']['web:return']
      
      if (returnData === 'Hatalı kullanıcı adı veya şifre') {
        throw new Error('Turkpin kimlik doğrulama hatası: Kullanıcı adı veya şifre hatalı')
      }
      
      if (Array.isArray(returnData)) {
        games = returnData
      } else if (typeof returnData === 'object') {
        games = [returnData]
      }
    }

    logger.info(`[Turkpin] Found ${games.length} games, fetching products...`)

    // İlk 5 kategoriyi al (test için)
    const limitedGames = games.slice(0, 5)
    
    // Her kategori için ürünleri çek
    const categoriesWithProducts = []
    
    for (const game of limitedGames) {
      try {
        const productsRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.turkpin.com/WebService">
   <soapenv:Header/>
   <soapenv:Body>
      <web:epinUrunleri>
         <web:kullaniciAdi>${process.env.TURKPIN_USERNAME}</web:kullaniciAdi>
         <web:sifre>${process.env.TURKPIN_PASSWORD}</web:sifre>
         <web:epinId>${game.epinId}</web:epinId>
      </web:epinUrunleri>
   </soapenv:Body>
</soapenv:Envelope>`

        const productsFormData = new URLSearchParams()
        productsFormData.append('DATA', productsRequest)

        const productsResponse = await axios.post(process.env.TURKPIN_API_URL, productsFormData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Omega-Digital/1.0'
          },
          timeout: 60000
        })

        const parsedProducts = xmlParser.parse(productsResponse.data)
        
        let products = []
        if (parsedProducts?.['soapenv:Envelope']?.['soapenv:Body']?.['web:epinUrunleriResponse']?.['web:return']) {
          const returnData = parsedProducts['soapenv:Envelope']['soapenv:Body']['web:epinUrunleriResponse']['web:return']
          
          if (returnData === 'Hatalı kullanıcı adı veya şifre') {
            throw new Error('Turkpin kimlik doğrulama hatası')
          }
          
          if (Array.isArray(returnData)) {
            products = returnData
          } else if (typeof returnData === 'object') {
            products = [returnData]
          }
        }

        categoriesWithProducts.push({
          epinId: game.epinId,
          epinName: game.epinName,
          products: products
        })

        logger.info(`[Turkpin] Fetched ${products.length} products for ${game.epinName}`)
        
      } catch (error) {
        logger.warn(`Failed to fetch products for ${game.epinName}:`, error.message)
        // Hata olsa da kategoriyi ekle, ürünleri boş olsun
        categoriesWithProducts.push({
          epinId: game.epinId,
          epinName: game.epinName,
          products: []
        })
      }
    }

    const totalProducts = categoriesWithProducts.reduce((sum, cat) => sum + cat.products.length, 0)

    res.json({
      success: true,
      data: categoriesWithProducts,
      summary: {
        totalCategories: categoriesWithProducts.length,
        totalProducts,
        fetchedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Categories with products fetch failed:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Sync selected products
app.post('/api/products/sync-selected', async (req, res) => {
  try {
    const { productIds } = req.body
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Geçersiz ürün ID listesi'
      })
    }

    logger.info(`Syncing selected products: ${productIds.length} items`)

    // Önce mevcut cache'i kontrol et
    if (memoryCache) {
      // Mevcut cache'den seçili ürünleri filtrele
      const filteredCategories = memoryCache.syncData.categories.map(category => ({
        ...category,
        products: category.products.filter(product => productIds.includes(product.id))
      })).filter(category => category.products.length > 0)

      const totalProducts = filteredCategories.reduce((sum, cat) => sum + cat.products.length, 0)
      
      const syncData = {
        categories: filteredCategories,
        summary: {
          totalCategories: filteredCategories.length,
          totalProducts,
          syncedAt: new Date().toISOString(),
          source: 'selected_sync',
          selectedProducts: productIds.length
        }
      }

      // Memory cache'i güncelle
      memoryCache = {
        totalCategories: filteredCategories.length,
        totalProducts,
        syncData,
        createdAt: new Date()
      }

      // Veritabanına kaydet (mümkünse)
      if (prisma) {
        try {
          await prisma.productSync.updateMany({
            where: { isActive: true },
            data: { isActive: false }
          })

          await prisma.productSync.create({
            data: {
              totalCategories: filteredCategories.length,
              totalProducts,
              syncData,
              isActive: true
            }
          })
        } catch (dbError) {
          logger.warn('Database save failed:', dbError.message)
        }
      }

      logger.info(`Selected products sync completed: ${filteredCategories.length} categories, ${totalProducts} products`)

      res.json({
        status: 'success',
        data: syncData,
        message: `${productIds.length} ürün başarıyla senkronize edildi`
      })
    } else {
      // Cache yoksa hata döndür
      res.status(400).json({
        status: 'error',
        message: 'Önce tam senkronizasyon yapmanız gerekiyor'
      })
    }

  } catch (error) {
    logger.error('Selected products sync failed:', error)
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Products sync route
app.get('/api/products/sync', async (req, res) => {
  try {
    logger.info('Starting product sync from Turkpin Live API')
    
    // Önce veritabanında aktif sync var mı kontrol et
    if (prisma) {
      try {
        const existingSync = await prisma.productSync.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        })

        if (existingSync) {
          logger.info('Found existing sync in database, returning cached data')
          return res.json({
            status: 'success',
            data: existingSync.syncData,
            summary: existingSync.syncData.summary
          })
        }
      } catch (dbError) {
        logger.warn('Database query failed, trying memory cache:', dbError.message)
      }
    }

    // Memory cache kontrolü
    if (memoryCache) {
      logger.info('Found existing sync in memory, returning cached data')
      return res.json({
        status: 'success',
        data: memoryCache.syncData,
        summary: memoryCache.syncData.summary
      })
    }
    
    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: '#text',
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (name === 'oyun' || name === 'urun') return true
        return false
      }
    })

    // Live API'den veri çek
    const makeRequest = async (command, params = {}) => {
      // Debug credentials
      console.log('=== DEBUG INFO ===')
      console.log('Username:', process.env.TURKPIN_USERNAME)
      console.log('Password:', process.env.TURKPIN_PASSWORD ? '***' : 'MISSING')
      console.log('API URL:', process.env.TURKPIN_API_URL)
      console.log('Command:', command)
      console.log('==================')
      
      let xml = `<APIRequest>
  <params>
    <username>eren@omegadijital.com</username>
    <password>ErenYamaha11#.</password>
    <cmd>${command}</cmd>`
      
      for (const [key, value] of Object.entries(params)) {
        xml += `\n    <${key}>${value}</${key}>`
      }
      
      xml += `
  </params>
</APIRequest>`
      
      console.log('Generated XML:', xml)
      
      const formData = new URLSearchParams()
      formData.append('DATA', xml)
      
      const response = await axios.post(process.env.TURKPIN_API_URL, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 600000 // 10 dakika
      })
      
      // XML parsing yerine doğrudan string manipulation kullan
      const xmlData = response.data
      
      console.log(`=== RAW XML for ${command} ===`)
      console.log(xmlData.substring(0, 1000) + '...')
      console.log('==========================')
      
      if (command === 'epinOyunListesi') {
        // Oyun listesi parse et - daha iyi regex
        const oyunMatches = xmlData.match(/<oyun>\s*<id>(.*?)<\/id>\s*<name>(.*?)<\/name>\s*<\/oyun>/gs) || []
        console.log(`Found ${oyunMatches.length} oyun matches`)
        
        const games = oyunMatches.map(oyunXml => {
          const idMatch = oyunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = oyunXml.match(/<name>(.*?)<\/name>/)
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : ''
          }
        }).filter(game => game.id && game.name)
        
        console.log(`Parsed ${games.length} games from XML`)
        console.log('Sample games:', games.slice(0, 3))
        
        return {
          oyunListesi: {
            oyun: games
          }
        }
      } else if (command === 'epinUrunleri') {
        // Ürün listesi parse et
        const urunMatches = xmlData.match(/<urun>.*?<\/urun>/gs) || []
        const products = urunMatches.map(urunXml => {
          const idMatch = urunXml.match(/<id>(.*?)<\/id>/)
          const nameMatch = urunXml.match(/<name>(.*?)<\/name>/)
          const priceMatch = urunXml.match(/<price>(.*?)<\/price>/)
          const stockMatch = urunXml.match(/<stock>(.*?)<\/stock>/)
          const minOrderMatch = urunXml.match(/<min_order>(.*?)<\/min_order>/)
          const maxOrderMatch = urunXml.match(/<max_order>(.*?)<\/max_order>/)
          
          return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1] : '',
            price: priceMatch ? parseFloat(priceMatch[1]) : 0,
            stock: stockMatch ? parseInt(stockMatch[1]) : 0,
            min_order: minOrderMatch ? parseInt(minOrderMatch[1]) : 1,
            max_order: maxOrderMatch ? parseInt(maxOrderMatch[1]) : 0
          }
        }).filter(product => product.id && product.name)
        
        return {
          epinUrunListesi: {
            urun: products
          }
        }
      }
      
      return {}
    }

    const getEpinList = async () => {
      try {
        const response = await makeRequest('epinOyunListesi')
        
        if (response.oyunListesi && response.oyunListesi.oyun) {
          const games = Array.isArray(response.oyunListesi.oyun) 
            ? response.oyunListesi.oyun 
            : [response.oyunListesi.oyun]
          
          return games.map(game => ({
            id: game.id,
            name: game.name
          }))
        }
        
        return []
      } catch (error) {
        logger.error('Live API epinOyunListesi failed:', error.message)
        throw error
      }
    }

    const getProducts = async (epinId) => {
      try {
        const response = await makeRequest('epinUrunleri', { oyunKodu: epinId })
        
        if (response.epinUrunListesi && response.epinUrunListesi.urun) {
          const products = Array.isArray(response.epinUrunListesi.urun) 
            ? response.epinUrunListesi.urun 
            : [response.epinUrunListesi.urun]
          
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
      } catch (error) {
        logger.error(`Live API epinUrunleri failed for ${epinId}:`, error.message)
        throw error
      }
    }

    const categories = []
    
    // Doğrudan live API'den oyun listesini al
    try {
      logger.info('Connecting to Live API...')
      const liveGames = await makeRequest('epinOyunListesi')
      
      console.log('=== LIVE API RESPONSE ===')
      console.log('Response:', JSON.stringify(liveGames, null, 2))
      console.log('========================')
      
      if (liveGames.oyunListesi && liveGames.oyunListesi.oyun) {
        const games = Array.isArray(liveGames.oyunListesi.oyun) 
          ? liveGames.oyunListesi.oyun 
          : [liveGames.oyunListesi.oyun]
        
        logger.info(`Found ${games.length} games from Live API`)
        
        // Sadece en popüler 5 oyunu çek
        const popularGames = ['PUBG Mobile', 'VALORANT VP', 'Google Play', 'Steam USD', 'Apple iTunes']
        
        // Popüler oyunları filtrele ve öne al
        const popularGamesToProcess = games.filter(game => 
          popularGames.some(popular => game.name.toLowerCase().includes(popular.toLowerCase()))
        ).sort((a, b) => {
          const aIndex = popularGames.findIndex(popular => a.name.toLowerCase().includes(popular.toLowerCase()))
          const bIndex = popularGames.findIndex(popular => b.name.toLowerCase().includes(popular.toLowerCase()))
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          
          return 0
        })
        
        logger.info(`Processing only ${popularGamesToProcess.length} popular games (reduced from ${games.length})`)
        
        // Sadece popüler oyunları işle
        for (const game of popularGamesToProcess) {
          try {
            logger.info(`Processing popular game: ${game.name} (ID: ${game.id})`)
            const products = await getProducts(game.id)
            if (products.length > 0) {
              categories.push({
                epinId: game.id,
                epinName: game.name,
                products
              })
              logger.info(`✅ Synced ${products.length} products for ${game.name} (ID: ${game.id}) - Total: ${categories.length}/${popularGamesToProcess.length}`)
            } else {
              logger.info(`⚠️ No products found for ${game.name} (ID: ${game.id})`)
            }
          } catch (error) {
            logger.error(`❌ Failed to sync products for ${game.name}:`, error.message)
          }
        }
      } else {
        logger.error('❌ No games found in Live API response')
        console.log('Response keys:', Object.keys(liveGames))
      }
    } catch (error) {
      logger.error('❌ Live API connection failed:', error.message)
      console.error('Error details:', error)
      throw new Error('Live API connection failed: ' + error.message)
    }

    const totalProducts = categories.reduce((sum, epin) => sum + epin.products.length, 0)
    
    // Veritabanına kaydet
    const syncData = {
      categories,
      summary: {
        totalCategories: categories.length,
        totalProducts,
        syncedAt: new Date().toISOString(),
        source: 'live_api'
      }
    }

    // Memory cache'e kaydet
    memoryCache = {
      totalCategories: categories.length,
      totalProducts,
      syncData,
      createdAt: new Date()
    }

    // Veritabanına kaydet (mümkünse)
    if (prisma) {
      try {
        // Önceki sync'leri deaktif et
        await prisma.productSync.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        })

        // Yeni sync'i kaydet
        await prisma.productSync.create({
          data: {
            totalCategories: categories.length,
            totalProducts,
            syncData,
            isActive: true
          }
        })
        logger.info(`Sync completed and saved to database: ${categories.length} categories, ${totalProducts} products`)
      } catch (dbError) {
        logger.warn('Database save failed, using memory cache only:', dbError.message)
      }
    } else {
      logger.info(`Sync completed and saved to memory: ${categories.length} categories, ${totalProducts} products`)
    }
    
    res.json({
      status: 'success',
      data: syncData,
      summary: syncData.summary
    })
    
  } catch (error) {
    logger.error('Product sync failed:', error)
    
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// System health
app.get('/system/health', async (req, res) => {
  try {
    const startTime = Date.now()
    let turkpinStatus = 'error'
    let turkpinLatency = 0
    let turkpinBalance = 0
    
    try {
      const balance = await turkpinService.checkBalance()
      turkpinStatus = 'healthy'
      turkpinLatency = Date.now() - startTime
      turkpinBalance = balance.balance
    } catch (error) {
      turkpinStatus = 'error'
      turkpinLatency = Date.now() - startTime
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        turkpin: {
          status: turkpinStatus,
          latencyMs: turkpinLatency,
          balance: turkpinBalance
        },
        api: {
          status: 'healthy',
          uptime: process.uptime()
        }
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  })

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})

// Start server
const PORT = process.env.PORT || 3003
app.listen(PORT, () => {
  logger.info(`Omega Backend başlatıldı — port ${PORT}`)
  logger.info(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`)
})

module.exports = app
