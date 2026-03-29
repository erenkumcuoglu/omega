import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import pino from 'pino'
import { authorize, logAuditEvent } from '../middleware/security'
import { AuditAction } from '@omega/shared'

const router: Router = Router()
const prisma = new PrismaClient()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Zod schemas
const channelCommissionSchema = z.object({
  channelId: z.string(),
  commissionPct: z.number().min(0).max(100)
})

const bulkPriceUpdateSchema = z.object({
  sellingPrice: z.number().positive(),
  marginPct: z.number().min(0).max(100),
  channelCommissions: z.array(channelCommissionSchema).min(1)
})

// GET /products/:id/channels - Get product channels
router.get('/:id/channels', authorize(['ADMIN', 'PRICING']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get product with provider and active sales channels
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        provider: true
      }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Get all active sales channels
    const channels = await prisma.salesChannel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        commissionPct: true
      },
      orderBy: { name: 'asc' }
    })

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        marginPct: product.marginPct,
        purchasePrice: product.purchasePrice,
        provider: product.provider.name
      },
      channels: channels
    })

  } catch (error) {
    logger.error('Error getting product channels:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /products/:id/price-bulk - Bulk price update
router.patch('/:id/price-bulk', 
  authorize(['ADMIN', 'PRICING']),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const validatedData = bulkPriceUpdateSchema.parse(req.body)
      
      // Get current product
      const currentProduct = await prisma.product.findUnique({
        where: { id }
      })

      if (!currentProduct) {
        return res.status(404).json({ error: 'Product not found' })
      }

      // Calculate profit for each channel and check for negative profits
      const channelResults = []
      const negativeProfitChannels = []

      for (const commission of validatedData.channelCommissions) {
        const purchasePrice = Number(currentProduct.purchasePrice)
        const marginAmount = purchasePrice * (validatedData.marginPct / 100)
        const commissionAmount = validatedData.sellingPrice * (commission.commissionPct / 100)
        const profit = validatedData.sellingPrice - purchasePrice - marginAmount - commissionAmount

        channelResults.push({
          channelId: commission.channelId,
          commissionPct: commission.commissionPct,
          profit: profit
        })

        if (profit < 0) {
          negativeProfitChannels.push(commission.channelId)
        }
      }

      // Perform transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update product price and margin
        const updatedProduct = await tx.product.update({
          where: { id },
          data: {
            sellingPrice: validatedData.sellingPrice,
            marginPct: validatedData.marginPct
          }
        })

        // Update each channel commission
        const updatedChannels = []
        for (const commission of validatedData.channelCommissions) {
          const updatedChannel = await tx.salesChannel.update({
            where: { id: commission.channelId },
            data: {
              commissionPct: commission.commissionPct
            }
          })
          updatedChannels.push(updatedChannel)
        }

        return {
          product: updatedProduct,
          channels: updatedChannels
        }
      })

      // Log audit entries for each change
      await Promise.all([
        logAuditEvent({
          action: AuditAction.PRICE_UPDATE,
          entity: 'Product',
          entityId: id,
          ip: req.ip || '',
          meta: {
            oldPrice: Number(currentProduct.sellingPrice),
            newPrice: validatedData.sellingPrice,
            oldMargin: Number(currentProduct.marginPct),
            newMargin: validatedData.marginPct
          }
        }),
        ...validatedData.channelCommissions.map(commission =>
          logAuditEvent({
            action: AuditAction.MARGIN_UPDATE,
            entity: 'SalesChannel',
            entityId: commission.channelId,
            ip: req.ip || '',
            meta: {
              newCommissionPct: commission.commissionPct
            }
          })
        )
      ])

      const response: any = {
        success: true,
        product: result.product,
        channels: result.channels,
        channelProfits: channelResults
      }

      // Add warning if there are negative profits
      if (negativeProfitChannels.length > 0) {
        response.warning = {
          type: 'negative_profit',
          channels: negativeProfitChannels,
          message: 'Some channels have negative profit'
        }
      }

      logger.info('Bulk price update completed', {
        productId: id,
        userId: (req as any).user?.id,
        negativeProfitChannels: negativeProfitChannels.length
      })

      res.json(response)

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        })
      }

      logger.error('Error in bulk price update:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export { router as productsRouter }
