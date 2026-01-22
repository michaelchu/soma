-- Add extra fields to blood_pressure_readings table
ALTER TABLE blood_pressure_readings
  ADD COLUMN irregular_heartbeat BOOLEAN DEFAULT FALSE,
  ADD COLUMN cuff_location TEXT CHECK (cuff_location IN ('left_arm', 'right_arm', 'left_wrist', 'right_wrist')),
  ADD COLUMN body_position TEXT CHECK (body_position IN ('seated', 'standing', 'lying')),
  ADD COLUMN pulse_pressure INTEGER,
  ADD COLUMN mean_arterial_pressure DECIMAL(5,2),
  ADD COLUMN category TEXT;

-- Create index on category for filtering
CREATE INDEX idx_bp_readings_category ON blood_pressure_readings(category);
