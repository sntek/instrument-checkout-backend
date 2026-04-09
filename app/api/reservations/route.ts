import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Reservation, CreateReservationRequest, ApiResponse, ReservationsByInstrument } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentName = searchParams.get('instrumentName');
    const teamSlug = searchParams.get('team');

    let result;
    if (instrumentName) {
      result = await pool.query(
        `SELECT id, instrumentname AS "instrumentName", slot, date,
                reservername AS "reserverName", reserveruserid AS "reserverUserId",
                createdat AS "createdAt", updatedat AS "updatedAt"
         FROM reservations WHERE instrumentname = $1 ORDER BY createdat DESC`,
        [instrumentName]
      );
    } else if (teamSlug) {
      // Get reservations for all instruments in this team
      result = await pool.query(
        `SELECT r.id, r.instrumentname AS "instrumentName", r.slot, r.date,
                r.reservername AS "reserverName", r.reserveruserid AS "reserverUserId",
                r.createdat AS "createdAt", r.updatedat AS "updatedAt"
         FROM reservations r
         JOIN instruments i ON r.instrumentname = i.name
         WHERE i.team_slug = $1
         ORDER BY r.createdat DESC`,
        [teamSlug]
      );
    } else {
      result = await pool.query(
        `SELECT id, instrumentname AS "instrumentName", slot, date,
                reservername AS "reserverName", reserveruserid AS "reserverUserId",
                createdat AS "createdAt", updatedat AS "updatedAt"
         FROM reservations ORDER BY createdat DESC`
      );
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

    const existingReservation = await pool.query(
      'SELECT * FROM reservations WHERE instrumentname = $1 AND slot = $2 AND date = $3',
      [instrumentName, slot, date]
    );

    if (existingReservation.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Slot is already reserved'
      };
      return NextResponse.json(response, { status: 409 });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO reservations (id, instrumentname, slot, date, reservername, reserveruserid, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, instrumentName, slot, date, reserverName, reserverUserId, now, now]
    );

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
