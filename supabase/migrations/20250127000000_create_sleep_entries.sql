-- Sleep Entries Table
CREATE TABLE sleep_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Duration in minutes
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  -- HRV range (ms)
  hrv_low INTEGER CHECK (hrv_low > 0 AND hrv_low < 500),
  hrv_high INTEGER CHECK (hrv_high > 0 AND hrv_high < 500),
  -- Heart rate metrics
  resting_hr INTEGER CHECK (resting_hr > 20 AND resting_hr < 200),
  lowest_hr_time TIME,
  hr_drop_minutes INTEGER CHECK (hr_drop_minutes >= 0 AND hr_drop_minutes <= 180),
  -- Sleep stages (percentages)
  deep_sleep_pct INTEGER CHECK (deep_sleep_pct >= 0 AND deep_sleep_pct <= 100),
  rem_sleep_pct INTEGER CHECK (rem_sleep_pct >= 0 AND rem_sleep_pct <= 100),
  -- Optional notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One entry per date per user
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_sleep_entries_user_date ON sleep_entries(user_id, date DESC);
CREATE INDEX idx_sleep_entries_date ON sleep_entries(date DESC);

-- Enable Row Level Security
ALTER TABLE sleep_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own sleep entries"
  ON sleep_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep entries"
  ON sleep_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep entries"
  ON sleep_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep entries"
  ON sleep_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Apply updated_at trigger
CREATE TRIGGER update_sleep_entries_updated_at
  BEFORE UPDATE ON sleep_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
