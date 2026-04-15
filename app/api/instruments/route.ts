import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Instrument, ApiResponse } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const teamSlug = req.nextUrl.searchParams.get('team');

    let result;
    if (teamSlug) {
      result = await pool.query('SELECT * FROM instruments WHERE team_slug = $1 ORDER BY name', [teamSlug]);
    } else {
      result = await pool.query('SELECT * FROM instruments ORDER BY name');
    }

    const instruments: Instrument[] = result.rows.map((row: any) => ({
      name: row.name,
      os: row.os,
      ip: row.ip,
      sources: row.sources ?? [],
      team_slug: row.team_slug
    }));

    const response: ApiResponse<Instrument[]> = {
      success: true,
      data: instruments
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching instruments:', error);
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
    const { oldName, name, os, ip, sources } = body;

    if (!oldName) {
      return NextResponse.json({ success: false, error: 'Original instrument name is required' }, { status:400 });
    }

    if (name && name !== oldName) {
      await pool.query('UPDATE reservations SET instrumentName = $1 WHERE instrumentName = $2', [name, oldName]);
    }

    const result = await pool.query(
      `UPDATE instruments
       SET name = COALESCE($1, name), os = $2, ip = $3, sources = $4, updatedAt = $5
       WHERE name = $6
       RETURNING *`,
      [name, os, ip, JSON.stringify(sources ?? []), new Date().toISOString(), oldName]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: result.rows[0].name,
        os: result.rows[0].os,
        ip: result.rows[0].ip,
        sources: result.rows[0].sources ?? []
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
    const { name, os, ip, sources, team_slug } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Instrument name is required' }, { status: 400 });
    }
    if (!team_slug) {
      return NextResponse.json({ success: false, error: 'Team is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO instruments (name, os, ip, sources, team_slug, createdAt, updatedAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, os, ip, JSON.stringify(sources ?? []), team_slug, now, now]
    );

    return NextResponse.json({
      success: true,
      data: {
        name: result.rows[0].name,
        os: result.rows[0].os,
        ip: result.rows[0].ip,
        sources: result.rows[0].sources ?? []
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating instrument:', error);
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

    await pool.query('DELETE FROM reservations WHERE instrumentName = $1', [name]);

    const result = await pool.query('DELETE FROM instruments WHERE name = $1 RETURNING *', [name]);

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
