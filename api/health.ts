import { VercelRequest, VercelResponse } from '@vercel/node'
import { createCorsResponse, handleCorsPreflight } from '../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight()
  }

  if (req.method !== 'GET') {
    return createCorsResponse({ error: 'Method not allowed' }, 405)
  }

  return createCorsResponse({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  })
}
