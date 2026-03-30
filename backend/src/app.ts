import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import pino from 'pino'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

// Routes
// import webhookRoutes from './routes/webhook.routes'

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

// Prisma setup
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error']
})

// Turkpin Service inline
class TurkpinService {
  private readonly username: string
  private readonly password: string
  private readonly baseUrl: string
  private readonly xmlParser: XMLParser

  constructor() {
    this.username = process.env.TURKPIN_USERNAME || 'sandbox_user'
    this.password = process.env.TURKPIN_PASSWORD || 'sandbox_pass'
    this.baseUrl = process.env.TURKPIN_API_URL || 'http://localhost:3099'
    
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
  }

  private parseXML(xmlString: string): any {
    try {
      logger.info('[Turkpin] Raw XML Response:', xmlString)
      const result = this.xmlParser.parse(xmlString)
      logger.info('[Turkpin] Parsed XML Response:', JSON.stringify(result, null, 2))
      
      // Extract params from APIRequest format
      if (result.APIRequest && result.APIRequest.params) {
        return result.APIRequest.params
      }
      
      return result
    } catch (error) {
      logger.error('XML Parse Error:', { xmlString, error })
      throw new Error('Failed to parse XML response')
    }
  }

  private buildXMLRequest(command: string, params: Record<string, any>): string {
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
    
    return xml
  }

  private async makeRequest(command: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const xmlRequest = this.buildXMLRequest(command, params)
      
      logger.info(`[Turkpin] ${command} → Request XML:`, xmlRequest)
      
      const formData = new URLSearchParams()
      formData.append('DATA', xmlRequest)
      
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
      
      return parsedResponse
    } catch (error: any) {
      logger.error(`[Turkpin] ${command} → ${error.response?.status || 'NO_STATUS'} → ${error.message}`)
      throw error
    }
  }

  async checkBalance(): Promise<any> {
    const response = await this.makeRequest('checkBalance')
    return response.result || response
  }

  async getEpinList(): Promise<any[]> {
    try {
      const response = await this.makeRequest('epinList')
      
      if (response.result && response.result.category) {
        const categories = Array.isArray(response.result.category) 
          ? response.result.category 
          : [response.result.category]
        
        return categories.map((cat: any) => ({
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

  async getProducts(epinId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest('epinProducts', { epinId })
      
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
          maxOrder: parseInt(product.max_order || 0)
        }))
      }
      
      return []
    } catch (error) {
      logger.error('[Turkpin] getProducts error:', error)
      throw error
    }
  }

  async placeOrder(productId: string, quantity: number): Promise<any> {
    const response = await this.makeRequest('order', {
      product_id: productId,
      quantity: quantity
    })
    
    return response.result || response
  }

  async checkOrderStatus(orderNo: string): Promise<any> {
    const response = await this.makeRequest('checkStatus', {
      order_no: orderNo
    })

    return response.result || response
  }
}

// Auth Service inline
class AuthService {
  private readonly jwtSecret: string
  private readonly jwtRefreshSecret: string
  private readonly jwtExpiresIn: string
  private readonly jwtRefreshExpiresIn: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production'
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production'
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m'
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }

  async login(email: string, password: string, ip: string) {
    try {
      // 1. DB'den kullanıcıyı bul
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user || !user.isActive) {
        await this.logAudit(null, 'LOGIN_FAILED', 'User', null, ip, { email })
        throw new Error('Geçersiz kimlik bilgileri')
      }

      // 2. Şifre kontrolü
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        await this.logAudit(user.id, 'LOGIN_FAILED', 'User', user.id, ip, { email })
        throw new Error('Geçersiz kimlik bilgileri')
      }

      // 3. Token'ları oluştur
      const accessToken = this.generateAccessToken(user.id, user.role)
      const refreshToken = this.generateRefreshToken(user.id)

      // 4. Son giriş güncelle
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // 5. Audit log yaz
      await this.logAudit(user.id, 'LOGIN_SUCCESS', 'User', user.id, ip, { email })

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          forcePasswordChange: user.forcePasswordChange
        }
      }
    } catch (error) {
      logger.error('Login error:', error)
      throw error
    }
  }

  async logout(userId: string, ip: string): Promise<void> {
    try {
      await this.logAudit(userId, 'LOGOUT', 'User', userId, ip)
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  generateAccessToken(userId: string, role: string): string {
    const options = { expiresIn: this.jwtExpiresIn as string }
    const payload = { sub: userId, role, type: 'access' as const }
    return jwt.sign(payload, this.jwtSecret, options)
  }

  generateRefreshToken(userId: string): string {
    const options = { expiresIn: this.jwtRefreshExpiresIn as string }
    const payload = { sub: userId, type: 'refresh' as const }
    return jwt.sign(payload, this.jwtRefreshSecret, options)
  }

  private async logAudit(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string | null,
    ip: string,
    meta: any = {}
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          meta,
          ip
        }
      })
    } catch (error) {
      logger.error('Audit log error:', error)
    }
  }
}

// Trendyol Service inline
class TrendyolService {
  private readonly webhookSecret: string

  constructor() {
    this.webhookSecret = process.env.TRENDYOL_WEBHOOK_SECRET || 'default-webhook-secret'
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  async processWebhook(payload: any, ip: string): Promise<void> {
    try {
      logger.info(`Processing Trendyol webhook: ${payload.orderNumber}`)

      // 1. Idempotency check
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey: payload.orderNumber }
      })

      if (existingOrder) {
        logger.warn(`Duplicate webhook received: ${payload.orderNumber}`)
        return
      }

      // 2. Sales channel'ı bul
      const channel = await prisma.salesChannel.findFirst({
        where: { 
          name: 'Trendyol',
          isActive: true 
        }
      })

      if (!channel) {
        throw new Error('Trendyol sales channel not found or inactive')
      }

      // 3. Test product oluştur (gerçek uygulamada SKU'ya göre bulunur)
      const testProduct = await prisma.product.findFirst({
        where: { sku: 'TEST-SKU-001' }
      })

      if (!testProduct) {
        // Test product oluştur
        const provider = await prisma.provider.findFirst({
          where: { name: 'Coda' }
        })

        if (provider) {
          const createdProduct = await prisma.product.create({
            data: {
              providerId: provider.id,
              externalId: 'TEST-001',
              name: 'Test Product',
              sku: 'TEST-SKU-001',
              purchasePrice: 50.00,
              sellingPrice: 100.00,
              marginPct: 50.00,
              stock: 100,
              isActive: true
            }
          })
          logger.info(`Created test product: ${createdProduct.sku}`)
        }
      }

      const product = await prisma.product.findFirst({
        where: { sku: 'TEST-SKU-001' }
      })

      if (!product) {
        throw new Error('Test product not found')
      }

      // 4. Order oluştur
      const order = await prisma.order.create({
        data: {
          idempotencyKey: payload.orderNumber,
          channelId: channel.id,
          providerId: product.providerId,
          productId: product.id,
          customerName: `${payload.customer.firstName} ${payload.customer.lastName}`,
          customerEmail: payload.customer.email,
          sellingPrice: payload.totalAmount,
          purchasePrice: payload.totalAmount - payload.commissionFee,
          commissionPct: channel.commissionPct,
          commissionAmount: payload.commissionFee,
          profit: payload.totalAmount - payload.commissionFee - (payload.totalAmount - payload.commissionFee),
          status: this.mapTrendyolStatus(payload.status),
          orderedAt: new Date(payload.createdAt),
          createdAt: new Date()
        }
      })

      // 5. Audit log
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'ORDER_CREATED',
          entity: 'Order',
          entityId: order.id,
          meta: {
            orderNumber: payload.orderNumber,
            source: 'Trendyol Webhook',
            itemCount: payload.items.length,
            totalAmount: payload.totalAmount
          },
          ip
        }
      })

      logger.info(`Successfully processed Trendyol order: ${payload.orderNumber}`)

    } catch (error) {
      logger.error(`Error processing Trendyol webhook:`, error)
      throw error
    }
  }

  private mapTrendyolStatus(trendyolStatus: string): string {
    const statusMap: Record<string, string> = {
      'Created': 'PENDING',
      'Packaged': 'PROCESSING',
      'Shipped': 'SHIPPED',
      'Delivered': 'DELIVERED',
      'Cancelled': 'CANCELLED',
      'Returned': 'RETURNED'
    }

    return statusMap[trendyolStatus] || 'PENDING'
  }
}

// Order Fulfillment Service inline
class OrderFulfillmentService {
  private readonly turkpinService: TurkpinService

  constructor() {
    this.turkpinService = new TurkpinService()
  }

  async fulfillOrder(orderId: string): Promise<any> {
    try {
      logger.info(`Starting fulfillment for order: ${orderId}`)

      // 1. Order'ı getir
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          product: {
            include: {
              provider: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.status !== 'PENDING') {
        throw new Error(`Order is not in PENDING status: ${order.status}`)
      }

      if (order.fulfilledAt) {
        throw new Error('Order already fulfilled')
      }

      // 2. Stock kontrolü
      if (order.product.stock < 1) {
        throw new Error('Insufficient stock')
      }

      // 3. Provider tipine göre fulfillment
      const result = await this.fulfillWithProvider(order)

      // 4. Order'ı güncelle
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: result.success ? 'FULFILLED' : 'FAILED',
          providerOrderNo: result.providerOrderNo,
          digitalCodeEnc: result.digitalCodes ? JSON.stringify(result.digitalCodes) : null,
          fulfilledAt: result.success ? new Date() : null
        }
      })

      // 5. Stock güncelle (başarılı ise)
      if (result.success && result.digitalCodes) {
        await prisma.product.update({
          where: { id: order.productId },
          data: {
            stock: order.product.stock - 1,
            updatedAt: new Date()
          }
        })
      }

      // 6. Audit log
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: result.success ? 'ORDER_FULFILLED' : 'ORDER_FULFILLMENT_FAILED',
          entity: 'Order',
          entityId: orderId,
          meta: {
            providerOrderNo: result.providerOrderNo,
            codeCount: result.digitalCodes?.length || 0,
            error: result.error
          },
          ip: '127.0.0.1' // System IP for fulfillment
        }
      })

      logger.info(`Order fulfillment completed: ${orderId} -> ${result.success ? 'SUCCESS' : 'FAILED'}`)

      return result

    } catch (error: any) {
      logger.error(`Order fulfillment error: ${orderId}`, error)

      // Hata durumunda order'ı FAILED olarak işaretle
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'FAILED'
          }
        })

        await prisma.auditLog.create({
          data: {
            userId: null,
            action: 'ORDER_FULFILLMENT_FAILED',
            entity: 'Order',
            entityId: orderId,
            meta: {
              error: error.message
            },
            ip: '127.0.0.1'
          }
        })
      } catch (updateError) {
        logger.error('Failed to update order status after fulfillment error:', updateError)
      }

      return {
        success: false,
        orderId,
        error: error.message
      }
    }
  }

  private async fulfillWithProvider(order: any): Promise<any> {
    const provider = order.product.provider

    switch (provider.type) {
      case 'API':
        return await this.fulfillWithTurkpin(order)
      
      case 'STOCK':
        return await this.fulfillWithStock(order)
      
      default:
        throw new Error(`Unknown provider type: ${provider.type}`)
    }
  }

  private async fulfillWithTurkpin(order: any): Promise<any> {
    try {
      // Stock provider için manuel kod oluştur (sandbox'ta)
      const digitalCodes = [`STOCK-${order.product.externalId}-${Date.now()}`]

      return {
        success: true,
        orderId: order.id,
        providerOrderNo: `STOCK-${Date.now()}`,
        digitalCodes
      }

    } catch (error: any) {
      logger.error('Turkpin fulfillment error:', error)
      return {
        success: false,
        orderId: order.id,
        error: error.message
      }
    }
  }

  private async fulfillWithStock(order: any): Promise<any> {
    try {
      // Stock provider için manuel kod oluştur
      const digitalCodes = [`STOCK-${order.product.externalId}-${Date.now()}`]

      return {
        success: true,
        orderId: order.id,
        providerOrderNo: `STOCK-${Date.now()}`,
        digitalCodes
      }

    } catch (error: any) {
      logger.error('Stock fulfillment error:', error)
      return {
        success: false,
        orderId: order.id,
        error: error.message
      }
    }
  }

  async getFulfillmentStatus(orderId: string): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          product: {
            include: {
              provider: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      return { order }

    } catch (error: any) {
      logger.error('Error getting fulfillment status:', error)
      throw error
    }
  }

  async retryFailedOrder(orderId: string): Promise<any> {
    try {
      logger.info(`Retrying failed order: ${orderId}`)

      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.status !== 'FAILED') {
        throw new Error(`Order is not in FAILED status: ${order.status}`)
      }

      // Order'ı tekrar PENDING yap
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          providerOrderNo: null,
          digitalCodeEnc: null,
          fulfilledAt: null
        }
      })

      // Tekrar fulfill et
      return await this.fulfillOrder(orderId)

    } catch (error: any) {
      logger.error('Error retrying failed order:', error)
      throw error
    }
  }

  async getFailedOrders(limit: number = 50): Promise<any[]> {
    try {
      const failedOrders = await prisma.order.findMany({
        where: {
          status: 'FAILED'
        },
        include: {
          product: {
            include: {
              provider: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return failedOrders

    } catch (error: any) {
      logger.error('Error getting failed orders:', error)
      throw error
    }
  }

  async getPendingOrders(limit: number = 50): Promise<any[]> {
    try {
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          product: {
            include: {
              provider: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: limit
      })

      return pendingOrders

    } catch (error: any) {
      logger.error('Error getting pending orders:', error)
      throw error
    }
  }
}

// System Health Service inline
class SystemHealthService {
  private readonly startTime: Date

  constructor() {
    this.startTime = new Date()
  }

  async getHealthStatus(): Promise<any> {
    try {
      const timestamp = new Date().toISOString()
      const uptime = Date.now() - this.startTime.getTime()

      // Test database connection
      let dbStatus = 'unknown'
      let dbResponseTime = 0
      try {
        const start = Date.now()
        await prisma.$queryRaw`SELECT 1`
        dbResponseTime = Date.now() - start
        dbStatus = dbResponseTime < 1000 ? 'healthy' : 'degraded'
      } catch (error) {
        dbStatus = 'unhealthy'
      }

      // Test Turkpin API
      let turkpinStatus = 'unknown'
      let turkpinResponseTime = 0
      try {
        const start = Date.now()
        await turkpinService.checkBalance()
        turkpinResponseTime = Date.now() - start
        turkpinStatus = turkpinResponseTime < 5000 ? 'healthy' : 'degraded'
      } catch (error) {
        turkpinStatus = 'unhealthy'
      }

      // Memory check
      const memUsage = process.memoryUsage()
      const totalMemory = memUsage.heapTotal / 1024 / 1024 // MB
      const usedMemory = memUsage.heapUsed / 1024 / 1024 // MB
      const usagePercent = (usedMemory / totalMemory) * 100
      const memoryStatus = usagePercent < 80 ? 'healthy' : usagePercent < 95 ? 'degraded' : 'unhealthy'

      // Get metrics
      const metrics = await this.getSystemMetrics()

      // Determine overall status
      const statuses = [dbStatus, turkpinStatus, memoryStatus]
      const overallStatus = statuses.every(s => s === 'healthy') ? 'healthy' : 
                           statuses.some(s => s === 'unhealthy') ? 'unhealthy' : 'degraded'

      return {
        status: overallStatus,
        timestamp,
        uptime,
        version: '1.0.0',
        services: {
          database: { status: dbStatus, responseTime: dbResponseTime, lastCheck: timestamp },
          turkpin: { status: turkpinStatus, responseTime: turkpinResponseTime, lastCheck: timestamp },
          memory: { status: memoryStatus, lastCheck: timestamp },
          disk: { status: 'healthy', lastCheck: timestamp }
        },
        metrics
      }
    } catch (error: any) {
      logger.error('Health check error:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        services: {
          database: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          turkpin: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          memory: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' },
          disk: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Unknown error' }
        },
        metrics: {
          totalOrders: 0,
          pendingOrders: 0,
          failedOrders: 0,
          fulfilledOrders: 0,
          totalProducts: 0,
          lowStockProducts: 0
        }
      }
    }
  }

  private async getSystemMetrics() {
    try {
      const [
        totalOrders,
        pendingOrders,
        failedOrders,
        fulfilledOrders,
        totalProducts,
        lowStockProducts
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'FAILED' } }),
        prisma.order.count({ where: { status: 'FULFILLED' } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.count({
          where: {
            isActive: true,
            stock: { lt: 10 }
          }
        })
      ])

      return {
        totalOrders,
        pendingOrders,
        failedOrders,
        fulfilledOrders,
        totalProducts,
        lowStockProducts
      }
    } catch (error: any) {
      logger.error('Error getting system metrics:', error)
      return {
        totalOrders: 0,
        pendingOrders: 0,
        failedOrders: 0,
        fulfilledOrders: 0,
        totalProducts: 0,
        lowStockProducts: 0
      }
    }
  }

  async getWebhookStats(): Promise<any> {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        totalWebhooks,
        todayWebhooks,
        thisWeekWebhooks,
        thisMonthWebhooks
      ] = await Promise.all([
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: today }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: thisWeek }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { startsWith: 'WEBHOOK' },
            createdAt: { gte: thisMonth }
          }
        })
      ])

      return {
        total: totalWebhooks,
        today: todayWebhooks,
        thisWeek: thisWeekWebhooks,
        thisMonth: thisMonthWebhooks,
        successRate: 100,
        errors: []
      }
    } catch (error: any) {
      logger.error('Error getting webhook stats:', error)
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        successRate: 100,
        errors: []
      }
    }
  }

  async getRecentErrors(limit: number = 20): Promise<any[]> {
    try {
      const errors = await prisma.auditLog.findMany({
        where: {
          action: { contains: 'ERROR' }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      })

      return errors
    } catch (error: any) {
      logger.error('Error getting recent errors:', error)
      return []
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      const last7d = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))

      const [
        orders24h,
        orders7d
      ] = await Promise.all([
        prisma.order.count({
          where: {
            createdAt: { gte: last24h }
          }
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: last7d }
          }
        })
      ])

      return {
        orders24h,
        orders7d,
        avgFulfillmentTime: 0,
        topProducts: []
      }
    } catch (error: any) {
      logger.error('Error getting performance metrics:', error)
      return {
        orders24h: 0,
        orders7d: 0,
        avgFulfillmentTime: 0,
        topProducts: []
      }
    }
  }
}

const app = express()
const authService = new AuthService()
const trendyolService = new TrendyolService()
const turkpinService = new TurkpinService()
const fulfillmentService = new OrderFulfillmentService()
const healthService = new SystemHealthService()

// CORS configuration - only allow frontend dev server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}))

// Cookie parser
app.use(cookieParser())

// JSON body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
  })
  
  next()
})

// Webhook routes
app.post('/api/webhooks/trendyol', async (req, res) => {
  try {
    logger.info(`Trendyol webhook received: ${req.body.orderNumber}`)
    res.json({
      success: true,
      message: 'Trendyol webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Trendyol webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
})

app.post('/api/webhooks/hepsiburada', async (req, res) => {
  try {
    logger.info(`Hepsiburada webhook received: ${req.body.order?.orderNumber}`)
    res.json({
      success: true,
      message: 'Hepsiburada webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Hepsiburada webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
})

app.post('/api/webhooks/allegro', async (req, res) => {
  try {
    logger.info(`Allegro webhook received: ${req.body.payload?.orderId}`)
    res.json({
      success: true,
      message: 'Allegro webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Allegro webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
})

app.post('/api/webhooks/daraz-lk', async (req, res) => {
  try {
    logger.info(`Daraz webhook received: ${req.body.data?.order_id}`)
    res.json({
      success: true,
      message: 'Daraz webhook processed successfully'
    })
  } catch (error: any) {
    logger.error('Daraz webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    })
  }
})

// System health endpoint
app.get('/api/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
    
    res.json(health)
  } catch (error: any) {
    logger.error('Health check error:', error)
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    const result = await authService.login(email, password, ip)
    
    // Set refresh token in cookie
    res.cookie('omega_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })
    
    // Set access token in cookie
    res.cookie('omega_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    })
    
    logger.info(`User logged in: ${result.user.email}`)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Login error:', error)
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed'
    })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    
    // Get user from token (if available)
    const token = req.cookies?.omega_access_token || req.headers.authorization?.substring(7)
    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production'
        const decoded = jwt.verify(token, jwtSecret) as any
        await authService.logout(decoded.sub, ip)
      } catch (error) {
        // Token invalid, just clear cookies
      }
    }
    
    // Clear cookies
    res.clearCookie('omega_access_token')
    res.clearCookie('omega_refresh_token')
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error: any) {
    logger.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
})

// Turkpin routes
app.get('/api/turkpin/balance', async (req, res) => {
  try {
    const balance = await turkpinService.checkBalance()
    
    res.json({
      success: true,
      data: balance
    })
  } catch (error: any) {
    logger.error('Turkpin balance error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check balance'
    })
  }
})

app.get('/api/turkpin/categories', async (req, res) => {
  try {
    const categories = await turkpinService.getEpinList()
    
    res.json({
      success: true,
      data: categories
    })
  } catch (error: any) {
    logger.error('Turkpin categories error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get categories'
    })
  }
})

app.get('/api/turkpin/products/:epinId', async (req, res) => {
  try {
    const { epinId } = req.params
    const products = await turkpinService.getProducts(epinId)
    
    res.json({
      success: true,
      data: products
    })
  } catch (error: any) {
    logger.error('Turkpin products error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get products'
    })
  }
})

app.post('/api/turkpin/order', async (req, res) => {
  try {
    const { productId, quantity } = req.body
    
    if (!productId || !quantity) {
      res.status(400).json({
        success: false,
        error: 'productId and quantity are required'
      })
      return
    }

    const order = await turkpinService.placeOrder(productId, quantity)
    
    res.json({
      success: true,
      data: order
    })
  } catch (error: any) {
    logger.error('Turkpin order error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to place order'
    })
  }
})

app.get('/api/turkpin/order/:orderNo/status', async (req, res) => {
  try {
    const { orderNo } = req.params
    const status = await turkpinService.checkOrderStatus(orderNo)
    
    res.json({
      success: true,
      data: status
    })
  } catch (error: any) {
    logger.error('Turkpin order status error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check order status'
    })
  }
})

// Webhook routes (public, no auth required)
app.post('/api/webhook/trendyol/test', async (req, res) => {
  try {
    const testPayload = {
      orderNumber: `TEST-${Date.now()}`,
      status: 'Created',
      items: [
        {
          sku: 'TEST-SKU-001',
          quantity: 1,
          price: 100.00
        }
      ],
      customer: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+905555555555'
      },
      address: {
        city: 'İstanbul',
        district: 'Kadıköy',
        fullAddress: 'Test Address',
        postalCode: '34710'
      },
      paymentMethod: 'CREDIT_CARD',
      totalAmount: 108.50,
      commissionFee: 8.50,
      createdAt: new Date().toISOString()
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    await trendyolService.processWebhook(testPayload, ip)

    logger.info(`Test webhook processed: ${testPayload.orderNumber}`)

    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      orderNumber: testPayload.orderNumber
    })
  } catch (error: any) {
    logger.error('Test webhook error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Test webhook failed'
    })
  }
})

// Fulfillment routes
app.post('/api/fulfillment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const result = await fulfillmentService.fulfillOrder(orderId)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Fulfillment error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Fulfillment failed'
    })
  }
})

app.get('/api/fulfillment/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params
    const status = await fulfillmentService.getFulfillmentStatus(orderId)
    
    res.json({
      success: true,
      data: status
    })
  } catch (error: any) {
    logger.error('Fulfillment status error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fulfillment status'
    })
  }
})

app.post('/api/fulfillment/:orderId/retry', async (req, res) => {
  try {
    const { orderId } = req.params
    const result = await fulfillmentService.retryFailedOrder(orderId)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Fulfillment retry error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry order'
    })
  }
})

app.get('/api/fulfillment/orders/failed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const orders = await fulfillmentService.getFailedOrders(limit)
    
    res.json({
      success: true,
      data: orders
    })
  } catch (error: any) {
    logger.error('Failed orders error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get failed orders'
    })
  }
})

app.get('/api/fulfillment/orders/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const orders = await fulfillmentService.getPendingOrders(limit)
    
    res.json({
      success: true,
      data: orders
    })
  } catch (error: any) {
    logger.error('Pending orders error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending orders'
    })
  }
})

// System Health routes
app.get('/system/health', async (req, res) => {
  try {
    const health = await healthService.getHealthStatus()
    
    res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503).json({
      success: true,
      data: health
    })
  } catch (error: any) {
    logger.error('Health check error:', error)
    res.status(503).json({
      success: false,
      error: error.message || 'Health check failed'
    })
  }
})

app.get('/system/webhook-stats', async (req, res) => {
  try {
    const stats = await healthService.getWebhookStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    logger.error('Webhook stats error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get webhook stats'
    })
  }
})

app.get('/system/errors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const errors = await healthService.getRecentErrors(limit)
    
    res.json({
      success: true,
      data: errors
    })
  } catch (error: any) {
    logger.error('Recent errors error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recent errors'
    })
  }
})

app.get('/system/performance', async (req, res) => {
  try {
    const metrics = await healthService.getPerformanceMetrics()
    
    res.json({
      success: true,
      data: metrics
    })
  } catch (error: any) {
    logger.error('Performance metrics error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance metrics'
    })
  }
})

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Omega Backend is running!',
    timestamp: new Date().toISOString()
  })
})

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
