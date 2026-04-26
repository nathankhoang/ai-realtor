-- Migration: add lat/lng to listings so the results page can render a
-- map view. Free Leaflet + OpenStreetMap path — no geocoding service
-- needed since Zillow already returns coordinates per property.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Coarse index lets future "nearby" queries use a bounding-box scan.
CREATE INDEX IF NOT EXISTS idx_listings_coords
  ON listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
