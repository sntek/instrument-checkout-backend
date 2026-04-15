-- Migration 001: Add sources column to instruments table
-- Safe to run on existing databases — ADD COLUMN IF NOT EXISTS preserves all existing rows.
-- Existing instruments will have sources default to an empty array.

ALTER TABLE instruments
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
