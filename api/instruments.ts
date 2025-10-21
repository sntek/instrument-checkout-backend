import { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { Instrument, ApiResponse } from '../types'
import { createCorsResponse, handleCorsPreflight } from '../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight()
  }

  if (req.method !== 'GET') {
    return createCorsResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const result = await sql.query('SELECT * FROM instruments ORDER BY name')
    const instruments: Instrument[] = result.rows.map((row: any) => ({
      name: row.name,
      os: row.os,
      group: row.group_name,
      ip: row.ip
    }))

    const response: ApiResponse<Instrument[]> = {
      success: true,
      data: instruments
    }

    return createCorsResponse(response)
  } catch (error) {
    console.error('Error fetching instruments:', error)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch instruments'
    }
    return createCorsResponse(response, 500)
  }
}
