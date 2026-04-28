-- Migration: per-search override for the user's global emailAnalysisDone
-- preference. The completion worker reads this column when a search flips
-- to 'completed' and sends the analysis-done email. NULL means follow the
-- user's global pref; true/false force the per-search choice.

ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS notify_email_on_complete boolean;
