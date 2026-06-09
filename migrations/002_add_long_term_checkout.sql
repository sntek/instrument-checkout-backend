-- Add long term checkout fields to instruments table
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS long_term_checkout_user_id TEXT;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS long_term_checkout_user_name TEXT;
