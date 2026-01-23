-- Add session_id to group multiple readings taken in one sitting
ALTER TABLE blood_pressure_readings
  ADD COLUMN session_id UUID;

-- Backfill existing readings: each one gets its own session_id (since they're already averages)
UPDATE blood_pressure_readings
SET session_id = id
WHERE session_id IS NULL;

-- Make session_id NOT NULL after backfill
ALTER TABLE blood_pressure_readings
  ALTER COLUMN session_id SET NOT NULL;

-- Create index for grouping by session
CREATE INDEX idx_bp_readings_session ON blood_pressure_readings(session_id);
