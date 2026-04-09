import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      const response: ApiResponse = {
        success: false,
        error: 'Reservation ID is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { reserverUserId } = await req.json() || {};

    if (!reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required to delete reservation'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const existingReservation = await pool.query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );

    if (existingReservation.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Reservation not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (existingReservation.rows[0].reserveruserid !== reserverUserId) {
      const response: ApiResponse = {
        success: false,
        error: 'You can only delete your own reservations'
      };
      return NextResponse.json(response, { status: 403 });
    }

    await pool.query('DELETE FROM reservations WHERE id = $1', [id]);

    const response: ApiResponse = {
      success: true,
      data: { deleted: true }
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting reservation:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete reservation'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
