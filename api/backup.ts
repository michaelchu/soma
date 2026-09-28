import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors } from './_db.js';

/**
 * GET  /api/backup -> { schemaVersion, tables } (full database export)
 * POST /api/backup -> { ok: true } (replace all tables from a backup, atomically)
 *
 * Powers the Google Drive backup/restore flow. The export shape matches the
 * DatabaseBackup contract the client has always used.
 */

export const SCHEMA_VERSION = 2;

const TABLE_COLUMNS: Record<string, string[]> = {
  blood_pressure_readings: [
    'id',
    'session_id',
    'recorded_date',
    'time_of_day',
    'systolic',
    'diastolic',
    'pulse',
    'notes',
    'cuff_location',
    'irregular_heartbeat',
    'body_position',
    'pulse_pressure',
    'mean_arterial_pressure',
    'category',
    'created_at',
    'updated_at',
  ],
  sleep_entries: [
    'id',
    'date',
    'timezone',
    'total_sleep_minutes',
    'sleep_start',
    'sleep_end',
    'hrv_low',
    'hrv_high',
    'resting_hr',
    'lowest_hr_time',
    'hr_drop_minutes',
    'deep_sleep_pct',
    'rem_sleep_pct',
    'light_sleep_pct',
    'awake_pct',
    'skin_temp_avg',
    'sleep_cycles_full',
    'sleep_cycles_partial',
    'movement_count',
    'notes',
    'created_at',
    'updated_at',
  ],
  activities: [
    'id',
    'date',
    'time_of_day',
    'activity_type',
    'duration_minutes',
    'intensity',
    'notes',
    'zone1_minutes',
    'zone2_minutes',
    'zone3_minutes',
    'zone4_minutes',
    'zone5_minutes',
    'created_at',
    'updated_at',
  ],
  blood_test_reports: [
    'id',
    'report_date',
    'order_number',
    'ordered_by',
    'notes',
    'created_at',
    'updated_at',
  ],
  blood_test_metrics: [
    'id',
    'report_id',
    'metric_key',
    'value',
    'unit',
    'reference_min',
    'reference_max',
    'reference_raw',
    'created_at',
  ],
};

function buildInsertCte(
  cteName: string,
  table: string,
  rows: Record<string, unknown>[],
  params: unknown[]
): string | null {
  if (rows.length === 0) return null;
  const columns = TABLE_COLUMNS[table];
  const valueLists = rows.map((row) => {
    const placeholders = columns.map((col) => {
      params.push(row[col] ?? null);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  return `${cteName} AS (INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueLists.join(', ')})`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'backup', async () => {
    if (req.method === 'GET') {
      const tables: Record<string, Record<string, unknown>[]> = {};
      for (const table of Object.keys(TABLE_COLUMNS)) {
        tables[table] = await query(`SELECT * FROM ${table}`);
      }
      json(res, 200, { schemaVersion: SCHEMA_VERSION, tables });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body as { schemaVersion?: unknown; tables?: unknown } | undefined;
      if (!body || typeof body !== 'object') {
        badRequest(res, 'Request body must be JSON');
        return;
      }
      if (
        typeof body.schemaVersion !== 'number' ||
        body.schemaVersion < 1 ||
        body.schemaVersion > SCHEMA_VERSION
      ) {
        badRequest(res, `Unsupported backup schema version: ${String(body.schemaVersion)}`);
        return;
      }
      if (!body.tables || typeof body.tables !== 'object' || Array.isArray(body.tables)) {
        badRequest(res, 'Backup must include a tables object');
        return;
      }
      const tables = body.tables as Record<string, unknown>;
      const rowsByTable: Record<string, Record<string, unknown>[]> = {};
      for (const table of Object.keys(TABLE_COLUMNS)) {
        const rows = tables[table] ?? [];
        if (!Array.isArray(rows)) {
          badRequest(res, `Invalid rows for table "${table}"`);
          return;
        }
        rowsByTable[table] = rows as Record<string, unknown>[];
      }

      // One statement (CTE chain) so the restore is all-or-nothing.
      // Deletes run metrics-first to respect the report -> metric foreign key.
      const params: unknown[] = [];
      const ctes = [
        'del_metrics AS (DELETE FROM blood_test_metrics)',
        'del_reports AS (DELETE FROM blood_test_reports)',
        'del_sleep AS (DELETE FROM sleep_entries)',
        'del_activities AS (DELETE FROM activities)',
        'del_bp AS (DELETE FROM blood_pressure_readings)',
      ];
      const inserts: [string, string][] = [
        ['ins_bp', 'blood_pressure_readings'],
        ['ins_sleep', 'sleep_entries'],
        ['ins_activities', 'activities'],
        ['ins_reports', 'blood_test_reports'],
        ['ins_metrics', 'blood_test_metrics'],
      ];
      for (const [cteName, table] of inserts) {
        const cte = buildInsertCte(cteName, table, rowsByTable[table], params);
        if (cte) ctes.push(cte);
      }
      await query(`WITH ${ctes.join(',\n')} SELECT 1`, params);
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST']);
  });
}
