// API key guard — call this at the top of every API route
export function validateApiKey(request: Request): boolean {
  const key = request.headers.get('x-api-key')
  return key === process.env.TURKPIN_API_SECRET
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
