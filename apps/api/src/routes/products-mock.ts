import { Router, Request, Response } from 'express'
import { z } from 'zod'
import pino from 'pino'

const router: Router = Router()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// Mock data (in a real app this would come from database)
const mockProducts = [
  {
    id: 'prod1',
    name: 'PUBG Mobile 60 UC',
    sku: 'PUBGMTR60',
    sellingPrice: 100,
    marginPct: 14,
    purchasePrice: 80,
    providerId: 'prov1',
    provider: { name: 'Coda' }
  },
  {
    id: 'prod2', 
    name: 'Valorant 950 RP',
    sku: 'VALOR950',
    sellingPrice: 150,
    marginPct: 12,
    purchasePrice: 120,
    providerId: 'prov1',
    provider: { name: 'Coda' }
  }
];

const mockChannels = [
  {
    id: 'chan1',
    name: 'Trendyol',
    commissionPct: 15,
    isActive: true
  },
  {
    id: 'chan2', 
    name: 'HepsiBurada',
    commissionPct: 12,
    isActive: true
  },
  {
    id: 'chan3',
    name: 'Ozan',
    commissionPct: 8,
    isActive: true
  }
];

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

// Simple auth middleware for mock API
const mockAuth = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user - in real app this would verify JWT
  (req as any).user = { id: '1', role: 'ADMIN' };
  next();
};

// GET /products/:id/channels - Get product channels
router.get('/:id/channels', mockAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Find product
    const product = mockProducts.find(p => p.id === id)

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Get active channels
    const channels = mockChannels
      .filter(c => c.isActive)
      .map(({ id, name, commissionPct }) => ({ id, name, commissionPct }))

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
router.patch('/:id/price-bulk', mockAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const validatedData = bulkPriceUpdateSchema.parse(req.body)
    
    // Find current product
    const currentProduct = mockProducts.find(p => p.id === id)

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Calculate profit for each channel and check for negative profits
    const channelResults = []
    const negativeProfitChannels = []

    for (const commission of validatedData.channelCommissions) {
      const purchasePrice = currentProduct.purchasePrice
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

    // Mock update (in real app this would be a database transaction)
    const updatedProduct = {
      ...currentProduct,
      sellingPrice: validatedData.sellingPrice,
      marginPct: validatedData.marginPct
    }

    const updatedChannels = validatedData.channelCommissions.map(commission => {
      const channel = mockChannels.find(c => c.id === commission.channelId)
      return {
        ...channel,
        commissionPct: commission.commissionPct
      }
    })

    const response: any = {
      success: true,
      product: updatedProduct,
      channels: updatedChannels,
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
})

export { router as productsRouter }
