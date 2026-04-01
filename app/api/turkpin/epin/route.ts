import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const games = await turkpinClient.epinList()
    return Response.json(games)
  } catch (error) {
    console.error('Epin list error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}