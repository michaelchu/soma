-- Blood Pressure Readings Table
CREATE TABLE blood_pressure_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  systolic INTEGER NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic INTEGER NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  pulse INTEGER CHECK (pulse > 0 AND pulse < 300),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood Test Reports Table (metadata)
CREATE TABLE blood_test_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  order_number TEXT,
  ordered_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blood Test Metrics Table (individual test results)
CREATE TABLE blood_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES blood_test_reports(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,           -- e.g., 'hemoglobin', 'wbc', 'glucose'
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,                 -- e.g., 'g/L', 'x10^9/L', 'mmol/L'
  reference_min DECIMAL,
  reference_max DECIMAL,
  reference_raw TEXT,                 -- Original reference string e.g., '129-165'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(report_id, metric_key)
);

-- Indexes for performance
CREATE INDEX idx_bp_readings_user_recorded ON blood_pressure_readings(user_id, recorded_at DESC);
CREATE INDEX idx_bp_readings_recorded ON blood_pressure_readings(recorded_at DESC);
CREATE INDEX idx_blood_test_reports_user_date ON blood_test_reports(user_id, report_date DESC);
CREATE INDEX idx_blood_test_metrics_report ON blood_test_metrics(report_id);
CREATE INDEX idx_blood_test_metrics_key ON blood_test_metrics(metric_key);

-- Enable Row Level Security
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_test_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own blood pressure readings"
  ON blood_pressure_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blood pressure readings"
  ON blood_pressure_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blood pressure readings"
  ON blood_pressure_readings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blood pressure readings"
  ON blood_pressure_readings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own blood test reports"
  ON blood_test_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blood test reports"
  ON blood_test_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blood test reports"
  ON blood_test_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blood test reports"
  ON blood_test_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Metrics inherit access from their parent report via join
CREATE POLICY "Users can view metrics for own reports"
  ON blood_test_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blood_test_reports
      WHERE blood_test_reports.id = blood_test_metrics.report_id
      AND blood_test_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for own reports"
  ON blood_test_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blood_test_reports
      WHERE blood_test_reports.id = blood_test_metrics.report_id
      AND blood_test_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for own reports"
  ON blood_test_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM blood_test_reports
      WHERE blood_test_reports.id = blood_test_metrics.report_id
      AND blood_test_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete metrics for own reports"
  ON blood_test_metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM blood_test_reports
      WHERE blood_test_reports.id = blood_test_metrics.report_id
      AND blood_test_reports.user_id = auth.uid()
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_blood_pressure_readings_updated_at
  BEFORE UPDATE ON blood_pressure_readings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_test_reports_updated_at
  BEFORE UPDATE ON blood_test_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
