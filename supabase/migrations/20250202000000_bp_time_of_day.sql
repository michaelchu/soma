-- Migration: Replace recorded_at timestamp with recorded_date + time_of_day
-- This allows BP entries to be categorized by time period rather than exact time

-- Step 1: Add new columns
ALTER TABLE blood_pressure_readings
ADD COLUMN recorded_date DATE,
ADD COLUMN time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'evening'));

-- Step 2: Populate new columns from existing recorded_at data
-- Morning: 6am-12pm (hours 6-11)
-- Afternoon: 12pm-6pm (hours 12-17)
-- Evening: 6pm-12am (hours 18-23) and 12am-6am (hours 0-5)
UPDATE blood_pressure_readings
SET
  recorded_date = DATE(recorded_at AT TIME ZONE 'UTC'),
  time_of_day = CASE
    WHEN EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') >= 6 AND EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') < 12 THEN 'morning'
    WHEN EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') >= 12 AND EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') < 18 THEN 'afternoon'
    ELSE 'evening'
  END;

-- Step 3: Make new columns NOT NULL now that they're populated
ALTER TABLE blood_pressure_readings
ALTER COLUMN recorded_date SET NOT NULL,
ALTER COLUMN time_of_day SET NOT NULL;

-- Step 4: Drop old column and indexes that reference it
DROP INDEX IF EXISTS idx_bp_readings_user_recorded;
DROP INDEX IF EXISTS idx_bp_readings_recorded;
ALTER TABLE blood_pressure_readings DROP COLUMN recorded_at;

-- Step 5: Create new indexes for the new columns
CREATE INDEX idx_bp_readings_user_date ON blood_pressure_readings(user_id, recorded_date DESC);
CREATE INDEX idx_bp_readings_date ON blood_pressure_readings(recorded_date DESC);
CREATE INDEX idx_bp_readings_time_of_day ON blood_pressure_readings(time_of_day);
