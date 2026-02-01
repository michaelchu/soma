-- Add heart rate zone columns to activities table
-- These are optional fields for tracking time spent in each HR zone during an activity

ALTER TABLE activities
  ADD COLUMN zone1_minutes INTEGER CHECK (zone1_minutes IS NULL OR (zone1_minutes >= 0 AND zone1_minutes <= 480)),
  ADD COLUMN zone2_minutes INTEGER CHECK (zone2_minutes IS NULL OR (zone2_minutes >= 0 AND zone2_minutes <= 480)),
  ADD COLUMN zone3_minutes INTEGER CHECK (zone3_minutes IS NULL OR (zone3_minutes >= 0 AND zone3_minutes <= 480)),
  ADD COLUMN zone4_minutes INTEGER CHECK (zone4_minutes IS NULL OR (zone4_minutes >= 0 AND zone4_minutes <= 480)),
  ADD COLUMN zone5_minutes INTEGER CHECK (zone5_minutes IS NULL OR (zone5_minutes >= 0 AND zone5_minutes <= 480));

-- Add comment to document the zones
COMMENT ON COLUMN activities.zone1_minutes IS 'Time in Zone 1 (Warm Up, 100-119 bpm) in minutes';
COMMENT ON COLUMN activities.zone2_minutes IS 'Time in Zone 2 (Easy, 120-139 bpm) in minutes';
COMMENT ON COLUMN activities.zone3_minutes IS 'Time in Zone 3 (Aerobic, 140-159 bpm) in minutes';
COMMENT ON COLUMN activities.zone4_minutes IS 'Time in Zone 4 (Threshold, 160-179 bpm) in minutes';
COMMENT ON COLUMN activities.zone5_minutes IS 'Time in Zone 5 (Maximum, >179 bpm) in minutes';
