const express = require('express')
const axios = require('axios')
const { XMLParser } = require('fast-xml-parser')
const cors = require('cors')

const app = express()

// Enable CORS for all origins
app.use(cors())
app.use(express.json())

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
})

// Sandbox'tan veri çeken servis
class SandboxService {
  constructor() {
    this.baseUrl = 'http://localhost:3099'
  }

  async makeRequest(command, params = {}) {
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
    
    const response = await axios.post(this.baseUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 15000
    })
    
    return xmlParser.parse(response.data)
  }

  async getEpinList() {
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
  }

  async getProducts(epinId) {
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
  }
}

const sandboxService = new SandboxService()

app.get('/api/products/sync', async (req, res) => {
  try {
    console.log('Starting product sync from Sandbox...')
    
    const categories = []
    const epinList = await sandboxService.getEpinList()
    
    console.log(`Found ${epinList.length} categories`)
    
    for (const epin of epinList) {
      try {
        const products = await sandboxService.getProducts(epin.id)
        categories.push({
          epinId: epin.id,
          epinName: epin.name,
          products
        })
        console.log(`Synced ${products.length} products from ${epin.name}`)
      } catch (error) {
        console.error(`Failed to sync products for ${epin.name}:`, error.message)
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
    
    console.log(`Product sync completed: ${categories.length} categories, ${totalProducts} products`)
    
  } catch (error) {
    console.error('Product sync failed:', error)
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test server is running!',
    timestamp: new Date().toISOString()
  })
})

const PORT = 3004
app.listen(PORT, () => {
  console.log(`Test server started on port ${PORT}`)
  console.log(`Sync endpoint: http://localhost:${PORT}/api/products/sync`)
})
