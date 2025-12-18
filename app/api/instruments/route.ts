import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { Instrument, ApiResponse } from '@/types';

export async function GET() {
  try {
    const result = await sql`SELECT * FROM instruments ORDER BY name`;
    const instruments: Instrument[] = result.rows.map((row: any) => ({
      name: row.name,
      os: row.os,
      group: row.group_name,
      ip: row.ip
    }));

    const response: ApiResponse<Instrument[]> = {
      success: true,
      data: instruments
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching instruments:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch instruments'
    };
    return NextResponse.json({ success: false, error: 'Failed to fetch instruments' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { oldName, name, os, group, ip } = body;

    if (!oldName) {
      return NextResponse.json({ success: false, error: 'Original instrument name is required' }, { status:400 });
    }

    // Start a transaction if possible, or run sequentially
    // Since we are using @vercel/postgres, we can use sql.begin() or just run queries.
    // Vercel postgres doesn't support transactions in the simple `sql` template literal as easily as a client.
    // But we can run multiple queries.

    // If name changed, we need to update reservations too
    if (name && name !== oldName) {
      await sql`UPDATE reservations SET instrumentName = ${name} WHERE instrumentName = ${oldName}`;
    }

    const result = await sql`
      UPDATE instruments 
      SET 
        name = COALESCE(${name}, name),
        os = ${os},
        group_name = ${group},
        ip = ${ip},
        updatedAt = ${new Date().toISOString()}
      WHERE name = ${oldName}
      RETURNING *
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: result.rows[0].name,
        os: result.rows[0].os,
        group: result.rows[0].group_name,
        ip: result.rows[0].ip
      }
    });
  } catch (error) {
    console.error('Error updating instrument:', error);
    return NextResponse.json({ success: false, error: 'Failed to update instrument' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, os, group, ip } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Instrument name is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO instruments (name, os, group_name, ip, createdAt, updatedAt)
      VALUES (${name}, ${os}, ${group}, ${ip}, ${new Date().toISOString()}, ${new Date().toISOString()})
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: {
        name: result.rows[0].name,
        os: result.rows[0].os,
        group: result.rows[0].group_name,
        ip: result.rows[0].ip
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating instrument:', error);
    // Check for unique constraint violation (instrument name already exists)
    if ((error as any).code === '23505') {
      return NextResponse.json({ success: false, error: 'Instrument name already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create instrument' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ success: false, error: 'Instrument name is required' }, { status: 400 });
    }

    // Optional: Delete reservations for this instrument first to maintain cleanliness
    await sql`DELETE FROM reservations WHERE instrumentName = ${name}`;

    const result = await sql`
      DELETE FROM instruments 
      WHERE name = ${name}
      RETURNING *
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Instrument and its reservations deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting instrument:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete instrument' }, { status: 500 });
  }
}

