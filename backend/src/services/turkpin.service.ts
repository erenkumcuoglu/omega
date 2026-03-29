import axios, { AxiosInstance } from 'axios'
import { XMLParser } from 'fast-xml-parser'
import logger from '../utils/logger'
import { config } from '../config/env'

const TURKPIN_ERRORS: Record<string, string> = {
  '1': 'Kullanıcı bulunamadı',
  '2': 'IP adresi yetkisiz',
  '3': 'Geçersiz komut',
  '5': 'İşlem hatası',
  '6': 'Bu hesap API kullanımına yetkili değil',
  '7': 'Bu hesap API için aktif değil',
  '11': 'Ürün bulunamadı',
  '12': 'Ürün stokta yok',
  '13': 'Minimum sipariş adedi hatası',
  '14': 'Bayi bakiyesi yetersiz',
  '18': 'Maksimum sipariş adedi hatası',
  '23': 'Sistem bakımda',
  '99': 'Sipariş bulunamadı'
}

export interface BalanceResult {
  balance: number
  credit: number
  bonus: number
  spending: number
}

export interface EpinCategory {
  id: string
  name: string
}

export interface TurkpinProduct {
  id: string
  name: string
  stock: number
  minOrder: number
  maxOrder: number
  price: number
}

export interface OrderResult {
  status: 'Success' | 'Error'
  orderNo: string
  totalAmount: number
  codes: Array<{ code: string, desc: string }>
}

export interface OrderStatus {
  statusCode: string
  orderNo: string
  orderStatus: string
  checkDate: string
  cancelReason?: string
}

export interface TurkpinError extends Error {
  code?: string
  isOutOfStock?: boolean
  isInsufficientBalance?: boolean
  isMaintenance?: boolean
}

class TurkpinService {
  private username: string
  private password: string
  private baseUrl: string
  private axiosInstance: AxiosInstance
  private xmlParser: XMLParser

  constructor() {
    this.username = config.turkpin.username
    this.password = config.turkpin.password
    this.baseUrl = config.turkpin.apiUrl
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        // Don't retry on 4xx errors (client errors)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error
        }
        
        // Don't retry on network errors that are clearly auth failures
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw error
        }

        if (attempt === maxRetries - 1) {
          throw error
        }

        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('Max retries exceeded')
  }

  private parseXML(xmlString: string): any {
    try {
      logger.info('[Turkpin] Raw XML Response:', xmlString)
      const result = this.xmlParser.parse(xmlString)
      logger.info('[Turkpin] Parsed XML Response:', JSON.stringify(result, null, 2))
      
      // Extract params from APIRequest format (like PHP source)
      if (result.APIRequest && result.APIRequest.params) {
        return result.APIRequest.params
      }
      
      return result
    } catch (error) {
      logger.error('XML Parse Error:', { xmlString, error })
      throw new Error('Failed to parse XML response')
    }
  }

  private handleTurkpinError(responseData: any): void {
    // Check for error codes based on PHP source
    const errorCode = responseData?.HATA_NO || responseData?.error || responseData?.code
    
    if (!errorCode || errorCode === '000') {
      return // No error
    }
    
    const errorMessage = responseData?.HATA_ACIKLAMA || responseData?.error_desc || responseData?.message || 'Unknown error'
    
    logger.error('[Turkpin] API Error:', { errorCode, errorMessage })
    
    const error: any = new Error(errorMessage)
    error.code = errorCode

    // Add special flags for specific error codes
    if (errorCode === '12') error.isOutOfStock = true
    if (errorCode === '14') error.isInsufficientBalance = true
    if (errorCode === '23') error.isMaintenance = true

    throw error
  }

  private async makeRequest(command: string, params: Record<string, any> = {}): Promise<any> {
    const maxRetries = 3
    let lastError: any

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startTime = Date.now()
      
      try {
        // Build XML request according to Turkpin API format
        const xmlRequest = this.buildXMLRequest(command, params)
        
        console.log(`[Turkpin] ${command} → Request XML:`, xmlRequest)
        
        // Send as form-data with DATA parameter (like PHP source)
        const formData = new URLSearchParams()
        formData.append('DATA', xmlRequest)
        
        console.log(`[Turkpin] ${command} → Form Data:`, formData.toString())
        
        const response = await axios.post(this.baseUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Omega-Digital/1.0'
          },
          timeout: 15000
        })

        const latency = Date.now() - startTime
        logger.info(`[Turkpin] ${command} → ${latency}ms → OK`)

        // Parse XML response
        const parsedResponse = this.parseXML(response.data)
        this.handleTurkpinError(parsedResponse)
        
        return parsedResponse

      } catch (error: any) {
        lastError = error
        const latency = Date.now() - startTime
        logger.error(`[Turkpin] ${command} → ${latency}ms → ERROR`, error.message)
        
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error('Max retries exceeded')
  }

  private buildXMLRequest(command: string, params: Record<string, any>): string {
    // Build XML according to Turkpin API format from PHP source
    let xml = `<?xml version="1.0"?>
<APIRequest>
  <params>
    <username>${this.username}</username>
    <password>${this.password}</password>
    <cmd>${command}</cmd>`
    
    // Add extra parameters
    for (const [key, value] of Object.entries(params)) {
      xml += `\n    <${key}>${value}</${key}>`
    }
    
    xml += `
  </params>
</APIRequest>`
    
    return xml
  }

  async checkBalance(): Promise<BalanceResult> {
    const response = await this.makeRequest('checkBalance')
    const result = response.result || response

    return {
      balance: parseFloat(result.balance || 0),
      credit: parseFloat(result.credit || 0),
      bonus: parseFloat(result.bonus || 0),
      spending: parseFloat(result.spending || 0)
    }
  }

  async getEpinList(): Promise<EpinCategory[]> {
    // Try different commands
    const commands = ['epinList', 'epin_list', 'listEpins', 'getEpins']
    
    for (const cmd of commands) {
      try {
        logger.info(`[Turkpin] Trying command: ${cmd}`)
        const response = await this.makeRequest(cmd)
        logger.info(`[Turkpin] Command ${cmd} response:`, JSON.stringify(response, null, 2))
        
        const epins = response.epins?.epin || response.epin || response.epins || []
        
        if (epins && epins.length > 0) {
          const categories = Array.isArray(epins) ? epins : [epins]
          return categories.map((epin: any) => ({
            id: epin.id || epin.epin_id || epin.ID,
            name: epin.name || epin.epin_name || epin.NAME || epin.title
          }))
        }
      } catch (error) {
        logger.warn(`[Turkpin] Command ${cmd} failed:`, error)
        continue
      }
    }
    
    logger.warn('[Turkpin] No epin categories found with any command')
    return []
  }

  async getProducts(epinId: string): Promise<TurkpinProduct[]> {
    const response = await this.makeRequest('epinProducts', { epin_id: epinId })
    const products = response.products?.product || []

    if (!Array.isArray(products)) {
      return [products].map((product: any) => ({
        id: product.id || product.product_id,
        name: product.name || product.product_name,
        stock: parseInt(product.stock || 0),
        minOrder: parseInt(product.min_order || 1),
        maxOrder: parseInt(product.max_order || 999),
        price: parseFloat(product.price || 0)
      }))
    }

    const productList = products.map((product: any) => ({
      id: product.id || product.product_id,
      name: product.name || product.product_name,
      stock: parseInt(product.stock || 0),
      minOrder: parseInt(product.min_order || 1),
      maxOrder: parseInt(product.max_order || 999),
      price: parseFloat(product.price || 0)
    }))

    logger.info(`[Turkpin] getProducts(epinId: ${epinId}) → ${productList.length} ürün`)
    return productList
  }

  async createOrder(
    epinId: string,
    productId: string,
    qty: number
  ): Promise<OrderResult> {
    const response = await this.makeRequest('epinOrder', {
      epin_id: epinId,
      product_id: productId,
      qty: qty.toString()
    })

    const result = response.result || response

    // Parse codes if they exist
    let codes: Array<{ code: string, desc: string }> = []
    if (result.codes) {
      if (Array.isArray(result.codes.code)) {
        codes = result.codes.code.map((codeItem: any) => ({
          code: codeItem.code || codeItem,
          desc: codeItem.desc || ''
        }))
      } else {
        codes = [{
          code: result.codes.code,
          desc: result.codes.desc || ''
        }]
      }
    }

    return {
      status: result.status === 'Success' ? 'Success' : 'Error',
      orderNo: result.orderNo || result.order_no || '',
      totalAmount: parseFloat(result.totalAmount || result.total_amount || 0),
      codes
    }
  }

  async checkOrderStatus(orderNo: string): Promise<OrderStatus> {
    const response = await this.makeRequest('checkStatus', {
      order_no: orderNo
    })

    const result = response.result || response

    return {
      statusCode: result.statusCode || result.status_code || '',
      orderNo: result.orderNo || result.order_no || orderNo,
      orderStatus: result.orderStatus || result.order_status || '',
      checkDate: result.checkDate || result.check_date || '',
      cancelReason: result.cancelReason || result.cancel_reason
    }
  }
}

export default TurkpinService
