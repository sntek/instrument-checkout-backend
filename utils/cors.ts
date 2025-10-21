import { VercelResponse } from '@vercel/node'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export function createCorsResponse(res: VercelResponse, body: any, status: number = 200, additionalHeaders: Record<string, string> = {}) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  
  // Set additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  
  res.setHeader('Content-Type', 'application/json')
  
  return res.status(status).json(body)
}

export function handleCorsPreflight(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
  return res.status(204).end()
}
