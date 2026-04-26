-- Migration:
--   1. listing_user_meta — per-(user, listing) notes + tags (show/maybe/skip)
--      so an agent's quick judgments persist across saves and re-runs.
--   2. users — agent branding fields (display name, brokerage, phone, avatar,
--      message) shown on the shared client report.
--   3. clients — share-link view tracking (count + last viewed) so agents
--      know when to follow up.

CREATE TABLE IF NOT EXISTS listing_user_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  listing_id uuid REFERENCES listings(id) NOT NULL,
  note text,
  tag text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id),
  CONSTRAINT listing_user_meta_tag_valid CHECK (tag IS NULL OR tag IN ('show','maybe','skip'))
);

CREATE INDEX IF NOT EXISTS idx_listing_user_meta_user ON listing_user_meta (user_id);
CREATE INDEX IF NOT EXISTS idx_listing_user_meta_listing ON listing_user_meta (listing_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS brokerage text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS report_message text;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS share_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_last_viewed_at timestamp;
