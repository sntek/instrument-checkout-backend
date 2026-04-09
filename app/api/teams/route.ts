import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

function isAdmin(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;
  const decoded = atob(authHeader.slice(6));
  const [user, pass] = decoded.split(':');
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ success: false, error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await pool.query(
      'INSERT INTO teams (slug, name, createdAt, updatedAt) VALUES ($1, $2, $3, $4) RETURNING *',
      [slug, name, now, now]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Team slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create team' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { oldSlug, name, slug } = await req.json();

    if (!oldSlug) {
      return NextResponse.json({ success: false, error: 'oldSlug is required' }, { status: 400 });
    }

    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ success: false, error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // If slug changed, update instruments and reservations
    if (slug && slug !== oldSlug) {
      await pool.query('UPDATE instruments SET team_slug = $1 WHERE team_slug = $2', [slug, oldSlug]);
      await pool.query('UPDATE reservations SET team_slug = $1 WHERE team_slug = $2', [slug, oldSlug]);
    }

    const result = await pool.query(
      'UPDATE teams SET name = COALESCE($1, name), slug = COALESCE($2, slug), updatedAt = $3 WHERE slug = $4 RETURNING *',
      [name, slug, now, oldSlug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating team:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Team slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    // Delete all reservations for this team's instruments, then instruments, then team
    await pool.query(
      'DELETE FROM reservations WHERE instrumentname IN (SELECT name FROM instruments WHERE team_slug = $1)',
      [slug]
    );
    await pool.query('DELETE FROM instruments WHERE team_slug = $1', [slug]);
    const result = await pool.query('DELETE FROM teams WHERE slug = $1 RETURNING *', [slug]);

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete team' }, { status: 500 });
  }
}
