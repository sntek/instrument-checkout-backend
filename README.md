# Instrument Checkout Backend - Vercel

A serverless backend for instrument reservation system built with Vercel and Vercel Postgres.

## Features

- **Instrument Management**: Get list of available instruments
- **Reservation System**: Create, read, and delete reservations
- **Daily Rollover**: Automated daily reservation rollover via Vercel Cron
- **CORS Support**: Full CORS support for frontend integration
- **TypeScript**: Fully typed with TypeScript

## API Endpoints

### Instruments
- `GET /api/instruments` - Get all instruments

### Reservations
- `GET /api/reservations` - Get all reservations (optionally filter by instrumentName query param)
- `POST /api/reservations` - Create a new reservation
- `DELETE /api/reservations/[id]` - Delete a reservation

### System
- `GET /api/health` - Health check endpoint
- `POST /api/migrate` - Initialize database schema
- `POST /api/cron/daily-rollover` - Daily reservation rollover (automated via Vercel Cron)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Vercel Postgres
1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to the Storage tab
4. Create a new Postgres database
5. The environment variables will be automatically added

### 3. Deploy to Vercel
```bash
vercel deploy
```

### 4. Initialize Database
After deployment, make a POST request to `/api/migrate` to initialize the database schema and insert default instruments.

## Environment Variables

The following environment variables are automatically set by Vercel when you connect a Postgres database:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Database Schema

### Reservations Table
- `id` (TEXT, PRIMARY KEY)
- `instrumentName` (TEXT, NOT NULL)
- `slot` (TEXT, NOT NULL)
- `date` (TEXT, NOT NULL)
- `reserverName` (TEXT, NOT NULL)
- `reserverUserId` (TEXT, NOT NULL)
- `createdAt` (TEXT, NOT NULL)
- `updatedAt` (TEXT, NOT NULL)

### Instruments Table
- `name` (TEXT, PRIMARY KEY)
- `os` (TEXT)
- `group_name` (TEXT)
- `ip` (TEXT)
- `createdAt` (TEXT, NOT NULL)
- `updatedAt` (TEXT, NOT NULL)

## Cron Jobs

The daily reservation rollover is configured to run at midnight UTC (`0 0 * * *`) via Vercel Cron. This job:
1. Clears today's reservations
2. Copies tomorrow's reservations to today
3. Clears tomorrow's reservations

## Development

### Local Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Migration from Cloudflare Workers

This project has been migrated from Cloudflare Workers to Vercel with the following changes:

1. **Database**: D1 → Vercel Postgres
2. **Runtime**: Cloudflare Workers → Vercel Serverless Functions
3. **Cron**: Cloudflare Cron Triggers → Vercel Cron
4. **Environment**: Cloudflare Env → Vercel Environment Variables

The API interface remains the same, so frontend applications should work without changes.
