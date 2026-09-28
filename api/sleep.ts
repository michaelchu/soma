import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors, getQueryParam } from './_db';

/**
 * GET    /api/sleep          -> { rows } (newest first)
 * POST   /api/sleep          -> { row }
 * PUT    /api/sleep?id=...   -> { row }
 * DELETE /api/sleep?id=...   -> { ok: true }
 */

const COLUMNS =
  'id, date, timezone, total_sleep_minutes, sleep_start, sleep_end, hrv_low, hrv_high, resting_hr, lowest_hr_time, hr_drop_minutes, deep_sleep_pct, rem_sleep_pct, light_sleep_pct, awake_pct, skin_temp_avg, sleep_cycles_full, sleep_cycles_partial, movement_count, notes, created_at, updated_at';

function optNumber(value: unknown): number | null | 'invalid' {
  if (value == null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : 'invalid';
}

function optString(value: unknown): string | null | 'invalid' {
  if (value == null) return null;
  return typeof value === 'string' ? value : 'invalid';
}

function parseBody(body: unknown): { values: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Request body must be JSON' };
  const b = body as Record<string, unknown>;
  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { error: 'Invalid date (expected YYYY-MM-DD)' };
  }
  const values: Record<string, unknown> = { date: b.date };
  const stringFields = ['timezone', 'sleepStart', 'sleepEnd', 'lowestHrTime', 'notes'] as const;
  const numberFields = [
    'totalSleepMinutes',
    'hrvLow',
    'hrvHigh',
    'restingHr',
    'hrDropMinutes',
    'deepSleepPct',
    'remSleepPct',
    'lightSleepPct',
    'awakePct',
    'skinTempAvg',
    'sleepCyclesFull',
    'sleepCyclesPartial',
    'movementCount',
  ] as const;
  for (const key of stringFields) {
    const v = optString(b[key]);
    if (v === 'invalid') return { error: `Invalid ${key}` };
    values[key] = v;
  }
  for (const key of numberFields) {
    const v = optNumber(b[key]);
    if (v === 'invalid') return { error: `Invalid ${key}` };
    values[key] = v;
  }
  return { values };
}

const DB_COLUMNS = [
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
];

const BODY_KEYS = [
  'date',
  'timezone',
  'totalSleepMinutes',
  'sleepStart',
  'sleepEnd',
  'hrvLow',
  'hrvHigh',
  'restingHr',
  'lowestHrTime',
  'hrDropMinutes',
  'deepSleepPct',
  'remSleepPct',
  'lightSleepPct',
  'awakePct',
  'skinTempAvg',
  'sleepCyclesFull',
  'sleepCyclesPartial',
  'movementCount',
  'notes',
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'sleep', async () => {
    if (req.method === 'GET') {
      const rows = await query(`SELECT ${COLUMNS} FROM sleep_entries ORDER BY date DESC`);
      json(res, 200, { rows });
      return;
    }

    if (req.method === 'POST') {
      const parsed = parseBody(req.body);
      if ('error' in parsed) {
        badRequest(res, parsed.error);
        return;
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      const params = [id, ...BODY_KEYS.map((k) => parsed.values[k]), now, now];
      const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
      const rows = await query(
        `INSERT INTO sleep_entries (id, ${DB_COLUMNS.join(', ')}, created_at, updated_at)
         VALUES (${placeholders})
         RETURNING ${COLUMNS}`,
        params
      );
      json(res, 201, { row: rows[0] });
      return;
    }

    if (req.method === 'PUT') {
      const id = getQueryParam(req, 'id');
      if (!id) {
        badRequest(res, 'Missing id query parameter');
        return;
      }
      const parsed = parseBody(req.body);
      if ('error' in parsed) {
        badRequest(res, parsed.error);
        return;
      }
      const now = new Date().toISOString();
      const setClauses = DB_COLUMNS.map((col, i) => `${col}=$${i + 2}`).join(', ');
      const params = [id, ...BODY_KEYS.map((k) => parsed.values[k]), now];
      const rows = await query(
        `UPDATE sleep_entries SET ${setClauses}, updated_at=$${params.length}
         WHERE id=$1
         RETURNING ${COLUMNS}`,
        params
      );
      if (rows.length === 0) {
        json(res, 404, { error: 'Sleep entry not found' });
        return;
      }
      json(res, 200, { row: rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const id = getQueryParam(req, 'id');
      if (!id) {
        badRequest(res, 'Missing id query parameter');
        return;
      }
      await query('DELETE FROM sleep_entries WHERE id = $1', [id]);
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  });
}
