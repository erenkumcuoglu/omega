import { Request, Response } from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { OrderFulfillmentService } from '../services/orderFulfillment.service'
import { z } from 'zod'

const hepsiburadaWebhookSchema = z.object({
  eventType: z.enum(['ORDER_CREATED', 'ORDER_CANCELLED']),
  merchantId: z.string(),
  timestamp: z.string(),
  order: z.object({
    orderNumber: z.string(),
    orderDate: z.string(),
    customer: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email()
    }),
    items: z.array(z.object({
      sku: z.string(),
      quantity: z.number(),
      salePrice: z.number(),
      commissionRate: z.number()
    }))
  })
})

export async function handleHepsiburadaWebhook(req: Request, res: Response): Promise<void> {
  try {
    logger.info(`Hepsiburada webhook received: ${req.body.order?.orderNumber}`)

    // 1. Payload validation
    const validatedPayload = hepsiburadaWebhookSchema.parse(req.body)

    // 2. Event type kontrolü
    if (validatedPayload.eventType === 'ORDER_CANCELLED') {
      await handleOrderCancellation(validatedPayload.order.orderNumber, 'Hepsiburada')
      res.json({
        success: true,
        message: 'Order cancellation processed'
      })
      return
    }

    if (validatedPayload.eventType !== 'ORDER_CREATED') {
      logger.info(`Ignoring Hepsiburada event: ${validatedPayload.eventType}`)
      res.json({
        success: true,
        message: 'Event ignored'
      })
      return
    }

    // 3. Order fulfillment
    const fulfillmentService = new OrderFulfillmentService()
    const item = validatedPayload.order.items[0] // Tek item varsayımı

    const result = await fulfillmentService.fulfill({
      idempotencyKey: `HB-${validatedPayload.order.orderNumber}`,
      channelId: await getChannelId('Hepsiburada'),
      providerId: await getProviderId('Coda'),
      productSku: item.sku,
      quantity: item.quantity,
      customerName: `${validatedPayload.order.customer.firstName} ${validatedPayload.order.customer.lastName}`,
      customerEmail: validatedPayload.order.customer.email,
      sellingPrice: item.salePrice,
      commissionPct: item.commissionRate,
      orderedAt: new Date(validatedPayload.order.orderDate)
    })

    if (result.success) {
      logger.info(`Hepsiburada order fulfilled successfully: ${validatedPayload.order.orderNumber}`)
      res.json({
        success: true,
        message: 'Order processed successfully',
        orderId: result.orderId,
        providerOrderNo: result.providerOrderNo
      })
    } else {
      logger.error(`Hepsiburada order fulfillment failed: ${validatedPayload.order.orderNumber}`, result.error)
      res.status(500).json({
        success: false,
        error: result.error || 'Order fulfillment failed'
      })
    }

  } catch (error: any) {
    logger.error('Hepsiburada webhook error:', error)
    
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

async function handleOrderCancellation(orderNumber: string, channel: string): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })

  const prisma = new PrismaClient({
    adapter,
    log: ['error']
  })

  try {
    const idempotencyKey = `${channel === 'Hepsiburada' ? 'HB' : 'ALG'}-${orderNumber}`
    
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
