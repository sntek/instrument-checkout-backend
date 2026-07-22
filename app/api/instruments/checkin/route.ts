import pool from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { MOCK_INSTRUMENTS, MOCK_TEAMS } from '@/lib/mock-data';

const DEV_BYPASS = process.env.NODE_ENV === 'development' && (process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' || process.env.BYPASS_AUTH === 'true');

// Optional shared secret. When SCOPE_CHECKIN_TOKEN is set, check-ins must send a
// matching `X-Scope-Token` header. Leave unset to accept unauthenticated check-ins.
const CHECKIN_TOKEN = process.env.SCOPE_CHECKIN_TOKEN;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Scope-Token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/instruments/checkin
// Heartbeat from an instrument. The instrument tells the web app its current IP
// (and optionally its team); the web app updates the matching instrument by
// name, or auto-registers a brand-new instrument under the given team if no
// row exists yet.
//
// Body: { name?: string, hostname?: string, ip: string, os?: string, team?: string }
//   - The registered instrument name is resolved from `name`, falling back to `hostname`.
//   - `ip` is required.
//   - `team` (or `team_slug`) is required only to auto-register a brand-new
//     instrument; for an existing instrument it's optional and reassigns its team.
//   - `os` (optional) only fills the field when it is currently empty.
export async function POST(req: NextRequest) {
  try {
    if (CHECKIN_TOKEN) {
      const provided = req.headers.get('x-scope-token');
      if (provided !== CHECKIN_TOKEN) {
        return NextResponse.json({ success: false, error: 'Invalid or missing check-in token' }, { status: 401, headers: CORS_HEADERS });
      }
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
    }

    const name: string | undefined = (body.name ?? body.hostname)?.toString().trim();
    const ip: string | undefined = body.ip?.toString().trim();
    const os: string | undefined = body.os?.toString().trim() || undefined;
    const team: string | undefined = (body.team ?? body.team_slug)?.toString().trim() || undefined;

    if (!name) {
      return NextResponse.json({ success: false, error: 'name (or hostname) is required' }, { status: 400, headers: CORS_HEADERS });
    }
    if (!ip) {
      return NextResponse.json({ success: false, error: 'ip is required' }, { status: 400, headers: CORS_HEADERS });
    }

    const now = new Date().toISOString();

    if (DEV_BYPASS) {
      if (team && !MOCK_TEAMS.some(t => t.slug === team)) {
        return NextResponse.json({ success: false, error: `Unknown team "${team}"` }, { status: 400, headers: CORS_HEADERS });
      }

      let inst = MOCK_INSTRUMENTS.find(i => i.name === name);
      if (!inst) {
        if (!team) {
          return NextResponse.json({ success: false, error: `No registered instrument named "${name}"; pass "team" to auto-register it` }, { status: 404, headers: CORS_HEADERS });
        }
        inst = { name, os, ip, sources: [], team_slug: team };
        MOCK_INSTRUMENTS.push(inst);
      }

      const teamSlug = team ?? inst.team_slug;
      // Clear this IP from any other instrument in the same team so it stays unique.
      MOCK_INSTRUMENTS.forEach(i => { if (i.name !== name && i.team_slug === teamSlug && i.ip === ip) i.ip = undefined; });
      inst.ip = ip;
      inst.last_seen = now;
      if (os && !inst.os) inst.os = os;
      if (team) inst.team_slug = team;

      return NextResponse.json({ success: true, data: { name: inst.name, ip: inst.ip, team_slug: inst.team_slug, last_seen: inst.last_seen } }, { headers: CORS_HEADERS });
    }

    if (team) {
      const teamCheck = await pool.query('SELECT slug FROM teams WHERE slug = $1', [team]);
      if (teamCheck.rowCount === 0) {
        return NextResponse.json({ success: false, error: `Unknown team "${team}"` }, { status: 400, headers: CORS_HEADERS });
      }
    }

    const existing = await pool.query('SELECT name, team_slug FROM instruments WHERE name = $1', [name]);

    if (existing.rowCount === 0) {
      if (!team) {
        return NextResponse.json({ success: false, error: `No registered instrument named "${name}"; pass "team" to auto-register it` }, { status: 404, headers: CORS_HEADERS });
      }

      // Release this IP from any other instrument already in that team before claiming it.
      await pool.query(
        'UPDATE instruments SET ip = NULL, updatedAt = $1 WHERE team_slug = $2 AND ip = $3',
        [now, team, ip]
      );

      const inserted = await pool.query(
        `INSERT INTO instruments (name, os, ip, team_slug, last_seen, sources, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, $5, $5)
         RETURNING name, ip, os, team_slug, last_seen`,
        [name, os ?? null, ip, team, now]
      );

      return NextResponse.json({
        success: true,
        data: {
          name: inserted.rows[0].name,
          ip: inserted.rows[0].ip,
          os: inserted.rows[0].os,
          team_slug: inserted.rows[0].team_slug,
          last_seen: inserted.rows[0].last_seen,
        },
      }, { status: 201, headers: CORS_HEADERS });
    }

    const teamSlug = team ?? existing.rows[0].team_slug;

    // Keep IP unique within the team: release it from any other instrument that
    // was previously reporting this address (e.g. DHCP handed it to a new scope).
    await pool.query(
      'UPDATE instruments SET ip = NULL, updatedAt = $1 WHERE team_slug = $2 AND ip = $3 AND name <> $4',
      [now, teamSlug, ip, name]
    );

    const result = await pool.query(
      `UPDATE instruments
         SET ip = $1, last_seen = $2, updatedAt = $2, os = COALESCE(os, $3), team_slug = COALESCE($4, team_slug)
       WHERE name = $5
       RETURNING name, ip, os, team_slug, last_seen`,
      [ip, now, os ?? null, team ?? null, name]
    );

    return NextResponse.json({
      success: true,
      data: {
        name: result.rows[0].name,
        ip: result.rows[0].ip,
        os: result.rows[0].os,
        team_slug: result.rows[0].team_slug,
        last_seen: result.rows[0].last_seen,
      },
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error processing instrument check-in:', error);
    return NextResponse.json({ success: false, error: 'Failed to process check-in' }, { status: 500, headers: CORS_HEADERS });
  }
}
