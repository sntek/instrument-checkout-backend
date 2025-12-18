import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting daily reservation rollover...');
    
    // Get current date and tomorrow's date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`Processing rollover: ${todayStr} <- ${tomorrowStr}`);
    
    // Step 1: Clear today's reservations
    console.log('Clearing today\'s reservations...');
    await sql`DELETE FROM reservations WHERE date = ${todayStr}`;
    
    // Step 2: Get tomorrow's reservations
    console.log('Fetching tomorrow\'s reservations...');
    const tomorrowReservations = await sql`SELECT * FROM reservations WHERE date = ${tomorrowStr}`;
    
    // Step 3: Copy tomorrow's reservations to today
    if (tomorrowReservations.rows.length > 0) {
      console.log('Copying tomorrow\'s reservations to today...');
      
      const insertPromises = tomorrowReservations.rows.map(async (reservation: any) => {
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        return sql`
          INSERT INTO reservations (id, instrumentname, slot, date, reservername, reserveruserid, createdat, updatedat)
          VALUES (${newId}, ${reservation.instrumentname}, ${reservation.slot}, ${todayStr}, ${reservation.reservername}, ${reservation.reserveruserid}, ${now}, ${now})
        `;
      });
      
      await Promise.all(insertPromises);
    }
    
    // Step 4: Clear tomorrow's reservations
    console.log('Clearing tomorrow\'s reservations...');
    await sql`DELETE FROM reservations WHERE date = ${tomorrowStr}`;
    
    console.log('Daily reservation rollover completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily reservation rollover completed successfully' 
    });
  } catch (error) {
    console.error('Error during daily reservation rollover:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Daily reservation rollover failed' 
    }, { status: 500 });
  }
}

