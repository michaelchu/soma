-- Relax hr_drop_minutes constraint to allow values up to full sleep duration
-- The previous 180 minute limit was too restrictive

ALTER TABLE sleep_entries
  DROP CONSTRAINT IF EXISTS sleep_entries_hr_drop_minutes_check;

ALTER TABLE sleep_entries
  ADD CONSTRAINT sleep_entries_hr_drop_minutes_check
  CHECK (hr_drop_minutes >= 0 AND hr_drop_minutes <= 1440);
