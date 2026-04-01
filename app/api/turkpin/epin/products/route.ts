import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')

  if (!gameId) {
    return Response.json({ error: 'gameId parameter is required' }, { status: 400 })
  }

  try {
    const products = await turkpinClient.epinProducts(gameId)
    return Response.json(products)
  } catch (error) {
    console.error('Epin products error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
