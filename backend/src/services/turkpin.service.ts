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
        
        try {
          const response = await axios.post(this.baseUrl, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Omega-Digital/1.0'
            },
            timeout: 15000
          })

          logger.info(`[Turkpin] ${command} → ${response.status} → ${response.statusText}`)
          logger.info('[Turkpin] Raw Response:', response.data)
          
          const parsedResponse = this.parseXML(response.data)
          this.handleTurkpinError(parsedResponse)
          
          return parsedResponse
        } catch (error: any) {
          logger.error(`[Turkpin] ${command} → ${error.response?.status || 'NO_STATUS'} → ${error.message}`)
          
          if (error.response?.data) {
            logger.error('[Turkpin] Error Response:', error.response.data)
          }
          
          throw error
        }

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
    try {
      // Sandbox'da sadece epinList komutu çalışıyor
      const response = await this.makeRequest('epinList')
      
      logger.info('[Turkpin] epinList response:', JSON.stringify(response, null, 2))
      
      // Sandbox response formatını parse et
      if (response.result && response.result.category) {
        const categories = Array.isArray(response.result.category) 
          ? response.result.category 
          : [response.result.category]
        
        const result = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          productCount: 0 // Sandbox'ta bu bilgi yok
        }))
        
        logger.info('[Turkpin] Parsed categories:', JSON.stringify(result, null, 2))
        return result
      }
      
      return []
    } catch (error) {
      logger.error('[Turkpin] getEpinList error:', error)
      throw error
    }
  }

  async getProducts(epinId: string): Promise<TurkpinProduct[]> {
    try {
      // Sandbox'da epinProducts komutunu kullan
      const response = await this.makeRequest('epinProducts', { epinId })
      
      logger.info(`[Turkpin] epinProducts response for ${epinId}:`, JSON.stringify(response, null, 2))
      
      // Sandbox response formatını parse et
      if (response.result && response.result.product) {
        const products = Array.isArray(response.result.product) 
          ? response.result.product 
          : [response.result.product]
        
        return products.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price || 0),
          stock: parseInt(product.stock || 0),
          minOrder: parseInt(product.min_order || 1),
          maxOrder: parseInt(product.max_order || 0),
          taxType: product.taxType || []
        }))
      }
      
      return []
    } catch (error) {
      logger.error('[Turkpin] getProducts error:', error)
      throw error
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
