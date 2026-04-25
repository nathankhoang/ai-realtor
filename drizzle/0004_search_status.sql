-- Migration: search lifecycle tracking + cancel support.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'running',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS completed_at timestamp,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp;

-- Backfill: mark all existing searches as 'completed' so the stepper
-- doesn't latch onto pre-existing rows. Adjust if you want them all
-- marked 'running' instead.
UPDATE searches
SET status = 'completed', completed_at = COALESCE(completed_at, created_at)
WHERE status = 'running'
  AND created_at < now() - interval '5 minutes';

CREATE INDEX IF NOT EXISTS idx_searches_status ON searches (status);
