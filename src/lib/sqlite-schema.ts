/**
 * SQLite schema for local-first storage.
 * Translated from Supabase PostgreSQL migrations.
 * No user_id columns (single-user local app).
 * No RLS policies (SQLite doesn't support them).
 */

export const SCHEMA_VERSION = 2;

export const SCHEMA_SQL = `
-- Schema versioning
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Blood Pressure Readings
CREATE TABLE IF NOT EXISTS blood_pressure_readings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  recorded_date TEXT NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening')),
  systolic INTEGER NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic INTEGER NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  pulse INTEGER CHECK (pulse > 0 AND pulse < 300),
  notes TEXT,
  cuff_location TEXT CHECK (cuff_location IN ('left_arm', 'right_arm', 'left_wrist', 'right_wrist')),
  irregular_heartbeat INTEGER DEFAULT 0,
  body_position TEXT CHECK (body_position IN ('seated', 'standing', 'lying')),
  pulse_pressure INTEGER,
  mean_arterial_pressure REAL,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bp_readings_date ON blood_pressure_readings(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_bp_readings_session ON blood_pressure_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_bp_readings_category ON blood_pressure_readings(category);

-- Sleep Entries
CREATE TABLE IF NOT EXISTS sleep_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL UNIQUE,
  timezone TEXT,
  total_sleep_minutes INTEGER,
  sleep_start TEXT,
  sleep_end TEXT,
  hrv_low INTEGER CHECK (hrv_low IS NULL OR (hrv_low > 0 AND hrv_low < 500)),
  hrv_high INTEGER CHECK (hrv_high IS NULL OR (hrv_high > 0 AND hrv_high < 500)),
  resting_hr INTEGER CHECK (resting_hr IS NULL OR (resting_hr > 20 AND resting_hr < 200)),
  lowest_hr_time TEXT,
  hr_drop_minutes INTEGER CHECK (hr_drop_minutes IS NULL OR (hr_drop_minutes >= 0 AND hr_drop_minutes <= 1440)),
  deep_sleep_pct INTEGER CHECK (deep_sleep_pct IS NULL OR (deep_sleep_pct >= 0 AND deep_sleep_pct <= 100)),
  rem_sleep_pct INTEGER CHECK (rem_sleep_pct IS NULL OR (rem_sleep_pct >= 0 AND rem_sleep_pct <= 100)),
  light_sleep_pct INTEGER CHECK (light_sleep_pct IS NULL OR (light_sleep_pct >= 0 AND light_sleep_pct <= 100)),
  awake_pct INTEGER CHECK (awake_pct IS NULL OR (awake_pct >= 0 AND awake_pct <= 100)),
  skin_temp_avg REAL CHECK (skin_temp_avg IS NULL OR (skin_temp_avg >= 20 AND skin_temp_avg <= 45)),
  sleep_cycles_full INTEGER CHECK (sleep_cycles_full IS NULL OR (sleep_cycles_full >= 0 AND sleep_cycles_full <= 20)),
  sleep_cycles_partial INTEGER CHECK (sleep_cycles_partial IS NULL OR (sleep_cycles_partial >= 0 AND sleep_cycles_partial <= 20)),
  movement_count INTEGER CHECK (movement_count IS NULL OR (movement_count >= 0 AND movement_count <= 500)),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sleep_entries_date ON sleep_entries(date DESC);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'late_evening')),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('walking', 'badminton', 'pickleball', 'other')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  notes TEXT,
  zone1_minutes REAL CHECK (zone1_minutes IS NULL OR (zone1_minutes >= 0 AND zone1_minutes <= 480)),
  zone2_minutes REAL CHECK (zone2_minutes IS NULL OR (zone2_minutes >= 0 AND zone2_minutes <= 480)),
  zone3_minutes REAL CHECK (zone3_minutes IS NULL OR (zone3_minutes >= 0 AND zone3_minutes <= 480)),
  zone4_minutes REAL CHECK (zone4_minutes IS NULL OR (zone4_minutes >= 0 AND zone4_minutes <= 480)),
  zone5_minutes REAL CHECK (zone5_minutes IS NULL OR (zone5_minutes >= 0 AND zone5_minutes <= 480)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC);

-- Blood Test Reports
CREATE TABLE IF NOT EXISTS blood_test_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  report_date TEXT NOT NULL,
  order_number TEXT,
  ordered_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blood_test_reports_date ON blood_test_reports(report_date DESC);

-- Blood Test Metrics
CREATE TABLE IF NOT EXISTS blood_test_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  report_id TEXT NOT NULL REFERENCES blood_test_reports(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL,
  reference_max REAL,
  reference_raw TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(report_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_blood_test_metrics_report ON blood_test_metrics(report_id);

-- Set schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
`;

/**
 * Migrations to run when upgrading from an older schema version.
 * Each entry is [targetVersion, sql].
 */
export const MIGRATIONS: [number, string][] = [
  [
    2,
    `
    ALTER TABLE blood_pressure_readings ADD COLUMN irregular_heartbeat INTEGER DEFAULT 0;
    ALTER TABLE blood_pressure_readings ADD COLUMN body_position TEXT;
    ALTER TABLE blood_pressure_readings ADD COLUMN pulse_pressure INTEGER;
    ALTER TABLE blood_pressure_readings ADD COLUMN mean_arterial_pressure REAL;
    ALTER TABLE blood_pressure_readings ADD COLUMN category TEXT;
    CREATE INDEX IF NOT EXISTS idx_bp_readings_category ON blood_pressure_readings(category);
    INSERT OR REPLACE INTO schema_version (version) VALUES (2);
    `,
  ],
];
