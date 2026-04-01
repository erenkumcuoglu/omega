import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { gameId, productId, qty, character } = body

    if (!gameId || !productId || !qty) {
      return Response.json({ error: 'gameId, productId, and qty are required' }, { status: 400 })
    }

    const result = await turkpinClient.epinOrder(gameId, productId, qty, character)
    return Response.json(result)
  } catch (error) {
    console.error('Epin order error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
