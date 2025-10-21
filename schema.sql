-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  instrumentName TEXT NOT NULL,
  slot TEXT NOT NULL,
  date TEXT NOT NULL,
  reserverName TEXT NOT NULL,
  reserverUserId TEXT NOT NULL,
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

-- Create instruments table (optional - for dynamic instrument management)
CREATE TABLE IF NOT EXISTS instruments (
  name TEXT PRIMARY KEY,
  os TEXT,
  group_name TEXT,
  ip TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Insert default instruments
INSERT OR IGNORE INTO instruments (name, os, group_name, ip, createdAt, updatedAt) VALUES
('MSO46B-Q000024', 'Linux', 'G8', '10.233.67.6', datetime('now'), datetime('now')),
('MSO56-Q100057', 'Linux', 'G8', '10.233.66.244', datetime('now'), datetime('now')),
('MSO58B-PQ010001', 'Windows', 'G8', '10.233.65.193', datetime('now'), datetime('now')),
('MSO54B-PQ010002', 'Linux', 'G8', '10.233.65.195', datetime('now'), datetime('now')),
('DPO71A-KR20007', NULL, 'G8', NULL, datetime('now'), datetime('now')),
('MSO68B-B030015', 'Windows', 'G8', '10.233.67.178', datetime('now'), datetime('now')),
('MSO58B-C067209', NULL, 'G8', NULL, datetime('now'), datetime('now')),
('MSO44B-SGVJ010550', 'Linux', NULL, '10.233.67.186', datetime('now'), datetime('now'));
