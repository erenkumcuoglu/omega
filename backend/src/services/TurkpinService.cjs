const axios = require('axios')

class TurkpinService {
  constructor() {
    this.baseURL = process.env.TURKPIN_API_URL || 'https://www.turkpin.com/api.php'
    this.username = process.env.TURKPIN_USERNAME
    this.password = process.env.TURKPIN_PASSWORD
    this.timeout = 15000
    
    // Canlı API'ya devam et
    console.log('[Turkpin] Using live API:', this.baseURL)
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retryRequest(fn, retries = 3, delay = 1000) {
    try {
      return await fn()
    } catch (error) {
      if (retries === 0) throw error
      
      console.log(`[Turkpin] Retry remaining: ${retries}, waiting ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return this.retryRequest(fn, retries - 1, delay * 2)
    }
  }

  /**
   * Make API request with logging
   */
  async makeRequest(params) {
    const startTime = Date.now()
    
    try {
      const response = await this.retryRequest(async () => {
        return await axios.post(this.baseURL, 
          new URLSearchParams(params), 
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Accept-Language': 'tr-TR,tr;q=0.9',
              'Connection': 'keep-alive'
            },
            timeout: this.timeout
          }
        )
      })

      const duration = Date.now() - startTime
      console.log(`[Turkpin] ${params.cmd || 'request'} → ${duration}ms → Success`)
      console.log('[Turkpin] Response:', response.data)
      
      return response.data
    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`[Turkpin] ${params.cmd || 'request'} → ${duration}ms → Error: ${error.message}`)
      
      // Live API hata verirse hata fırlat
      if (error.response?.status === 403 || error.code === 'ECONNREFUSED') {
        console.log('[Turkpin] Live API failed with 403/Connection Refused')
        throw new Error(`Turkpin API connection failed: ${error.message}`)
      }
      
      throw error
    }
  }

  /**
   * Mock data fallback
   */
  getMockResponse(cmd, epinId) {
    const mockResponses = {
      epinList: `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <category>
    <id>44</id>
    <name>Steam USD</name>
    <productCount>5</productCount>
  </category>
  <category>
    <id>1360</id>
    <name>PUBG Mobile</name>
    <productCount>3</productCount>
  </category>
  <category>
    <id>1380</id>
    <name>VALORANT VP</name>
    <productCount>3</productCount>
  </category>
  <category>
    <id>1395</id>
    <name>Apple iTunes</name>
    <productCount>3</productCount>
  </category>
  <category>
    <id>1401</id>
    <name>Xbox Game Pass</name>
    <productCount>2</productCount>
  </category>
</result>`,
      
      epinProducts: `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>8886</id>
    <name>Steam USA 5 USD</name>
    <price>231.47</price>
    <stock>100</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8887</id>
    <name>Steam USA 10 USD</name>
    <price>462.93</price>
    <stock>150</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8677</id>
    <name>Steam USA 20 USD</name>
    <price>925.87</price>
    <stock>200</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8676</id>
    <name>Steam USA 50 USD</name>
    <price>2276.17</price>
    <stock>180</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8952</id>
    <name>Steam USA 100 USD</name>
    <price>4813.61</price>
    <stock>140</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`,
      
      checkBalance: `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <balance>10000.00</balance>
  <currency>TRY</currency>
</result>`
    }
    
    if (cmd === 'epinProducts' && epinId) {
      const products = {
        '44': `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>8886</id>
    <name>Steam USA 5 USD</name>
    <price>231.47</price>
    <stock>100</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8887</id>
    <name>Steam USA 10 USD</name>
    <price>462.93</price>
    <stock>150</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8677</id>
    <name>Steam USA 20 USD</name>
    <price>925.87</price>
    <stock>200</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8676</id>
    <name>Steam USA 50 USD</name>
    <price>2276.17</price>
    <stock>180</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>8952</id>
    <name>Steam USA 100 USD</name>
    <price>4813.61</price>
    <stock>140</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`,
        
        '1360': `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>31956</id>
    <name>PUBG Mobile 60 UC</name>
    <price>39.19</price>
    <stock>250</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>31957</id>
    <name>PUBG Mobile 180 UC</name>
    <price>117.57</price>
    <stock>180</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>31958</id>
    <name>PUBG Mobile 325 UC</name>
    <price>211.67</price>
    <stock>120</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`,
        
        '1380': `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>32000</id>
    <name>VALORANT 475 VP</name>
    <price>95.00</price>
    <stock>200</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>32001</id>
    <name>VALORANT 1000 VP</name>
    <price>190.00</price>
    <stock>150</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>32002</id>
    <name>VALORANT 2050 VP</name>
    <price>389.50</price>
    <stock>100</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`,
        
        '1395': `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>32050</id>
    <name>iTunes USA 5 USD</name>
    <price>185.50</price>
    <stock>180</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>32051</id>
    <name>iTunes USA 10 USD</name>
    <price>371.00</price>
    <stock>140</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>32052</id>
    <name>iTunes USA 15 USD</name>
    <price>556.50</price>
    <stock>100</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`,
        
        '1401': `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <product>
    <id>32100</id>
    <name>Xbox Game Pass 1 Month</name>
    <price>149.99</price>
    <stock>120</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
  <product>
    <id>32101</id>
    <name>Xbox Game Pass 3 Months</name>
    <price>399.99</price>
    <stock>80</stock>
    <min_order>1</min_order>
    <max_order>0</max_order>
  </product>
</result>`
      }
      
      return products[epinId] || '<?xml version="1.0" encoding="UTF-8"?><result></result>'
    }
    
    return mockResponses[cmd] || '<?xml version="1.0" encoding="UTF-8"?><result></result>'
  }

  /**
   * Get all epin categories
   */
  async getEpinList() {
    const params = {
      DATA: `<?xml version="1.0" encoding="UTF-8"?>
<APIRequest>
  <params>
    <kullaniciadi>${this.username}</kullaniciadi>
    <sifre>${this.password}</sifre>
    <cmd>epinOyunListesi</cmd>
  </params>
</APIRequest>`
    }

    const response = await this.makeRequest(params)
    
    // Parse XML response
    const xmlParser = require('fast-xml-parser').XMLParser
    const parser = new xmlParser({
      ignoreAttributes: true,
      parseTagValue: true,
      trimValues: true,
      isArray: (name) => name === 'category' || name === 'epinOyunListesiReturn' || name === 'item'
    })

    const parsed = parser.parse(response)
    
    // API response formatına göre parse et
    let categories = []
    
    if (parsed.APIResponse?.params?.category) {
      categories = Array.isArray(parsed.APIResponse.params.category) 
        ? parsed.APIResponse.params.category 
        : [parsed.APIResponse.params.category]
    } else if (parsed.result?.category) {
      categories = Array.isArray(parsed.result.category) 
        ? parsed.result.category 
        : [parsed.result.category]
    }

    return categories.map(cat => ({
      id: cat.id || cat.epinId || cat.EPIN_ID,
      name: cat.name || cat.epinName || cat.EPIN_ADI
    }))
  }

  /**
   * Get products for specific epin category
   */
  async getProducts(epinId) {
    const params = {
      DATA: `<?xml version="1.0" encoding="UTF-8"?>
<APIRequest>
  <params>
    <kullaniciadi>${this.username}</kullaniciadi>
    <sifre>${this.password}</sifre>
    <cmd>epinUrunleri</cmd>
    <epinid>${epinId}</epinid>
  </params>
</APIRequest>`
    }

    const response = await this.makeRequest(params)
    
    // Parse XML response
    const xmlParser = require('fast-xml-parser').XMLParser
    const parser = new xmlParser({
      ignoreAttributes: true,
      parseTagValue: true,
      trimValues: true,
      isArray: (name) => name === 'product' || name === 'epinUrunleriReturn' || name === 'item'
    })

    const parsed = parser.parse(response)
    
    // API response formatına göre parse et
    let products = []
    
    if (parsed.APIResponse?.params?.product) {
      products = Array.isArray(parsed.APIResponse.params.product) 
        ? parsed.APIResponse.params.product 
        : [parsed.APIResponse.params.product]
    } else if (parsed.result?.product) {
      products = Array.isArray(parsed.result.product) 
        ? parsed.result.product 
        : [parsed.result.product]
    }

    // Filter only products with stock > 0
    return products
      .filter(product => {
        const stock = parseInt(product.stock || product.STOK || 0)
        return stock > 0
      })
      .map(product => ({
        id: product.id || product.URUN_ID,
        name: product.name || product.URUN_ADI,
        price: parseFloat(product.price || product.FIYAT) || 0,
        stock: parseInt(product.stock || product.STOK) || 0,
        min_order: parseInt(product.min_order || product.MIN_SIPARIS) || 1,
        max_order: parseInt(product.max_order || product.MAX_SIPARIS) || 0
      }))
  }

  /**
   * Get all products from all categories (parallel requests)
   */
  async getAllProducts() {
    console.log('[Turkpin] getAllProducts → Starting...')
    
    const categories = await this.getEpinList()
    console.log(`[Turkpin] Found ${categories.length} categories`)

    // Make parallel requests for all categories
    const productPromises = categories.map(async (category) => {
      try {
        const products = await this.getProducts(category.id)
        return products.map(product => ({
          ...product,
          epinId: category.id,
          epinName: category.name
        }))
      } catch (error) {
        console.log(`[Turkpin] Failed to get products for ${category.name}: ${error.message}`)
        return []
      }
    })

    const results = await Promise.all(productPromises)
    const allProducts = results.flat()

    console.log(`[Turkpin] getAllProducts → ${allProducts.length} products total`)
    return allProducts
  }

  /**
   * Create order
   */
  async createOrder(epinId, productId, qty = 1) {
    const params = {
      cmd: 'epinOrder',
      username: this.username,
      password: this.password,
      epin_id: epinId,
      product_id: productId,
      qty: qty.toString()
    }

    return await this.makeRequest(params)
  }

  /**
   * Check balance
   */
  async checkBalance() {
    const params = {
      cmd: 'checkBalance',
      username: this.username,
      password: this.password
    }

    return await this.makeRequest(params)
  }
}

module.exports = new TurkpinService()
