-- Migration: dedupe near-identical searches via a hash of normalized inputs.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS input_hash text;

CREATE INDEX IF NOT EXISTS idx_searches_user_hash
  ON searches (user_id, input_hash);
