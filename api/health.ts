import { VercelRequest, VercelResponse } from '@vercel/node'
import { createCorsResponse, handleCorsPreflight } from '../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(res)
  }

  if (req.method !== 'GET') {
    return createCorsResponse(res, { error: 'Method not allowed' }, 405)
  }

  return createCorsResponse(res, { 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
}
