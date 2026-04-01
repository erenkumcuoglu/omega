import { NextRequest } from 'next/server'
import { turkpinClient } from '@/lib/turkpin/client'
import { validateApiKey, unauthorizedResponse } from '@/lib/turkpin/auth'

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { searchParams } = new URL(request.url)
  const orderNo = searchParams.get('orderNo')

  if (!orderNo) {
    return Response.json({ error: 'orderNo parameter is required' }, { status: 400 })
  }

  try {
    const status = await turkpinClient.checkOrderStatus(orderNo)
    return Response.json(status)
  } catch (error) {
    console.error('Order status check error:', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
