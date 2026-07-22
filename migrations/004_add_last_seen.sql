-- Migration 004: Add last_seen column to instruments table
-- Populated by the scope check-in endpoint (POST /api/instruments/checkin).
-- Safe to run on existing databases — ADD COLUMN IF NOT EXISTS preserves all existing rows.
-- Existing instruments will have last_seen default to NULL until their first check-in.

ALTER TABLE instruments
  ADD COLUMN IF NOT EXISTS last_seen TEXT;
