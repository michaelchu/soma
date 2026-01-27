-- Add additional sleep metrics from Ultrahuman
-- sleep_index: Ultrahuman's overall sleep score (1-100)
-- skin_temp_avg: Average skin temperature during sleep (Celsius)
-- restfulness: Restfulness score (1-100)
-- sleep_cycles_full: Number of complete sleep cycles
-- sleep_cycles_partial: Number of partial/incomplete sleep cycles
-- movement_count: Number of tosses/turns during sleep

ALTER TABLE sleep_entries
  ADD COLUMN IF NOT EXISTS sleep_index INTEGER CHECK (sleep_index >= 0 AND sleep_index <= 100),
  ADD COLUMN IF NOT EXISTS skin_temp_avg DECIMAL(4,2) CHECK (skin_temp_avg >= 20 AND skin_temp_avg <= 45),
  ADD COLUMN IF NOT EXISTS restfulness INTEGER CHECK (restfulness >= 0 AND restfulness <= 100),
  ADD COLUMN IF NOT EXISTS sleep_cycles_full INTEGER CHECK (sleep_cycles_full >= 0 AND sleep_cycles_full <= 20),
  ADD COLUMN IF NOT EXISTS sleep_cycles_partial INTEGER CHECK (sleep_cycles_partial >= 0 AND sleep_cycles_partial <= 20),
  ADD COLUMN IF NOT EXISTS movement_count INTEGER CHECK (movement_count >= 0 AND movement_count <= 500);
