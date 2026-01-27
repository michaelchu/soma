-- Add sleep start/end times to replace manual duration entry
ALTER TABLE sleep_entries
  ADD COLUMN sleep_start TIME,
  ADD COLUMN sleep_end TIME;

-- Add light sleep and awake percentages for complete sleep stage tracking
ALTER TABLE sleep_entries
  ADD COLUMN light_sleep_pct INTEGER CHECK (light_sleep_pct >= 0 AND light_sleep_pct <= 100),
  ADD COLUMN awake_pct INTEGER CHECK (awake_pct >= 0 AND awake_pct <= 100);

-- Make duration_minutes nullable since it can now be calculated from start/end times
-- First drop the NOT NULL constraint
ALTER TABLE sleep_entries
  ALTER COLUMN duration_minutes DROP NOT NULL;

-- Add a check constraint to ensure we have either duration_minutes OR both sleep_start and sleep_end
ALTER TABLE sleep_entries
  ADD CONSTRAINT sleep_duration_check
  CHECK (duration_minutes IS NOT NULL OR (sleep_start IS NOT NULL AND sleep_end IS NOT NULL));
