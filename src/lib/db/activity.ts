import { apiGet, apiPost, apiPut, apiDelete } from '../api';
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
 * CRUD operations for activity entries (server API backed by Postgres)
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

function toPayload(input: ActivityInput, notes: string | null) {
  return {
    date: input.date,
    timeOfDay: input.timeOfDay,
    activityType: input.activityType,
    durationMinutes: input.durationMinutes,
    intensity: input.intensity,
    notes,
    zone1Minutes: input.zone1Minutes ?? null,
    zone2Minutes: input.zone2Minutes ?? null,
    zone3Minutes: input.zone3Minutes ?? null,
    zone4Minutes: input.zone4Minutes ?? null,
    zone5Minutes: input.zone5Minutes ?? null,
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
    const { rows } = await apiGet<{ rows: ActivityRow[] }>('/api/activities');
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
    const { row } = await apiPost<{ row: ActivityRow }>(
      '/api/activities',
      toPayload(input, sanitizedNotes)
    );
    return { data: rowToActivity(row), error: null };
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
    const { row } = await apiPut<{ row: ActivityRow }>(
      `/api/activities?id=${encodeURIComponent(id)}`,
      toPayload(input, sanitizedNotes)
    );
    return { data: rowToActivity(row), error: null };
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
    await apiDelete(`/api/activities?id=${encodeURIComponent(id)}`);
    return { error: null };
  } catch (err) {
    logError('activity.deleteActivity', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
