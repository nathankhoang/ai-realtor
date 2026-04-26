-- Migration: turn any search into a recurring monitor. The daily cron
-- re-runs the Zillow query, scores any new listings, and emails the
-- agent when one matches strongly.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS is_monitored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monitor_last_run_at timestamp;

CREATE INDEX IF NOT EXISTS idx_searches_monitored
  ON searches (is_monitored)
  WHERE is_monitored = true;
