-- Add timezone support for sleep entries
-- Stores IANA timezone identifier (e.g., 'America/New_York', 'Asia/Tokyo')

ALTER TABLE sleep_entries
  ADD COLUMN timezone TEXT;

-- Backfill existing entries with EST (America/New_York) as the default
UPDATE sleep_entries
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN sleep_entries.timezone IS 'IANA timezone identifier where the sleep was recorded (e.g., America/New_York)';
