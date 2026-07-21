-- Add last known location field to instruments table
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS location TEXT;
