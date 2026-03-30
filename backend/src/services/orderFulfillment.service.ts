import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { TurkpinService } from './turkpin.service'

interface FulfillmentResult {
  success: boolean
  orderId: string
  providerOrderNo?: string
  digitalCodes?: string[]
  error?: string
}

interface OrderItem {
  id: string
  productId: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: {
    id: string
    externalId: string
    name: string
    stock: number
    provider: {
      id: string
      name: string
      type: string
    }
  }
}

interface FulfillmentParams {
  idempotencyKey: string
  channelId: string
  providerId: string
  productSku: string
  quantity: number
  customerName?: string
  customerEmail?: string
  sellingPrice: number
  commissionPct: number
  orderedAt: Date
  currency?: string
}

export class OrderFulfillmentService {
  private readonly prisma: PrismaClient
  private readonly turkpinService: TurkpinService

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    })

    this.prisma = new PrismaClient({
      adapter,
      log: ['query', 'info', 'warn', 'error']
    })

    this.turkpinService = new TurkpinService()
  }

  async fulfill(params: FulfillmentParams): Promise<FulfillmentResult> {
    try {
      logger.info(`Starting fulfillment for: ${params.idempotencyKey}`)

      // 1. Product'ı SKU ile bul
      const product = await this.prisma.product.findUnique({
        where: { sku: params.productSku },
        include: {
          provider: true
        }
      })

      if (!product) {
        throw new Error(`Product not found: ${params.productSku}`)
      }

      if (!product.isActive) {
        throw new Error(`Product is not active: ${params.productSku}`)
      }

      // 2. Stock kontrolü
      if (product.stock < params.quantity) {
        throw new Error(`Insufficient stock: ${params.productSku} (available: ${product.stock}, requested: ${params.quantity})`)
      }

      // 3. Idempotency kontrolü
      const existingOrder = await this.prisma.order.findUnique({
        where: { idempotencyKey: params.idempotencyKey }
      })

      if (existingOrder) {
        logger.warn(`Duplicate webhook received: ${params.idempotencyKey}`)
        return {
          success: true,
          orderId: existingOrder.id,
          error: 'Duplicate order'
        }
      }

      // 4. Channel ve provider bilgilerini al
      const channel = await this.prisma.salesChannel.findUnique({
        where: { id: params.channelId }
      })

      if (!channel) {
        throw new Error(`Sales channel not found: ${params.channelId}`)
      }

      // 5. DB transaction: Order oluştur (PENDING)
      const order = await this.prisma.order.create({
        data: {
          idempotencyKey: params.idempotencyKey,
          channelId: params.channelId,
          providerId: params.providerId,
          productId: product.id,
          customerName: params.customerName,
          customerEmail: params.customerEmail,
          sellingPrice: params.sellingPrice,
          purchasePrice: product.purchasePrice,
          commissionPct: params.commissionPct,
          commissionAmount: params.sellingPrice * (params.commissionPct / 100),
          profit: params.sellingPrice - product.purchasePrice - (params.sellingPrice * (params.commissionPct / 100)),
          status: 'PENDING',
          orderedAt: params.orderedAt,
          createdAt: new Date(),
          currency: params.currency
        }
      })

      // 6. TurkpinService ile fulfillment
      const fulfillmentResult = await this.fulfillWithProvider({
        id: order.id,
        product,
        status: 'PENDING'
      })

      // 7. Order güncelle (FULFILLED / FAILED)
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: fulfillmentResult.success ? 'FULFILLED' : 'FAILED',
          providerOrderNo: fulfillmentResult.providerOrderNo,
          digitalCodeEnc: fulfillmentResult.digitalCodes ? JSON.stringify(fulfillmentResult.digitalCodes) : null,
          fulfilledAt: fulfillmentResult.success ? new Date() : null
        }
      })

      // 8. Stock güncelle (başarılı ise)
      if (fulfillmentResult.success && fulfillmentResult.digitalCodes) {
        await this.prisma.product.update({
          where: { id: product.id },
          data: {
            stock: product.stock - params.quantity,
            updatedAt: new Date()
          }
        })
      }

      // 9. Audit log
      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: fulfillmentResult.success ? 'ORDER_FULFILLED' : 'ORDER_FULFILLMENT_FAILED',
          entity: 'Order',
          entityId: order.id,
          meta: {
            idempotencyKey: params.idempotencyKey,
            providerOrderNo: fulfillmentResult.providerOrderNo,
            codeCount: fulfillmentResult.digitalCodes?.length || 0,
            error: fulfillmentResult.error
          },
          ip: '127.0.0.1'
        }
      })

      logger.info(`Order fulfillment completed: ${params.idempotencyKey} -> ${fulfillmentResult.success ? 'SUCCESS' : 'FAILED'}`)

      return {
        success: fulfillmentResult.success,
        orderId: order.id,
        providerOrderNo: fulfillmentResult.providerOrderNo,
        digitalCodes: fulfillmentResult.digitalCodes,
        error: fulfillmentResult.error
      }

    } catch (error: any) {
      logger.error(`Order fulfillment error: ${params.idempotencyKey}`, error)

      // Hata durumunda audit log yaz
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: null,
            action: 'ORDER_FULFILLMENT_FAILED',
            entity: 'Order',
            entityId: params.idempotencyKey,
            meta: {
              idempotencyKey: params.idempotencyKey,
              error: error.message
            },
            ip: '127.0.0.1'
          }
        })
      } catch (auditError) {
        logger.error('Failed to create audit log after fulfillment error:', auditError)
      }

      return {
        success: false,
        orderId: '',
        error: error.message
      }
    }
  }

  async fulfillOrder(orderId: string): Promise<FulfillmentResult> {
    try {
      logger.info(`Starting fulfillment for order: ${orderId}`)

      // 1. Order'ı getir
      const order = await this.prisma.order.findUnique({
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
      await this.prisma.order.update({
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
        await this.prisma.product.update({
          where: { id: order.productId },
          data: {
            stock: order.product.stock - 1,
            updatedAt: new Date()
          }
        })
      }

      // 6. Audit log
      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: result.success ? 'ORDER_FULFILLED' : 'ORDER_FULFILLMENT_FAILED',
          entity: 'Order',
          entityId: orderId,
          meta: {
            providerOrderNo: result.providerOrderNo,
            codeCount: result.digitalCodes?.length || 0,
            error: result.error
          }
        }
      })

      logger.info(`Order fulfillment completed: ${orderId} -> ${result.success ? 'SUCCESS' : 'FAILED'}`)

      return result

    } catch (error) {
      logger.error(`Order fulfillment error: ${orderId}`, error)

      // Hata durumunda order'ı FAILED olarak işaretle
      try {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'FAILED'
          }
        })

        await this.prisma.auditLog.create({
          data: {
            userId: null,
            action: 'ORDER_FULFILLMENT_FAILED',
            entity: 'Order',
            entityId: orderId,
            meta: {
              error: error.message
            }
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

  private async fulfillWithProvider(order: any): Promise<FulfillmentResult> {
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

  private async fulfillWithTurkpin(order: any): Promise<FulfillmentResult> {
    try {
      // Turkpin API ile sipariş oluştur
      const turkpinOrder = await this.turkpinService.placeOrder(
        order.product.externalId,
        1
      )

      if (turkpinOrder.status === 'Error') {
        throw new Error(`Turkpin error: ${turkpinOrder.error_message}`)
      }

      // Digital kodları çıkar
      const digitalCodes = this.extractDigitalCodes(turkpinOrder)

      return {
        success: true,
        orderId: order.id,
        providerOrderNo: turkpinOrder.order_no || turkpinOrder.orderNo,
        digitalCodes
      }

    } catch (error) {
      logger.error('Turkpin fulfillment error:', error)
      return {
        success: false,
        orderId: order.id,
        error: error.message
      }
    }
  }

  private async fulfillWithStock(order: any): Promise<FulfillmentResult> {
    try {
      // Stock provider için manuel kod oluştur
      const digitalCodes = [`STOCK-${order.product.externalId}-${Date.now()}`]

      return {
        success: true,
        orderId: order.id,
        providerOrderNo: `STOCK-${Date.now()}`,
        digitalCodes
      }

    } catch (error) {
      logger.error('Stock fulfillment error:', error)
      return {
        success: false,
        orderId: order.id,
        error: error.message
      }
    }
  }

  private extractDigitalCodes(turkpinOrder: any): string[] {
    try {
      // Turkpin API response'ından kodları çıkar
      if (turkpinOrder.codes) {
        if (Array.isArray(turkpinOrder.codes)) {
          return turkpinOrder.codes.map((code: any) => code.code || code)
        } else if (turkpinOrder.codes.code) {
          return [turkpinOrder.codes.code]
        }
      }

      // Test için dummy kod
      return [`TEST-CODE-${Date.now()}`]

    } catch (error) {
      logger.error('Error extracting digital codes:', error)
      return []
    }
  }

  async getFulfillmentStatus(orderId: string): Promise<any> {
    try {
      const order = await this.prisma.order.findUnique({
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

      // Eğer provider order no varsa, durumu kontrol et
      if (order.providerOrderNo && order.product.provider.type === 'API') {
        try {
          const providerStatus = await this.turkpinService.checkOrderStatus(order.providerOrderNo)
          return {
            order,
            providerStatus
          }
        } catch (error) {
          logger.warn('Failed to check provider status:', error)
        }
      }

      return { order }

    } catch (error) {
      logger.error('Error getting fulfillment status:', error)
      throw error
    }
  }

  async retryFailedOrder(orderId: string): Promise<FulfillmentResult> {
    try {
      logger.info(`Retrying failed order: ${orderId}`)

      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      if (order.status !== 'FAILED') {
        throw new Error(`Order is not in FAILED status: ${order.status}`)
      }

      // Order'ı tekrar PENDING yap
      await this.prisma.order.update({
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

    } catch (error) {
      logger.error('Error retrying failed order:', error)
      throw error
    }
  }

  async getFailedOrders(limit: number = 50): Promise<any[]> {
    try {
      const failedOrders = await this.prisma.order.findMany({
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

    } catch (error) {
      logger.error('Error getting failed orders:', error)
      throw error
    }
  }

  async getPendingOrders(limit: number = 50): Promise<any[]> {
    try {
      const pendingOrders = await this.prisma.order.findMany({
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

    } catch (error) {
      logger.error('Error getting pending orders:', error)
      throw error
    }
  }
}

export default OrderFulfillmentService
