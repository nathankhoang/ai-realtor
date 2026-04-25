-- Migration: indexes for hot query paths + updated_at columns.
-- Apply via Neon SQL editor or `npx drizzle-kit push`.

-- updated_at columns (P3 #18)
ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

-- Indexes for common query patterns. CREATE INDEX CONCURRENTLY would be
-- safer in production (no table lock) but isn't valid inside a transaction
-- block; uncomment per-statement if running directly via psql.

CREATE INDEX IF NOT EXISTS idx_searches_user_id
  ON searches (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_searches_client_id
  ON searches (client_id);

CREATE INDEX IF NOT EXISTS idx_listing_analyses_listing_id
  ON listing_analyses (listing_id);

CREATE INDEX IF NOT EXISTS idx_search_results_search_score
  ON search_results (search_id, match_score DESC);

CREATE INDEX IF NOT EXISTS idx_search_results_listing_id
  ON search_results (listing_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id
  ON clients (user_id);

CREATE INDEX IF NOT EXISTS idx_saved_listings_client_id
  ON saved_listings (client_id);

CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id
  ON saved_listings (listing_id);
