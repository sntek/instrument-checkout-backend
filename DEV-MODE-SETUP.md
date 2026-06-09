# Quick Setup: Development Without Docker

## 1. Enable Bypass Mode

Create or update `.env.local`:

```bash
BYPASS_AUTH=true
NEXT_PUBLIC_BYPASS_AUTH=true
```

**Both variables are required:**
- `BYPASS_AUTH` - Enables in-memory storage for API routes (server-side)
- `NEXT_PUBLIC_BYPASS_AUTH` - Bypasses login screen (client-side)

## 2. Start Server

```bash
npm run dev
```

## 3. Access App

Open http://localhost:3000

You'll be automatically logged in as **Dev User** (dev@tektronix.com)

## What You Can Do

✅ Create, edit, and delete teams  
✅ Create, edit, and delete instruments  
✅ Make and cancel reservations  
✅ Test all UI components  
✅ Develop frontend features  

## Important Notes

- **In-Memory Storage**: All data is stored in memory
- **No Persistence**: Data resets when you restart the server
- **Development Only**: Bypass only works in development mode
- **No Database Required**: PostgreSQL/Docker not needed

## When You Need Docker

Use Docker when you need:
- Persistent data storage
- Production-like environment
- Database migrations
- Testing with real PostgreSQL

```bash
docker-compose up
```

## Troubleshooting

**Still seeing auth screen?**
- Verify both `BYPASS_AUTH=true` AND `NEXT_PUBLIC_BYPASS_AUTH=true` in `.env.local`
- Restart the dev server (required after changing `.env.local`)
- Check browser console for errors

**API errors (500 Internal Server Error)?**
- Make sure you're in development mode (`NODE_ENV=development`)
- Verify `BYPASS_AUTH=true` is set in `.env.local` (not just `NEXT_PUBLIC_BYPASS_AUTH`)
- Restart the server after changing `.env.local`
- Check terminal for error messages
