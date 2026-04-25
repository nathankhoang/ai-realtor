-- Migration: cache Zillow detail payload per-listing.
-- Saves one Zillow API call per analyze-listing job whenever the same
-- listing has been seen recently for a different search.

ALTER TABLE listings
  ADD COLUMN detail_json jsonb,
  ADD COLUMN detail_fetched_at timestamp;
