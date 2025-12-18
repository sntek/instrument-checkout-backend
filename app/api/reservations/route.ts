import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { Reservation, CreateReservationRequest, ApiResponse, ReservationsByInstrument } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentName = searchParams.get('instrumentName');
    
    let result;
    if (instrumentName) {
      result = await sql`
        SELECT 
          id,
          instrumentname as "instrumentName",
          slot,
          date,
          reservername as "reserverName",
          reserveruserid as "reserverUserId",
          createdat as "createdAt",
          updatedat as "updatedAt"
        FROM reservations 
        WHERE instrumentname = ${instrumentName}
        ORDER BY createdat DESC
      `;
    } else {
      result = await sql`
        SELECT 
          id,
          instrumentname as "instrumentName",
          slot,
          date,
          reservername as "reserverName",
          reserveruserid as "reserverUserId",
          createdat as "createdAt",
          updatedat as "updatedAt"
        FROM reservations 
        ORDER BY createdat DESC
      `;
    }
    
    const reservations = result.rows as Reservation[];
    
    const reservationsByInstrument: ReservationsByInstrument = {};
    
    reservations.forEach(reservation => {
      if (!reservationsByInstrument[reservation.instrumentName]) {
        reservationsByInstrument[reservation.instrumentName] = {};
      }
      const slotKey = `${reservation.date}-${reservation.slot}`;
      reservationsByInstrument[reservation.instrumentName][slotKey] = {
        reserverName: reservation.reserverName,
        reserverUserId: reservation.reserverUserId,
        id: reservation.id
      };
    });
    
    const response: ApiResponse<ReservationsByInstrument> = {
      success: true,
      data: reservationsByInstrument
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch reservations'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateReservationRequest = await req.json();
    const { instrumentName, slot, date, reserverName, reserverUserId } = body;
    
    if (!instrumentName || !slot || !date || !reserverName || !reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: instrumentName, slot, date, reserverName, reserverUserId'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const existingReservation = await sql`
      SELECT * FROM reservations 
      WHERE instrumentname = ${instrumentName} AND slot = ${slot} AND date = ${date}
    `;
    
    if (existingReservation.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Slot is already reserved'
      };
      return NextResponse.json(response, { status: 409 });
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await sql`
      INSERT INTO reservations (id, instrumentname, slot, date, reservername, reserveruserid, createdat, updatedat)
      VALUES (${id}, ${instrumentName}, ${slot}, ${date}, ${reserverName}, ${reserverUserId}, ${now}, ${now})
    `;
    
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
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create reservation'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

