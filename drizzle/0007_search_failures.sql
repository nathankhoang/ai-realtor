-- Migration: per-listing analysis failure tracking.

CREATE TABLE IF NOT EXISTS search_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES searches(id),
  listing_id uuid NOT NULL REFERENCES listings(id),
  error_message text,
  error_type text,
  attempt_count integer NOT NULL DEFAULT 1,
  occurred_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT search_failures_search_id_listing_id_unique UNIQUE (search_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_search_failures_search_id
  ON search_failures (search_id);
