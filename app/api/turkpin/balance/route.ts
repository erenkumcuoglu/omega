import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  try {
    const balance = await turkpinClient.checkBalance()
    return Response.json(balance)
  } catch (error) {
    console.error('Balance check error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
