import { Request, Response } from 'express'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { OrderFulfillmentService } from '../services/orderFulfillment.service'
import { z } from 'zod'

const allegroWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.object({
    orderId: z.string(),
    status: z.enum(['READY_FOR_PROCESSING', 'CANCELLED']),
    buyer: z.object({
      login: z.string(),
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string()
    }),
    lineItems: z.array(z.object({
      offer: z.object({
        external: z.object({
          id: z.string()
        })
      }),
      quantity: z.number(),
      price: z.object({
        amount: z.string(),
        currency: z.string()
      })
    })),
    payment: z.object({
      commissionRate: z.string()
    }),
    createdAt: z.string()
  })
})

export async function handleAllegroWebhook(req: Request, res: Response): Promise<void> {
  try {
    logger.info(`Allegro webhook received: ${req.body.payload?.orderId}`)

    // 1. Payload validation
    const validatedPayload = allegroWebhookSchema.parse(req.body)

    // 2. Event type kontrolü
    if (validatedPayload.payload.status === 'CANCELLED') {
      await handleOrderCancellation(validatedPayload.payload.orderId, 'Allegro')
      res.json({
        success: true,
        message: 'Order cancellation processed'
      })
      return
    }

    if (validatedPayload.payload.status !== 'READY_FOR_PROCESSING') {
      logger.info(`Ignoring Allegro status: ${validatedPayload.payload.status}`)
      res.json({
        success: true,
        message: 'Status ignored'
      })
      return
    }

    // 3. Order fulfillment
    const fulfillmentService = new OrderFulfillmentService()
    const item = validatedPayload.payload.lineItems[0] // Tek item varsayımı

    const result = await fulfillmentService.fulfill({
      idempotencyKey: `ALG-${validatedPayload.payload.orderId}`,
      channelId: await getChannelId('Allegro'),
      providerId: await getProviderId('Coda'),
      productSku: item.offer.external.id,
      quantity: item.quantity,
      customerName: `${validatedPayload.payload.buyer.firstName} ${validatedPayload.payload.buyer.lastName}`,
      customerEmail: validatedPayload.payload.buyer.email,
      sellingPrice: parseFloat(item.price.amount),
      commissionPct: parseFloat(validatedPayload.payload.payment.commissionRate),
      orderedAt: new Date(validatedPayload.payload.createdAt)
    })

    if (result.success) {
      logger.info(`Allegro order fulfilled successfully: ${validatedPayload.payload.orderId}`)
      res.json({
        success: true,
        message: 'Order processed successfully',
        orderId: result.orderId,
        providerOrderNo: result.providerOrderNo
      })
    } else {
      logger.error(`Allegro order fulfillment failed: ${validatedPayload.payload.orderId}`, result.error)
      res.status(500).json({
        success: false,
        error: result.error || 'Order fulfillment failed'
      })
    }

  } catch (error: any) {
    logger.error('Allegro webhook error:', error)
    
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
