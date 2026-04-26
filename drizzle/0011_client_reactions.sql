-- Migration: per-saved-listing client reactions on the shared report page.
-- Stored on saved_listings (one reaction per listing, latest wins) so the
-- agent gets a single consolidated signal per home.

ALTER TABLE saved_listings
  ADD COLUMN IF NOT EXISTS client_reaction text,
  ADD COLUMN IF NOT EXISTS client_comment text,
  ADD COLUMN IF NOT EXISTS client_reacted_at timestamp;

ALTER TABLE saved_listings
  DROP CONSTRAINT IF EXISTS saved_listings_reaction_valid;

ALTER TABLE saved_listings
  ADD CONSTRAINT saved_listings_reaction_valid
  CHECK (client_reaction IS NULL OR client_reaction IN ('love','pass'));
