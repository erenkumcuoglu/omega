import crypto from 'crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'

interface TrendyolWebhookPayload {
  orderNumber: string
  status: string
  items: Array<{
    sku: string
    quantity: number
    price: number
  }>
  customer: {
    email: string
    firstName: string
    lastName: string
    phone: string
  }
  address: {
    city: string
    district: string
    fullAddress: string
    postalCode: string
  }
  paymentMethod: string
  totalAmount: number
  commissionFee: number
  createdAt: string
}

export class TrendyolService {
  private readonly prisma: PrismaClient
  private readonly webhookSecret: string

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    })

    this.prisma = new PrismaClient({
      adapter,
      log: ['query', 'info', 'warn', 'error']
    })

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

  async processWebhook(payload: TrendyolWebhookPayload, ip: string): Promise<void> {
    try {
      logger.info(`Processing Trendyol webhook: ${payload.orderNumber}`)

      // 1. Idempotency check - aynı sipariş daha önce işlendi mi?
      const existingOrder = await this.prisma.order.findUnique({
        where: { orderNumber: payload.orderNumber }
      })

      if (existingOrder) {
        logger.warn(`Duplicate webhook received: ${payload.orderNumber}`)
        return
      }

      // 2. Sales channel'ı bul
      const channel = await this.prisma.salesChannel.findFirst({
        where: { 
          name: 'Trendyol',
          isActive: true 
        }
      })

      if (!channel) {
        throw new Error('Trendyol sales channel not found or inactive')
      }

      // 3. Her item için product kontrolü
      for (const item of payload.items) {
        const product = await this.prisma.product.findUnique({
          where: { sku: item.sku }
        })

        if (!product) {
          logger.error(`Product not found: ${item.sku}`)
          continue
        }

        if (product.stock < item.quantity) {
          logger.error(`Insufficient stock for ${item.sku}: ${product.stock} < ${item.quantity}`)
          continue
        }
      }

      // 4. Order oluştur
      const order = await this.prisma.order.create({
        data: {
          orderNumber: payload.orderNumber,
          status: this.mapTrendyolStatus(payload.status),
          customerEmail: payload.customer.email,
          customerName: `${payload.customer.firstName} ${payload.customer.lastName}`,
          customerPhone: payload.customer.phone,
          address: `${payload.address.fullAddress}, ${payload.address.district}/${payload.address.city}`,
          totalAmount: payload.totalAmount,
          commissionFee: payload.commissionFee,
          paymentMethod: payload.paymentMethod,
          channelId: channel.id,
          createdAt: new Date(payload.createdAt)
        }
      })

      // 5. Order items oluştur ve stock güncelle
      for (const item of payload.items) {
        const product = await this.prisma.product.findUnique({
          where: { sku: item.sku }
        })

        if (product && product.stock >= item.quantity) {
          // Order item oluştur
          await this.prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity
            }
          })

          // Stock güncelle
          await this.prisma.product.update({
            where: { id: product.id },
            data: { 
              stock: product.stock - item.quantity,
              updatedAt: new Date()
            }
          })

          logger.info(`Processed item: ${item.sku} x${item.quantity}`)
        }
      }

      // 6. Audit log
      await this.prisma.auditLog.create({
        data: {
          userId: null, // Webhook işlemi
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

  async getOrderStatus(orderNumber: string): Promise<any> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: {
            include: {
              product: true
            }
          },
          channel: true
        }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      return order
    } catch (error) {
      logger.error(`Error getting order status: ${orderNumber}`, error)
      throw error
    }
  }

  async updateOrderStatus(orderNumber: string, status: string): Promise<void> {
    try {
      await this.prisma.order.update({
        where: { orderNumber },
        data: { 
          status,
          updatedAt: new Date()
        }
      })

      logger.info(`Order status updated: ${orderNumber} -> ${status}`)
    } catch (error) {
      logger.error(`Error updating order status: ${orderNumber}`, error)
      throw error
    }
  }
}
