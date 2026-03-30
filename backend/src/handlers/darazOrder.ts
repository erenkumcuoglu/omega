import { Request, Response } from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { OrderFulfillmentService } from '../services/orderFulfillment.service'
import { z } from 'zod'

const darazWebhookSchema = z.object({
  event: z.enum(['trade_order_create', 'trade_order_cancel']),
  country: z.string(),
  data: z.object({
    order_id: z.string(),
    created_at: z.string(), // "YYYY-MM-DD HH:mm:ss" format
    address_billing: z.object({
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().email()
    }),
    items: z.array(z.object({
      seller_sku: z.string(),
      unit_price: z.string(),
      quantity: z.string(),
      commission_rate: z.string(),
      currency: z.string()
    }))
  })
})

export async function handleDarazWebhook(req: Request, res: Response): Promise<void> {
  try {
    logger.info(`Daraz webhook received: ${req.body.data?.order_id}`)

    // 1. Payload validation
    const validatedPayload = darazWebhookSchema.parse(req.body)

    // 2. Country kontrolü
    if (validatedPayload.country !== 'LK') {
      logger.warn(`Ignoring Daraz webhook for unsupported country: ${validatedPayload.country}`)
      res.json({
        success: true,
        message: 'Country not supported'
      })
      return
    }

    // 3. Event type kontrolü
    if (validatedPayload.event === 'trade_order_cancel') {
      await handleOrderCancellation(validatedPayload.data.order_id, 'Daraz')
      res.json({
        success: true,
        message: 'Order cancellation processed'
      })
      return
    }

    if (validatedPayload.event !== 'trade_order_create') {
      logger.info(`Ignoring Daraz event: ${validatedPayload.event}`)
      res.json({
        success: true,
        message: 'Event ignored'
      })
      return
    }

    // 4. Order fulfillment
    const fulfillmentService = new OrderFulfillmentService()
    const item = validatedPayload.data.items[0] // Tek item varsayımı

    // created_at formatını parse et: "YYYY-MM-DD HH:mm:ss" → Date
    const createdAt = parseDarazDateTime(validatedPayload.data.created_at)

    const result = await fulfillmentService.fulfill({
      idempotencyKey: `DRZ-LK-${validatedPayload.data.order_id}`,
      channelId: await getChannelId('Daraz'),
      providerId: await getProviderId('Coda'),
      productSku: item.seller_sku,
      quantity: parseInt(item.quantity),
      customerName: `${validatedPayload.data.address_billing.first_name} ${validatedPayload.data.address_billing.last_name}`,
      customerEmail: validatedPayload.data.address_billing.email,
      sellingPrice: parseFloat(item.unit_price),
      commissionPct: parseFloat(item.commission_rate),
      orderedAt: createdAt,
      currency: item.currency // LKR olarak kaydedilecek
    })

    if (result.success) {
      logger.info(`Daraz order fulfilled successfully: ${validatedPayload.data.order_id}`)
      res.json({
        success: true,
        message: 'Order processed successfully',
        orderId: result.orderId,
        providerOrderNo: result.providerOrderNo
      })
    } else {
      logger.error(`Daraz order fulfillment failed: ${validatedPayload.data.order_id}`, result.error)
      res.status(500).json({
        success: false,
        error: result.error || 'Order fulfillment failed'
      })
    }

  } catch (error: any) {
    logger.error('Daraz webhook error:', error)
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: error.errors
      })
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Webhook processing failed'
      })
    }
  }
}

function parseDarazDateTime(dateTimeStr: string): Date {
  // "YYYY-MM-DD HH:mm:ss" formatını parse et
  const [datePart, timePart] = dateTimeStr.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)
  
  return new Date(year, month - 1, day, hour, minute, second)
}

async function handleOrderCancellation(orderNumber: string, channel: string): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })

  const prisma = new PrismaClient({
    adapter,
    log: ['error']
  })

  try {
    const idempotencyKey = `DRZ-LK-${orderNumber}`
    
    const order = await prisma.order.findUnique({
      where: { idempotencyKey }
    })

    if (order && order.status !== 'CANCELLED') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
      })

      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'ORDER_CANCELLED',
          entity: 'Order',
          entityId: order.id,
          meta: {
            idempotencyKey,
            channel,
            reason: 'Webhook cancellation'
          },
          ip: '127.0.0.1'
        }
      })

      logger.info(`Order cancelled via webhook: ${idempotencyKey}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function getChannelId(name: string): Promise<string> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })

  const prisma = new PrismaClient({
    adapter,
    log: ['error']
  })

  try {
    const channel = await prisma.salesChannel.findUnique({
      where: { name }
    })

    if (!channel) {
      throw new Error(`Sales channel not found: ${name}`)
    }

    return channel.id
  } finally {
    await prisma.$disconnect()
  }
}

async function getProviderId(name: string): Promise<string> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })

  const prisma = new PrismaClient({
    adapter,
    log: ['error']
  })

  try {
    const provider = await prisma.provider.findUnique({
      where: { name }
    })

    if (!provider) {
      throw new Error(`Provider not found: ${name}`)
    }

    return provider.id
  } finally {
    await prisma.$disconnect()
  }
}
