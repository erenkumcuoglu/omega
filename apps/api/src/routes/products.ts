import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import pino from 'pino'
import { authorize, logAuditEvent } from '../middleware/security'
import { AuditAction } from '@omega/shared'

const router: Router = Router()
const prisma = new PrismaClient()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Zod schemas for product update
const productUpdateSchema = z.object({
  sellingPrice: z.number().positive().optional(),
  marginPct: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional()
})

// GET /products/sync - Return all products from DB grouped by provider
router.get('/sync', async (req: Request, res: Response) => {
  try {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      include: {
        products: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    const categories = providers.map(provider => ({
      epinId: provider.id,
      epinName: provider.name,
      products: provider.products.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.sellingPrice),
        stock: p.stock,
        minOrder: 1,
        maxOrder: 10,
        isActive: p.isActive
      }))
    }))

    const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0)

    res.json({
      success: true,
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalProducts,
          syncedAt: new Date().toISOString(),
          source: 'database'
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching products:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /products/sync/force - Force sync from Turkpin API into DB
router.get('/sync/force', async (req: Request, res: Response) => {
  try {
    const { TurkpinService } = await import('../services/TurkpinService')
    const turkpin = TurkpinService.getInstance()

    const epinList = await turkpin.getEpinList()

    // Find or create the Turkpin provider
    let provider = await prisma.provider.findFirst({ where: { name: 'Turkpin' } })
    if (!provider) {
      provider = await prisma.provider.create({
        data: { name: 'Turkpin', type: 'API' as any, isActive: true }
      })
    }

    let totalUpserted = 0
    const categories: any[] = []

    for (const epin of epinList as any[]) {
      const liveProducts = await turkpin.getProducts(String(epin.epinId || epin.id))
      const products: any[] = []
      for (const p of liveProducts) {
        await prisma.product.upsert({
          where: { externalId_providerId: { externalId: String(p.id), providerId: provider.id } } as any,
          create: {
            providerId: provider.id,
            externalId: String(p.id),
            name: p.name,
            sku: `TP-${p.id}`,
            purchasePrice: p.price ?? 0,
            sellingPrice: p.price ?? 0,
            marginPct: 0,
            stock: p.stock ?? 0,
            isActive: true
          },
          update: {
            stock: p.stock ?? 0,
            purchasePrice: p.price ?? 0
          }
        })
        totalUpserted++
        products.push({ id: String(p.id), name: p.name, price: p.price ?? 0, stock: p.stock ?? 0, minOrder: 1, maxOrder: 10, isActive: true })
      }
      categories.push({ epinId: String(epin.epinId || epin.id), epinName: epin.name, products })
    }

    res.json({
      success: true,
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalProducts: totalUpserted,
          syncedAt: new Date().toISOString(),
          source: 'turkpin'
        }
      }
    })
  } catch (error: any) {
    const upstreamStatus = error?.response?.status ?? error?.httpStatus ?? null
    const { TurkpinService } = await import('../services/TurkpinService')
    const turkpin = TurkpinService.getInstance()
    const turkpinCode = turkpin.getErrorCode(error)
    const clientIp = error?.clientIp ?? null

    logger.error('Error force syncing from Turkpin:', {
      message: error?.message,
      status: upstreamStatus,
      turkpinCode,
      clientIp
    })

    // Fallback to DB
    const providers = await prisma.provider.findMany({ where: { isActive: true }, include: { products: { orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } })
    const categories = providers.map(prov => ({ epinId: prov.id, epinName: prov.name, products: prov.products.map(p => ({ id: p.id, name: p.name, price: Number(p.sellingPrice), stock: p.stock, minOrder: 1, maxOrder: 10, isActive: p.isActive })) }))
    const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0)
    res.json({
      success: true,
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalProducts,
          syncedAt: new Date().toISOString(),
          source: 'database_fallback',
          liveSync: false,
          fallbackReason:
            turkpinCode === 2
              ? 'TURKPIN_IP_NOT_AUTHORIZED'
              : 'TURKPIN_UPSTREAM_ERROR',
          turkpinCode,
          upstreamStatus,
          clientIp
        }
      }
    })
  }
})

// GET /products/sync/batch/:batchNumber - Paginated sync (groups in batches of 5)
router.get('/sync/batch/:batchNumber', async (req: Request, res: Response) => {
  try {
    const batchNumber = parseInt(req.params.batchNumber, 10) || 1
    const batchSize = 5

    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      include: { products: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' }
    })

    const totalBatches = Math.ceil(providers.length / batchSize)
    const batchProviders = providers.slice((batchNumber - 1) * batchSize, batchNumber * batchSize)

    const categories = batchProviders.map(provider => ({
      epinId: provider.id,
      epinName: provider.name,
      products: provider.products.map(p => ({ id: p.id, name: p.name, price: Number(p.sellingPrice), stock: p.stock, minOrder: 1, maxOrder: 10, isActive: p.isActive }))
    }))
    const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0)

    res.json({
      success: true,
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalProducts,
          syncedAt: new Date().toISOString(),
          source: 'database',
          batchNumber,
          totalBatches,
          remainingGames: Math.max(0, providers.length - batchNumber * batchSize)
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching product batch:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /products/balance - Live balance from Turkpin API
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const { TurkpinService } = await import('../services/TurkpinService')
    const turkpin = TurkpinService.getInstance()
    const rawBalance: any = await turkpin.checkBalance()

    const payload = rawBalance?.balanceInformation ?? rawBalance?.result ?? rawBalance ?? {}
    const toNumber = (value: unknown): number => {
      const parsed = Number.parseFloat(String(value ?? 0))
      return Number.isFinite(parsed) ? parsed : 0
    }

    res.json({
      success: true,
      data: {
        balance: toNumber(payload.balance),
        credit: toNumber(payload.credit),
        bonus: toNumber(payload.bonus),
        spending: toNumber(payload.spending),
        currency: payload.currency ?? 'TRY',
        source: 'turkpin',
        fetchedAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    const upstreamStatus = error?.response?.status ?? error?.httpStatus ?? null
    const { TurkpinService } = await import('../services/TurkpinService')
    const turkpin = TurkpinService.getInstance()
    const turkpinCode = turkpin.getErrorCode(error)
    logger.error('Error fetching Turkpin balance:', {
      message: error?.message,
      status: upstreamStatus,
      turkpinCode
    })
    res.status(502).json({
      success: false,
      error: 'Could not fetch live balance from Turkpin',
      code:
        turkpinCode === 2
          ? 'TURKPIN_IP_NOT_AUTHORIZED'
          : upstreamStatus === 403
            ? 'TURKPIN_FORBIDDEN'
            : 'TURKPIN_UNAVAILABLE',
      turkpinCode,
      upstreamStatus,
      clientIp: error?.clientIp ?? null
    })
  }
})

// PATCH /products/:id - Update product fields (price, margin, active status)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const validatedData = productUpdateSchema.parse(req.body)

    const updateData: any = {}
    if (validatedData.sellingPrice !== undefined) updateData.sellingPrice = validatedData.sellingPrice
    if (validatedData.marginPct !== undefined) updateData.marginPct = validatedData.marginPct
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    const updated = await prisma.product.update({ where: { id }, data: updateData })
    res.json({ success: true, product: updated })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: error.errors })
    logger.error('Error updating product:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
