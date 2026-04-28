-- Migration: photo-set hash for vision-cache invalidation. The worker
-- (src/app/api/jobs/analyze-listing/route.ts) caches vision results
-- per-listing for 30 days. That cache used to survive a listing being
-- re-photographed — same listingId, different photos, but we'd return
-- the stale analysis. Hash the photoUrls and key the cache on
-- (listingId, photoUrlsHash); old rows have NULL hash and are treated
-- as cache-miss on next worker run, so they get re-analyzed once.

ALTER TABLE listing_analyses
  ADD COLUMN IF NOT EXISTS photo_urls_hash text;
