import { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { ApiResponse } from '../../types'
import { createCorsResponse, handleCorsPreflight } from '../../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight()
  }

  if (req.method !== 'DELETE') {
    return createCorsResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const { id } = req.query
    
    if (!id || typeof id !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Reservation ID is required'
      }
      return createCorsResponse(response, 400)
    }
    
    // Get the user ID from the request body
    const { reserverUserId } = req.body || {}
    
    if (!reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required to delete reservation'
      }
      return createCorsResponse(response, 400)
    }
    
    // Check if reservation exists
    const existingReservation = await sql.query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    )
    
    if (existingReservation.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Reservation not found'
      }
      return createCorsResponse(response, 404)
    }
    
    // Check if the user owns the reservation
    if (existingReservation.rows[0].reserverUserId !== reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'You can only delete your own reservations'
      }
      return createCorsResponse(response, 403)
    }
    
    // Delete reservation
    await sql.query(
      'DELETE FROM reservations WHERE id = $1',
      [id]
    )
    
    const response: ApiResponse = {
      success: true,
      data: { deleted: true }
    }
    return createCorsResponse(response)
  } catch (error) {
    console.error('Error deleting reservation:', error)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete reservation'
    }
    return createCorsResponse(response, 500)
  }
}
