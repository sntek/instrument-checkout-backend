import { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { Reservation, CreateReservationRequest, ApiResponse, ReservationsByInstrument } from '../types'
import { createCorsResponse, handleCorsPreflight } from '../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(res)
  }

  if (req.method === 'GET') {
    return await getReservations(req, res)
  }

  if (req.method === 'POST') {
    return await createReservation(req, res)
  }

  return createCorsResponse(res, { error: 'Method not allowed' }, 405)
}

async function getReservations(req: VercelRequest, res: VercelResponse) {
  try {
    const { instrumentName } = req.query
    
    let result
    if (instrumentName) {
      result = await sql`
        SELECT * FROM reservations 
        WHERE instrumentName = ${instrumentName as string}
        ORDER BY createdAt DESC
      `
    } else {
      result = await sql`
        SELECT * FROM reservations 
        ORDER BY createdAt DESC
      `
    }
    
    const reservations = result.rows as Reservation[]
    
    // Transform reservations into the format expected by the frontend
    const reservationsByInstrument: ReservationsByInstrument = {}
    
    reservations.forEach(reservation => {
      if (!reservationsByInstrument[reservation.instrumentName]) {
        reservationsByInstrument[reservation.instrumentName] = {}
      }
      const slotKey = `${reservation.date}-${reservation.slot}`
      // Store both reserver name, user ID, and reservation ID for deletion
      reservationsByInstrument[reservation.instrumentName][slotKey] = {
        reserverName: reservation.reserverName,
        reserverUserId: reservation.reserverUserId,
        id: reservation.id
      }
    })
    
    const response: ApiResponse<ReservationsByInstrument> = {
      success: true,
      data: reservationsByInstrument
    }
    
    return createCorsResponse(res, response)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch reservations'
    }
    return createCorsResponse(res, response, 500)
  }
}

async function createReservation(req: VercelRequest, res: VercelResponse) {
  try {
    const body: CreateReservationRequest = req.body
    const { instrumentName, slot, date, reserverName, reserverUserId } = body
    
    if (!instrumentName || !slot || !date || !reserverName || !reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: instrumentName, slot, date, reserverName, reserverUserId'
      }
      return createCorsResponse(res, response, 400)
    }
    
    // Check if slot is already reserved
    const existingReservation = await sql`
      SELECT * FROM reservations 
      WHERE instrumentName = ${instrumentName} AND slot = ${slot} AND date = ${date}
    `
    
    if (existingReservation.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Slot is already reserved'
      }
      return createCorsResponse(res, response, 409)
    }
    
    // Create new reservation
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await sql`
      INSERT INTO reservations (id, instrumentName, slot, date, reserverName, reserverUserId, createdAt, updatedAt)
      VALUES (${id}, ${instrumentName}, ${slot}, ${date}, ${reserverName}, ${reserverUserId}, ${now}, ${now})
    `
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: {
        id,
        instrumentName,
        slot,
        date,
        reserverName,
        reserverUserId,
        createdAt: now,
        updatedAt: now
      }
    }
    return createCorsResponse(res, response, 201)
  } catch (error) {
    console.error('Error creating reservation:', error)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create reservation'
    }
    return createCorsResponse(res, response, 500)
  }
}
