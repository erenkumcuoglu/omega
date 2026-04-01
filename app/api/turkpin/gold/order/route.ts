import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { gameId, productId, qty, character, goldType } = body

    if (!gameId || !productId || !qty || !character) {
      return Response.json({ error: 'gameId, productId, qty, and character are required' }, { status: 400 })
    }

    const result = await turkpinClient.goldOrder(gameId, productId, qty, character, goldType)
    return Response.json(result)
  } catch (error) {
    console.error('Gold order error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
