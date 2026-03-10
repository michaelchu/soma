import { querySQL, execSQL } from '../sqlite';
import { validateBPSession, sanitizeString } from '../validation';
import { logError } from '../logger';
import type { Arm, BPReading, BPSession, BPSessionInput, BPTimeOfDay } from '@/types/bloodPressure';

/**
 * Blood Pressure data service
 * CRUD operations for blood pressure readings (local SQLite)
 */

type CuffLocation = 'left_arm' | 'left_wrist' | 'right_arm' | 'right_wrist' | null;

interface BPReadingRow {
  id: string;
  session_id: string;
  recorded_date: string;
  time_of_day: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  cuff_location: CuffLocation;
  created_at?: string;
  updated_at?: string;
}

export type { BPReading, BPSession, BPSessionInput };

const armToCuff = (arm: Arm): CuffLocation => {
  if (arm === 'L') return 'left_arm';
  if (arm === 'R') return 'right_arm';
  return null;
};

const cuffToArm = (cuff: CuffLocation): Arm => {
  if (cuff === 'left_arm' || cuff === 'left_wrist') return 'L';
  if (cuff === 'right_arm' || cuff === 'right_wrist') return 'R';
  return null;
};

function calculateSessionAverages(readings: BPReading[]): {
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number | null;
} {
  const avgSystolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
  );
  const avgDiastolic = Math.round(
    readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
  );

  const readingsWithPulse = readings.filter((r) => r.pulse);
  const avgPulse =
    readingsWithPulse.length > 0
      ? Math.round(
          readingsWithPulse.reduce((sum, r) => sum + (r.pulse || 0), 0) / readingsWithPulse.length
        )
      : null;

  return { avgSystolic, avgDiastolic, avgPulse };
}

/**
 * Get all blood pressure readings, grouped by session
 */
export async function getReadings(): Promise<{ data: BPSession[] | null; error: Error | null }> {
  try {
    const data = await querySQL<BPReadingRow>(
      'SELECT * FROM blood_pressure_readings ORDER BY recorded_date DESC'
    );

    const sessionMap = new Map<string, BPReading[]>();
    for (const row of data) {
      const sessionId = row.session_id;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }
      sessionMap.get(sessionId)!.push({
        id: row.id,
        date: row.recorded_date,
        timeOfDay: row.time_of_day,
        systolic: row.systolic,
        diastolic: row.diastolic,
        pulse: row.pulse,
        notes: row.notes,
        arm: cuffToArm(row.cuff_location),
        sessionId: row.session_id,
      });
    }

    const sessions: BPSession[] = [];
    for (const [sessionId, readings] of sessionMap) {
      readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const { avgSystolic, avgDiastolic, avgPulse } = calculateSessionAverages(readings);
      const sessionDate = readings[0].date;
      const sessionTimeOfDay = readings[0].timeOfDay;
      const notes = readings
        .map((r) => r.notes)
        .filter(Boolean)
        .join('\n');

      sessions.push({
        sessionId,
        date: sessionDate,
        timeOfDay: sessionTimeOfDay,
        systolic: avgSystolic,
        diastolic: avgDiastolic,
        pulse: avgPulse,
        notes: notes || null,
        readings,
        readingCount: readings.length,
      });
    }

    sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { data: sessions, error: null };
  } catch (err) {
    logError('bloodPressure.getReadings', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Add a session of blood pressure readings
 */
export async function addSession(
  session: BPSessionInput
): Promise<{ data: BPSession | null; error: Error | null }> {
  const validation = validateBPSession(session);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  try {
    const sessionId = crypto.randomUUID();
    const sanitizedNotes = session.notes ? sanitizeString(session.notes) : null;
    const now = new Date().toISOString();

    for (let i = 0; i < session.readings.length; i++) {
      const reading = session.readings[i];
      const id = crypto.randomUUID();
      await execSQL(
        `INSERT INTO blood_pressure_readings
          (id, session_id, recorded_date, time_of_day, systolic, diastolic, pulse, notes, cuff_location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sessionId,
          session.date,
          session.timeOfDay,
          reading.systolic,
          reading.diastolic,
          reading.pulse || null,
          i === 0 ? sanitizedNotes : null,
          armToCuff(reading.arm || null),
          now,
          now,
        ]
      );
    }

    const rows = await querySQL<BPReadingRow>(
      'SELECT * FROM blood_pressure_readings WHERE session_id = ?',
      [sessionId]
    );

    const readings: BPReading[] = rows.map((row) => ({
      id: row.id,
      date: row.recorded_date,
      timeOfDay: row.time_of_day,
      systolic: row.systolic,
      diastolic: row.diastolic,
      pulse: row.pulse,
      notes: row.notes,
      arm: cuffToArm(row.cuff_location),
      sessionId: row.session_id,
    }));

    const { avgSystolic, avgDiastolic, avgPulse } = calculateSessionAverages(readings);

    return {
      data: {
        sessionId,
        date: session.date,
        timeOfDay: session.timeOfDay,
        systolic: avgSystolic,
        diastolic: avgDiastolic,
        pulse: avgPulse,
        notes: sanitizedNotes,
        readings,
        readingCount: readings.length,
      },
      error: null,
    };
  } catch (err) {
    logError('bloodPressure.addSession', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a session of blood pressure readings
 * Replaces all readings in the session with new ones
 */
export async function updateSession(
  sessionId: string,
  session: BPSessionInput
): Promise<{ data: BPSession | null; error: Error | null }> {
  const validation = validateBPSession(session);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  try {
    const sanitizedNotes = session.notes ? sanitizeString(session.notes) : null;
    const now = new Date().toISOString();

    // Delete existing readings
    await execSQL('DELETE FROM blood_pressure_readings WHERE session_id = ?', [sessionId]);

    // Insert new readings
    for (let i = 0; i < session.readings.length; i++) {
      const reading = session.readings[i];
      const id = crypto.randomUUID();
      await execSQL(
        `INSERT INTO blood_pressure_readings
          (id, session_id, recorded_date, time_of_day, systolic, diastolic, pulse, notes, cuff_location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sessionId,
          session.date,
          session.timeOfDay,
          reading.systolic,
          reading.diastolic,
          reading.pulse || null,
          i === 0 ? sanitizedNotes : null,
          armToCuff(reading.arm || null),
          now,
          now,
        ]
      );
    }

    const rows = await querySQL<BPReadingRow>(
      'SELECT * FROM blood_pressure_readings WHERE session_id = ?',
      [sessionId]
    );

    const readings: BPReading[] = rows.map((row) => ({
      id: row.id,
      date: row.recorded_date,
      timeOfDay: row.time_of_day,
      systolic: row.systolic,
      diastolic: row.diastolic,
      pulse: row.pulse,
      notes: row.notes,
      arm: cuffToArm(row.cuff_location),
      sessionId: row.session_id,
    }));

    const { avgSystolic, avgDiastolic, avgPulse } = calculateSessionAverages(readings);

    return {
      data: {
        sessionId,
        date: session.date,
        timeOfDay: session.timeOfDay,
        systolic: avgSystolic,
        diastolic: avgDiastolic,
        pulse: avgPulse,
        notes: sanitizedNotes,
        readings,
        readingCount: readings.length,
      },
      error: null,
    };
  } catch (err) {
    logError('bloodPressure.updateSession', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete an entire session of blood pressure readings
 */
export async function deleteSession(sessionId: string): Promise<{ error: Error | null }> {
  try {
    await execSQL('DELETE FROM blood_pressure_readings WHERE session_id = ?', [sessionId]);
    return { error: null };
  } catch (err) {
    logError('bloodPressure.deleteSession', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
