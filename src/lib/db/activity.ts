import { querySQL, execSQL } from '../sqlite';
import { validateActivity, sanitizeString } from '../validation';
import { logError } from '../logger';
import type {
  Activity,
  ActivityInput,
  ActivityRow,
  ActivityType,
  ActivityTimeOfDay,
} from '@/types/activity';

/**
 * Activity data service
 * CRUD operations for activity entries (local SQLite)
 */

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: '',
    date: row.date,
    timeOfDay: row.time_of_day as ActivityTimeOfDay,
    activityType: row.activity_type as ActivityType,
    durationMinutes: row.duration_minutes,
    intensity: row.intensity,
    notes: row.notes,
    zone1Minutes: row.zone1_minutes,
    zone2Minutes: row.zone2_minutes,
    zone3Minutes: row.zone3_minutes,
    zone4Minutes: row.zone4_minutes,
    zone5Minutes: row.zone5_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all activities
 */
export async function getActivities(): Promise<{
  data: Activity[] | null;
  error: Error | null;
}> {
  try {
    const rows = await querySQL<ActivityRow>('SELECT * FROM activities ORDER BY date DESC');
    return { data: rows.map(rowToActivity), error: null };
  } catch (err) {
    logError('activity.getActivities', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Add a new activity
 */
export async function addActivity(
  input: ActivityInput
): Promise<{ data: Activity | null; error: Error | null }> {
  const validation = validateActivity(input);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  try {
    const sanitizedNotes = input.notes ? sanitizeString(input.notes) : null;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await execSQL(
      `INSERT INTO activities (id, date, time_of_day, activity_type, duration_minutes, intensity, notes,
        zone1_minutes, zone2_minutes, zone3_minutes, zone4_minutes, zone5_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.date,
        input.timeOfDay,
        input.activityType,
        input.durationMinutes,
        input.intensity,
        sanitizedNotes,
        input.zone1Minutes ?? null,
        input.zone2Minutes ?? null,
        input.zone3Minutes ?? null,
        input.zone4Minutes ?? null,
        input.zone5Minutes ?? null,
        now,
        now,
      ]
    );

    const rows = await querySQL<ActivityRow>('SELECT * FROM activities WHERE id = ?', [id]);
    return { data: rowToActivity(rows[0]), error: null };
  } catch (err) {
    logError('activity.addActivity', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing activity
 */
export async function updateActivity(
  id: string,
  input: ActivityInput
): Promise<{ data: Activity | null; error: Error | null }> {
  const validation = validateActivity(input);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  try {
    const sanitizedNotes = input.notes ? sanitizeString(input.notes) : null;
    const now = new Date().toISOString();

    await execSQL(
      `UPDATE activities SET date=?, time_of_day=?, activity_type=?, duration_minutes=?, intensity=?, notes=?,
        zone1_minutes=?, zone2_minutes=?, zone3_minutes=?, zone4_minutes=?, zone5_minutes=?, updated_at=?
       WHERE id=?`,
      [
        input.date,
        input.timeOfDay,
        input.activityType,
        input.durationMinutes,
        input.intensity,
        sanitizedNotes,
        input.zone1Minutes ?? null,
        input.zone2Minutes ?? null,
        input.zone3Minutes ?? null,
        input.zone4Minutes ?? null,
        input.zone5Minutes ?? null,
        now,
        id,
      ]
    );

    const rows = await querySQL<ActivityRow>('SELECT * FROM activities WHERE id = ?', [id]);
    return { data: rowToActivity(rows[0]), error: null };
  } catch (err) {
    logError('activity.updateActivity', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete an activity
 */
export async function deleteActivity(id: string): Promise<{ error: Error | null }> {
  try {
    await execSQL('DELETE FROM activities WHERE id = ?', [id]);
    return { error: null };
  } catch (err) {
    logError('activity.deleteActivity', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
