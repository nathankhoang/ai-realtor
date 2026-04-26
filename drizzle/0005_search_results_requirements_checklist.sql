-- Migration: per-requirement evaluations on each search result.
-- Additive (nullable column) — safe to run while old code is in production.

ALTER TABLE search_results
  ADD COLUMN IF NOT EXISTS requirements_checklist jsonb;
