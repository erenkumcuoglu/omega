import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const goldType = searchParams.get('goldType')

  try {
    const games = await turkpinClient.goldGameList(goldType ? parseInt(goldType) : undefined)
    return Response.json(games)
  } catch (error) {
    console.error('Gold games list error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
