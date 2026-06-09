import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { MOCK_TEAMS } from '@/lib/mock-data';

const DEV_BYPASS = process.env.NODE_ENV === 'development' && (process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' || process.env.BYPASS_AUTH === 'true');

export async function GET() {
  if (DEV_BYPASS) {
    return NextResponse.json({ success: true, data: MOCK_TEAMS });
  }
  
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ success: false, error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 });
    }

    if (DEV_BYPASS) {
      const now = new Date().toISOString();
      const mockTeam = { slug, name, createdAt: now, updatedAt: now };
      MOCK_TEAMS.push(mockTeam);
      return NextResponse.json({ success: true, data: mockTeam }, { status: 201 });
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
  try {
    const { oldSlug, name, slug } = await req.json();

    if (!oldSlug) {
      return NextResponse.json({ success: false, error: 'oldSlug is required' }, { status: 400 });
    }

    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ success: false, error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 });
    }

    if (DEV_BYPASS) {
      const teamIndex = MOCK_TEAMS.findIndex(t => t.slug === oldSlug);
      if (teamIndex === -1) {
        return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
      }
      const now = new Date().toISOString();
      MOCK_TEAMS[teamIndex] = { ...MOCK_TEAMS[teamIndex], name: name || MOCK_TEAMS[teamIndex].name, slug: slug || MOCK_TEAMS[teamIndex].slug, updatedAt: now };
      return NextResponse.json({ success: true, data: MOCK_TEAMS[teamIndex] });
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
  try {
    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    if (DEV_BYPASS) {
      const teamIndex = MOCK_TEAMS.findIndex(t => t.slug === slug);
      if (teamIndex === -1) {
        return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
      }
      MOCK_TEAMS.splice(teamIndex, 1);
      return NextResponse.json({ success: true, message: 'Team deleted' });
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
