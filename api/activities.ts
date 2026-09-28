import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors, getQueryParam } from './_db.js';

/**
 * GET    /api/activities          -> { rows } (newest first)
 * POST   /api/activities          -> { row }
 * PUT    /api/activities?id=...   -> { row }
 * DELETE /api/activities?id=...   -> { ok: true }
 */

const COLUMNS =
  'id, date, time_of_day, activity_type, duration_minutes, intensity, notes, zone1_minutes, zone2_minutes, zone3_minutes, zone4_minutes, zone5_minutes, created_at, updated_at';

const TIME_OF_DAY = new Set(['morning', 'afternoon', 'evening', 'late_evening']);
const ACTIVITY_TYPES = new Set(['walking', 'badminton', 'pickleball', 'other']);

function optNumber(value: unknown): number | null | 'invalid' {
  if (value == null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : 'invalid';
}

function parseBody(body: unknown): { values: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Request body must be JSON' };
  const b = body as Record<string, unknown>;
  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { error: 'Invalid date (expected YYYY-MM-DD)' };
  }
  if (typeof b.timeOfDay !== 'string' || !TIME_OF_DAY.has(b.timeOfDay)) {
    return { error: 'Invalid timeOfDay' };
  }
  if (typeof b.activityType !== 'string' || !ACTIVITY_TYPES.has(b.activityType)) {
    return { error: 'Invalid activityType' };
  }
  const duration = optNumber(b.durationMinutes);
  const intensity = optNumber(b.intensity);
  if (duration === 'invalid' || duration === null) return { error: 'Invalid durationMinutes' };
  if (intensity === 'invalid' || intensity === null) return { error: 'Invalid intensity' };
  const zones: Record<string, unknown> = {};
  for (const key of [
    'zone1Minutes',
    'zone2Minutes',
    'zone3Minutes',
    'zone4Minutes',
    'zone5Minutes',
  ]) {
    const z = optNumber(b[key]);
    if (z === 'invalid') return { error: `Invalid ${key}` };
    zones[key] = z;
  }
  if (b.notes != null && typeof b.notes !== 'string') return { error: 'Invalid notes' };
  return {
    values: {
      date: b.date,
      time_of_day: b.timeOfDay,
      activity_type: b.activityType,
      duration_minutes: duration,
      intensity,
      notes: b.notes ?? null,
      zone1_minutes: zones.zone1Minutes,
      zone2_minutes: zones.zone2Minutes,
      zone3_minutes: zones.zone3Minutes,
      zone4_minutes: zones.zone4Minutes,
      zone5_minutes: zones.zone5Minutes,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'activities', async () => {
    if (req.method === 'GET') {
      const rows = await query(`SELECT ${COLUMNS} FROM activities ORDER BY date DESC`);
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
      const v = parsed.values;
      const rows = await query(
        `INSERT INTO activities (id, date, time_of_day, activity_type, duration_minutes, intensity, notes,
          zone1_minutes, zone2_minutes, zone3_minutes, zone4_minutes, zone5_minutes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING ${COLUMNS}`,
        [
          id,
          v.date,
          v.time_of_day,
          v.activity_type,
          v.duration_minutes,
          v.intensity,
          v.notes,
          v.zone1_minutes,
          v.zone2_minutes,
          v.zone3_minutes,
          v.zone4_minutes,
          v.zone5_minutes,
          now,
          now,
        ]
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
      const v = parsed.values;
      const rows = await query(
        `UPDATE activities SET date=$2, time_of_day=$3, activity_type=$4, duration_minutes=$5, intensity=$6, notes=$7,
          zone1_minutes=$8, zone2_minutes=$9, zone3_minutes=$10, zone4_minutes=$11, zone5_minutes=$12, updated_at=$13
         WHERE id=$1
         RETURNING ${COLUMNS}`,
        [
          id,
          v.date,
          v.time_of_day,
          v.activity_type,
          v.duration_minutes,
          v.intensity,
          v.notes,
          v.zone1_minutes,
          v.zone2_minutes,
          v.zone3_minutes,
          v.zone4_minutes,
          v.zone5_minutes,
          now,
        ]
      );
      if (rows.length === 0) {
        json(res, 404, { error: 'Activity not found' });
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
      await query('DELETE FROM activities WHERE id = $1', [id]);
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  });
}
