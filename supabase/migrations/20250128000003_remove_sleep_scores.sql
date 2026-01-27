-- Remove computed score columns from sleep_entries
-- Keeping raw data (movement_count, etc.) for custom analysis instead of pre-computed scores

ALTER TABLE sleep_entries
  DROP COLUMN IF EXISTS sleep_index,
  DROP COLUMN IF EXISTS restfulness;
