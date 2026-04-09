import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting daily reservation rollover...');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Processing rollover: ${todayStr} <- ${tomorrowStr}`);

    // Step 1: Clear today's reservations
    await pool.query('DELETE FROM reservations WHERE date = $1', [todayStr]);

    // Step 2: Get tomorrow's reservations
    const tomorrowReservations = await pool.query('SELECT * FROM reservations WHERE date = $1', [tomorrowStr]);

    // Step 3: Copy tomorrow's reservations to today
    if (tomorrowReservations.rows.length > 0) {
      console.log(`Copying ${tomorrowReservations.rows.length} reservations from tomorrow to today...`);

      const insertPromises = tomorrowReservations.rows.map(async (reservation: any) => {
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();

        return pool.query(
          `INSERT INTO reservations (id, instrumentname, slot, date, reservername, reserveruserid, createdat, updatedat)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, reservation.instrumentname, reservation.slot, todayStr, reservation.reservername, reservation.reserveruserid, now, now]
        );
      });

      await Promise.all(insertPromises);
    }

    // Step 4: Clear tomorrow's reservations
    await pool.query('DELETE FROM reservations WHERE date = $1', [tomorrowStr]);

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
