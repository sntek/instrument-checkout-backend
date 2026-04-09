-- Better Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  instrumentName TEXT NOT NULL,
  slot TEXT NOT NULL,
  date TEXT NOT NULL,
  reserverName TEXT NOT NULL,
  reserverUserId TEXT NOT NULL,
  team_slug TEXT NOT NULL DEFAULT 'rocket-lab',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_reservations_instrument_date_slot
ON reservations(instrumentName, date, slot);

CREATE INDEX IF NOT EXISTS idx_reservations_reserver
ON reservations(reserverName);

CREATE INDEX IF NOT EXISTS idx_reservations_reserver_user_id
ON reservations(reserverUserId);

CREATE INDEX IF NOT EXISTS idx_reservations_team
ON reservations(team_slug);

-- Create instruments table
CREATE TABLE IF NOT EXISTS instruments (
  name TEXT PRIMARY KEY,
  os TEXT,
  group_name TEXT,
  ip TEXT,
  team_slug TEXT NOT NULL DEFAULT 'rocket-lab',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instruments_team
ON instruments(team_slug);

-- Seed default teams
INSERT INTO teams (slug, name, createdAt, updatedAt) VALUES
('rocket-lab', 'Rocket Lab 🚀', NOW()::TEXT, NOW()::TEXT),
('nightlords', 'Nightlords', NOW()::TEXT, NOW()::TEXT),
('boxcar', 'Boxcar', NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (slug) DO NOTHING;

-- Insert default instruments into Rocket Lab
INSERT INTO instruments (name, os, group_name, ip, team_slug, createdAt, updatedAt) VALUES
('MSO46B-Q000024', 'Linux', 'G8', '10.233.67.6', 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO56-Q100057', 'Linux', 'G8', '10.233.66.244', 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO58B-PQ010001', 'Windows', 'G8', '10.233.65.193', 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO54B-PQ010002', 'Linux', 'G8', '10.233.65.195', 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('DPO71A-KR20007', NULL, 'G8', NULL, 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO68B-B030015', 'Windows', 'G8', '10.233.67.178', 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO58B-C067209', NULL, 'G8', NULL, 'rocket-lab', NOW()::TEXT, NOW()::TEXT),
('MSO44B-SGVJ010550', 'Linux', NULL, '10.233.67.186', 'rocket-lab', NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (name) DO NOTHING;
