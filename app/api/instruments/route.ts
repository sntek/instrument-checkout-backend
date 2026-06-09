import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Instrument, ApiResponse } from '@/types';
import { MOCK_INSTRUMENTS } from '@/lib/mock-data';

const DEV_BYPASS = process.env.NODE_ENV === 'development' && (process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' || process.env.BYPASS_AUTH === 'true');

export async function GET(req: NextRequest) {
  try {
    const teamSlug = req.nextUrl.searchParams.get('team');

    if (DEV_BYPASS) {
      const filtered = teamSlug ? MOCK_INSTRUMENTS.filter(i => i.team_slug === teamSlug) : MOCK_INSTRUMENTS;
      return NextResponse.json({ success: true, data: filtered });
    }

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
      team_slug: row.team_slug,
      long_term_checkout_user_id: row.long_term_checkout_user_id,
      long_term_checkout_user_name: row.long_term_checkout_user_name
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
    const { oldName, name, os, ip, sources, long_term_checkout_user_id, long_term_checkout_user_name } = body;

    if (!oldName) {
      return NextResponse.json({ success: false, error: 'Original instrument name is required' }, { status:400 });
    }

    if (DEV_BYPASS) {
      const index = MOCK_INSTRUMENTS.findIndex(i => i.name === oldName);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
      }
      MOCK_INSTRUMENTS[index] = { ...MOCK_INSTRUMENTS[index], name: name || oldName, os, ip, sources: sources ?? [] };
      return NextResponse.json({ success: true, data: MOCK_INSTRUMENTS[index] });
    }

    if (name && name !== oldName) {
      await pool.query('UPDATE reservations SET instrumentName = $1 WHERE instrumentName = $2', [name, oldName]);
    }

    const result = await pool.query(
      `UPDATE instruments
       SET name = COALESCE($1, name), os = $2, ip = $3, sources = $4, 
           long_term_checkout_user_id = $5, long_term_checkout_user_name = $6, updatedAt = $7
       WHERE name = $8
       RETURNING *`,
      [name, os, ip, JSON.stringify(sources ?? []), long_term_checkout_user_id, long_term_checkout_user_name, new Date().toISOString(), oldName]
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
        sources: result.rows[0].sources ?? [],
        long_term_checkout_user_id: result.rows[0].long_term_checkout_user_id,
        long_term_checkout_user_name: result.rows[0].long_term_checkout_user_name
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

    if (DEV_BYPASS) {
      if (ip && ip.trim() !== '') {
        const duplicate = MOCK_INSTRUMENTS.find(i => i.team_slug === team_slug && i.ip === ip);
        if (duplicate) {
          return NextResponse.json({ 
            success: false, 
            error: `IP address ${ip} is already used by instrument "${duplicate.name}" in this team` 
          }, { status: 409 });
        }
      }
      const mockInstrument: Instrument = { name, os, ip, sources: sources ?? [], team_slug };
      MOCK_INSTRUMENTS.push(mockInstrument);
      return NextResponse.json({ success: true, data: mockInstrument }, { status: 201 });
    }

    if (ip && ip.trim() !== '') {
      const duplicateCheck = await pool.query(
        'SELECT name FROM instruments WHERE team_slug = $1 AND ip = $2',
        [team_slug, ip]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `IP address ${ip} is already used by instrument "${duplicateCheck.rows[0].name}" in this team` 
        }, { status: 409 });
      }
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

    if (DEV_BYPASS) {
      const index = MOCK_INSTRUMENTS.findIndex(i => i.name === name);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Instrument not found' }, { status: 404 });
      }
      MOCK_INSTRUMENTS.splice(index, 1);
      return NextResponse.json({ success: true, message: 'Instrument and its reservations deleted successfully' });
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
