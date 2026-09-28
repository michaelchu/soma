import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, json, badRequest, methodNotAllowed, handleErrors, getQueryParam } from './_db';

/**
 * GET    /api/blood-pressure                  -> { rows } (all readings, newest first)
 * POST   /api/blood-pressure                  -> { sessionId, rows } (create a session)
 * PUT    /api/blood-pressure?sessionId=...    -> { sessionId, rows } (replace a session)
 * DELETE /api/blood-pressure?sessionId=...    -> { ok: true }
 */

const COLUMNS =
  'id, session_id, recorded_date, time_of_day, systolic, diastolic, pulse, notes, cuff_location, created_at, updated_at';

const TIME_OF_DAY = new Set(['morning', 'afternoon', 'evening', 'late_evening']);

interface ReadingInput {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: 'L' | 'R' | null;
}

function armToCuff(arm: unknown): string | null {
  if (arm === 'L') return 'left_arm';
  if (arm === 'R') return 'right_arm';
  return null;
}

function parseReading(value: unknown): ReadingInput | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (typeof r.systolic !== 'number' || !Number.isFinite(r.systolic)) return null;
  if (typeof r.diastolic !== 'number' || !Number.isFinite(r.diastolic)) return null;
  const pulse = r.pulse == null ? null : r.pulse;
  if (pulse !== null && (typeof pulse !== 'number' || !Number.isFinite(pulse))) return null;
  const arm = r.arm === 'L' || r.arm === 'R' ? r.arm : null;
  return { systolic: r.systolic, diastolic: r.diastolic, pulse, arm };
}

function parseSessionBody(
  body: unknown
):
  | { date: string; timeOfDay: string; readings: ReadingInput[]; notes: string | null }
  | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Request body must be JSON' };
  const b = body as Record<string, unknown>;
  const session = b.session as Record<string, unknown> | undefined;
  if (!session || typeof session !== 'object') return { error: 'Missing session' };
  if (typeof session.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    return { error: 'Invalid date (expected YYYY-MM-DD)' };
  }
  if (typeof session.timeOfDay !== 'string' || !TIME_OF_DAY.has(session.timeOfDay)) {
    return { error: 'Invalid timeOfDay' };
  }
  if (!Array.isArray(session.readings) || session.readings.length === 0) {
    return { error: 'Session must include at least one reading' };
  }
  const readings: ReadingInput[] = [];
  for (const raw of session.readings) {
    const reading = parseReading(raw);
    if (!reading) return { error: 'Invalid reading (systolic/diastolic must be numbers)' };
    readings.push(reading);
  }
  const notes = b.notes == null ? null : b.notes;
  if (notes !== null && typeof notes !== 'string') return { error: 'Invalid notes' };
  return { date: session.date, timeOfDay: session.timeOfDay, readings, notes };
}

const INSERT_COLUMNS = [
  'id',
  'session_id',
  'recorded_date',
  'time_of_day',
  'systolic',
  'diastolic',
  'pulse',
  'notes',
  'cuff_location',
  'created_at',
  'updated_at',
];

/** Build the VALUES list + params for a multi-row insert. Returns rows via RETURNING. */
async function insertSessionRows(
  sessionId: string,
  date: string,
  timeOfDay: string,
  readings: ReadingInput[],
  notes: string | null,
  deleteFirst: boolean
): Promise<Record<string, unknown>[]> {
  const now = new Date().toISOString();
  const params: unknown[] = [];
  const offset = deleteFirst ? 1 : 0;
  if (deleteFirst) params.push(sessionId);
  const valueLists = readings.map((reading, i) => {
    const base = offset + i * INSERT_COLUMNS.length;
    params.push(
      randomUUID(),
      sessionId,
      date,
      timeOfDay,
      reading.systolic,
      reading.diastolic,
      reading.pulse,
      i === 0 ? notes : null,
      armToCuff(reading.arm),
      now,
      now
    );
    return `(${INSERT_COLUMNS.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  });
  // Single statement (CTE when replacing) so the write is atomic.
  const statement = deleteFirst
    ? `WITH deleted AS (DELETE FROM blood_pressure_readings WHERE session_id = $1)
       INSERT INTO blood_pressure_readings (${INSERT_COLUMNS.join(', ')})
       VALUES ${valueLists.join(', ')}
       RETURNING ${COLUMNS}`
    : `INSERT INTO blood_pressure_readings (${INSERT_COLUMNS.join(', ')})
       VALUES ${valueLists.join(', ')}
       RETURNING ${COLUMNS}`;
  return query(statement, params);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleErrors(res, 'blood-pressure', async () => {
    if (req.method === 'GET') {
      const rows = await query(
        `SELECT ${COLUMNS} FROM blood_pressure_readings ORDER BY recorded_date DESC`
      );
      json(res, 200, { rows });
      return;
    }

    if (req.method === 'POST') {
      const parsed = parseSessionBody(req.body);
      if ('error' in parsed) {
        badRequest(res, parsed.error);
        return;
      }
      const sessionId = randomUUID();
      const rows = await insertSessionRows(
        sessionId,
        parsed.date,
        parsed.timeOfDay,
        parsed.readings,
        parsed.notes,
        false
      );
      json(res, 201, { sessionId, rows });
      return;
    }

    if (req.method === 'PUT') {
      const sessionId = getQueryParam(req, 'sessionId');
      if (!sessionId) {
        badRequest(res, 'Missing sessionId query parameter');
        return;
      }
      const parsed = parseSessionBody(req.body);
      if ('error' in parsed) {
        badRequest(res, parsed.error);
        return;
      }
      const rows = await insertSessionRows(
        sessionId,
        parsed.date,
        parsed.timeOfDay,
        parsed.readings,
        parsed.notes,
        true
      );
      json(res, 200, { sessionId, rows });
      return;
    }

    if (req.method === 'DELETE') {
      const sessionId = getQueryParam(req, 'sessionId');
      if (!sessionId) {
        badRequest(res, 'Missing sessionId query parameter');
        return;
      }
      await query('DELETE FROM blood_pressure_readings WHERE session_id = $1', [sessionId]);
      json(res, 200, { ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
  });
}
