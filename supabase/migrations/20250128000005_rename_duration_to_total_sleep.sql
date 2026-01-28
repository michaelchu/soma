-- Rename duration_minutes to total_sleep_minutes
-- This column now stores actual sleep time (externally calculated)
-- rather than time in bed (which is calculated from sleep_start/sleep_end)

ALTER TABLE sleep_entries RENAME COLUMN duration_minutes TO total_sleep_minutes;
