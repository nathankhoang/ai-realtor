-- Migration: enforce uniqueness of (search_id, listing_id) on search_results.
-- Apply via Neon SQL editor or `npx drizzle-kit push` after setting
-- DATABASE_URL locally.
--
-- IMPORTANT: if any duplicate rows already exist, the index creation will
-- fail. Run the dedup statement first, then create the index.

-- 1. Remove duplicate rows, keeping the most-recently-created one per
--    (search_id, listing_id) pair.
DELETE FROM search_results sr1
USING search_results sr2
WHERE sr1.search_id = sr2.search_id
  AND sr1.listing_id = sr2.listing_id
  AND sr1.created_at < sr2.created_at;

-- 2. Add the unique constraint.
ALTER TABLE search_results
  ADD CONSTRAINT search_results_search_id_listing_id_unique
  UNIQUE (search_id, listing_id);
