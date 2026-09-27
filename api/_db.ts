import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared helpers for the Soma serverless API.
 *
 * The browser frontend never talks to Postgres directly. These functions run as
 * Vercel serverless functions and use the server-side DATABASE_URL (injected by
 * the Neon integration) through Neon's HTTP query driver.
 */

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null = null;

export function getSql(): SqlClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not configured');
    }
    client = neon(url);
  }
  return client;
}

/** Run a parameterized query ($1, $2, ...) and return the rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  return (await getSql().query(text, params)) as T[];
}

// Postgres port of the app's data model. Every statement is idempotent
// (IF NOT EXISTS) so this is safe to run on every cold start. It also
// backfills columns on tables created before a column existed.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS blood_pressure_readings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    recorded_date DATE NOT NULL,
    time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'late_evening')),
    systolic INTEGER NOT NULL CHECK (systolic > 0 AND systolic < 300),
    diastolic INTEGER NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
    pulse INTEGER CHECK (pulse IS NULL OR (pulse > 0 AND pulse < 300)),
    notes TEXT,
    cuff_location TEXT CHECK (cuff_location IS NULL OR cuff_location IN ('left_arm', 'right_arm', 'left_wrist', 'right_wrist')),
    irregular_heartbeat INTEGER DEFAULT 0,
    body_position TEXT CHECK (body_position IS NULL OR body_position IN ('seated', 'standing', 'lying')),
    pulse_pressure INTEGER,
    mean_arterial_pressure DOUBLE PRECISION,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS cuff_location TEXT CHECK (cuff_location IS NULL OR cuff_location IN ('left_arm', 'right_arm', 'left_wrist', 'right_wrist'))`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS irregular_heartbeat INTEGER DEFAULT 0`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS body_position TEXT CHECK (body_position IS NULL OR body_position IN ('seated', 'standing', 'lying'))`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS pulse_pressure INTEGER`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS mean_arterial_pressure DOUBLE PRECISION`,
  `ALTER TABLE blood_pressure_readings ADD COLUMN IF NOT EXISTS category TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_bp_readings_date ON blood_pressure_readings(recorded_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bp_readings_session ON blood_pressure_readings(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bp_readings_category ON blood_pressure_readings(category)`,
  `CREATE TABLE IF NOT EXISTS sleep_entries (
    id TEXT PRIMARY KEY,
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
    skin_temp_avg DOUBLE PRECISION CHECK (skin_temp_avg IS NULL OR (skin_temp_avg >= 20 AND skin_temp_avg <= 45)),
    sleep_cycles_full INTEGER CHECK (sleep_cycles_full IS NULL OR (sleep_cycles_full >= 0 AND sleep_cycles_full <= 20)),
    sleep_cycles_partial INTEGER CHECK (sleep_cycles_partial IS NULL OR (sleep_cycles_partial >= 0 AND sleep_cycles_partial <= 20)),
    movement_count INTEGER CHECK (movement_count IS NULL OR (movement_count >= 0 AND movement_count <= 500)),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sleep_entries_date ON sleep_entries(date DESC)`,
  `CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'late_evening')),
    activity_type TEXT NOT NULL CHECK (activity_type IN ('walking', 'badminton', 'pickleball', 'other')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
    notes TEXT,
    zone1_minutes DOUBLE PRECISION CHECK (zone1_minutes IS NULL OR (zone1_minutes >= 0 AND zone1_minutes <= 480)),
    zone2_minutes DOUBLE PRECISION CHECK (zone2_minutes IS NULL OR (zone2_minutes >= 0 AND zone2_minutes <= 480)),
    zone3_minutes DOUBLE PRECISION CHECK (zone3_minutes IS NULL OR (zone3_minutes >= 0 AND zone3_minutes <= 480)),
    zone4_minutes DOUBLE PRECISION CHECK (zone4_minutes IS NULL OR (zone4_minutes >= 0 AND zone4_minutes <= 480)),
    zone5_minutes DOUBLE PRECISION CHECK (zone5_minutes IS NULL OR (zone5_minutes >= 0 AND zone5_minutes <= 480)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC)`,
  `CREATE TABLE IF NOT EXISTS blood_test_reports (
    id TEXT PRIMARY KEY,
    report_date TEXT NOT NULL,
    order_number TEXT,
    ordered_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blood_test_reports_date ON blood_test_reports(report_date DESC)`,
  `CREATE TABLE IF NOT EXISTS blood_test_metrics (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES blood_test_reports(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    reference_min DOUBLE PRECISION,
    reference_max DOUBLE PRECISION,
    reference_raw TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, metric_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_blood_test_metrics_report ON blood_test_metrics(report_id)`,
];

let schemaPromise: Promise<void> | null = null;

/** Create tables/indexes if missing. Cached per function instance (cold start only). */
export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await query(statement);
      }
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed' });
}

export function badRequest(res: VercelResponse, message: string): void {
  json(res, 400, { error: message });
}

export function getQueryParam(req: VercelRequest, name: string): string | null {
  const value = req.query[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Wrap a handler so unexpected errors become a generic 500 (details go to the
 * function logs, never to the client).
 */
export async function handleErrors(
  res: VercelResponse,
  context: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await ensureSchema();
    await fn();
  } catch (err) {
    console.error(`[api:${context}]`, err instanceof Error ? err.message : err);
    json(res, 500, { error: 'Internal server error' });
  }
}
