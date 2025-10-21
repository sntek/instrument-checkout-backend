import { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { createCorsResponse, handleCorsPreflight } from '../../utils/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(res)
  }

  if (req.method !== 'POST') {
    return createCorsResponse(res, { error: 'Method not allowed' }, 405)
  }

  try {
    console.log('Starting daily reservation rollover...')
    
    // Get current date and tomorrow's date
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
    const tomorrowStr = tomorrow.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log(`Processing rollover: ${todayStr} <- ${tomorrowStr}`)
    
    // Step 1: Clear today's reservations
    console.log('Clearing today\'s reservations...')
    const deleteTodayResult = await sql`
      DELETE FROM reservations WHERE date = ${todayStr}
    `
    
    console.log(`Deleted reservations from today (${todayStr})`)
    
    // Step 2: Get tomorrow's reservations
    console.log('Fetching tomorrow\'s reservations...')
    const tomorrowReservations = await sql`
      SELECT * FROM reservations WHERE date = ${tomorrowStr}
    `
    
    console.log(`Found ${tomorrowReservations.rows.length} reservations for tomorrow (${tomorrowStr})`)
    
    // Step 3: Copy tomorrow's reservations to today
    if (tomorrowReservations.rows.length > 0) {
      console.log('Copying tomorrow\'s reservations to today...')
      
      // Prepare batch insert
      const insertPromises = tomorrowReservations.rows.map(async (reservation: any) => {
        const newId = crypto.randomUUID()
        const now = new Date().toISOString()
        
        return sql`
          INSERT INTO reservations (id, instrumentName, slot, date, reserverName, reserverUserId, createdAt, updatedAt)
          VALUES (${newId}, ${reservation.instrumentName}, ${reservation.slot}, ${todayStr}, ${reservation.reserverName}, ${reservation.reserverUserId}, ${now}, ${now})
        `
      })
      
      await Promise.all(insertPromises)
      console.log(`Copied ${tomorrowReservations.rows.length} reservations to today (${todayStr})`)
    }
    
    // Step 4: Clear tomorrow's reservations
    console.log('Clearing tomorrow\'s reservations...')
    const deleteTomorrowResult = await sql`
      DELETE FROM reservations WHERE date = ${tomorrowStr}
    `
    
    console.log(`Deleted reservations from tomorrow (${tomorrowStr})`)
    
    console.log('Daily reservation rollover completed successfully')
    
    return createCorsResponse(res, { 
      success: true, 
      message: 'Daily reservation rollover completed successfully' 
    })
  } catch (error) {
    console.error('Error during daily reservation rollover:', error)
    return createCorsResponse(res, { 
      success: false, 
      error: 'Daily reservation rollover failed' 
    }, 500)
  }
}
