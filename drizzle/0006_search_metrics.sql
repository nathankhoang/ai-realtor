-- Migration: per-search cost & A/B testing metrics.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS tokens_used integer,
  ADD COLUMN IF NOT EXISTS vision_model text;
