import { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeDatabase } from '../utils/database'
import { createCorsResponse, handleCorsPreflight } from '../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight()
  }

  if (req.method !== 'POST') {
    return createCorsResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    await initializeDatabase()
    return createCorsResponse({ 
      success: true, 
      message: 'Database migration completed successfully' 
    })
  } catch (error) {
    console.error('Migration error:', error)
    return createCorsResponse({ 
      success: false, 
      error: 'Database migration failed' 
    }, 500)
  }
}
