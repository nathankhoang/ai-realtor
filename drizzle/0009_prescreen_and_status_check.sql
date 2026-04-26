-- Migration:
--   1. searches.prescreened_zpids — pre-ranked zpid order from the initial
--      prescreen pass; pop next-batch from this list instead of re-running
--      the LLM on each click.
--   2. searches.status CHECK constraint — protects against typos sneaking
--      into the lifecycle string.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS prescreened_zpids jsonb;

ALTER TABLE searches
  DROP CONSTRAINT IF EXISTS searches_status_valid;

ALTER TABLE searches
  ADD CONSTRAINT searches_status_valid
  CHECK (status IN ('running','completed','failed','cancelled'));
