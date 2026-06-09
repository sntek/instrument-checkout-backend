# Development Guide

## Quick Start Without Docker

If you want to work on the frontend without starting Docker/PostgreSQL:

### 1. Enable Auth Bypass

Add this to your `.env.local` file:

```bash
BYPASS_AUTH=true
NEXT_PUBLIC_BYPASS_AUTH=true
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the App

Open http://localhost:3000 (or your configured port)

You'll be automatically logged in as a mock user:
- **Name**: Dev User
- **Email**: dev@tektronix.com
- **User ID**: dev-user

## What Works Without Docker

✅ **Works:**
- UI development
- Component testing
- Frontend routing
- Layout and styling
- Client-side logic
- **Creating/editing/deleting teams** (in-memory only)
- **Creating/editing/deleting instruments** (in-memory only)
- **Making/deleting reservations** (in-memory only)
- Authentication (bypassed with mock session)

⚠️ **Limitations:**
- All data is stored in memory and resets on server restart
- No persistence between sessions
- Data is not shared across different API route modules

## Full Development (With Docker)

For full functionality including database operations:

```bash
docker-compose up
```

This starts:
- PostgreSQL database (port 5432)
- Next.js app (port 3030)
- Database migrations
- Cron service

## Environment Variables

See `.env.example` for all available configuration options.

### Key Variables:

- `BYPASS_AUTH` - Set to `true` to enable in-memory API storage (development only)
- `NEXT_PUBLIC_BYPASS_AUTH` - Set to `true` to skip login screen (development only)
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_URL` - Auth service URL
- `BETTER_AUTH_SECRET` - Secret for auth tokens
- `TEK_SSO_SECRET` - Tektronix SSO password

## Tips

- The auth bypass only works in `NODE_ENV=development`
- Mock session data is defined in `app/page.tsx` and `app/[team]/page.tsx`
- To disable bypass, remove the env var or set it to `false`
