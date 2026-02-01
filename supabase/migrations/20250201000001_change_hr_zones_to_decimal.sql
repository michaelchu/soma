-- Change HR zone columns from INTEGER to DECIMAL to support seconds precision
-- This allows storing values like 19.5 (19 minutes 30 seconds)

ALTER TABLE activities
  ALTER COLUMN zone1_minutes TYPE DECIMAL(6,2),
  ALTER COLUMN zone2_minutes TYPE DECIMAL(6,2),
  ALTER COLUMN zone3_minutes TYPE DECIMAL(6,2),
  ALTER COLUMN zone4_minutes TYPE DECIMAL(6,2),
  ALTER COLUMN zone5_minutes TYPE DECIMAL(6,2);

-- Update constraints to use DECIMAL comparison
ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_zone1_minutes_check,
  DROP CONSTRAINT IF EXISTS activities_zone2_minutes_check,
  DROP CONSTRAINT IF EXISTS activities_zone3_minutes_check,
  DROP CONSTRAINT IF EXISTS activities_zone4_minutes_check,
  DROP CONSTRAINT IF EXISTS activities_zone5_minutes_check;

ALTER TABLE activities
  ADD CONSTRAINT activities_zone1_minutes_check CHECK (zone1_minutes IS NULL OR (zone1_minutes >= 0 AND zone1_minutes <= 480)),
  ADD CONSTRAINT activities_zone2_minutes_check CHECK (zone2_minutes IS NULL OR (zone2_minutes >= 0 AND zone2_minutes <= 480)),
  ADD CONSTRAINT activities_zone3_minutes_check CHECK (zone3_minutes IS NULL OR (zone3_minutes >= 0 AND zone3_minutes <= 480)),
  ADD CONSTRAINT activities_zone4_minutes_check CHECK (zone4_minutes IS NULL OR (zone4_minutes >= 0 AND zone4_minutes <= 480)),
  ADD CONSTRAINT activities_zone5_minutes_check CHECK (zone5_minutes IS NULL OR (zone5_minutes >= 0 AND zone5_minutes <= 480));
