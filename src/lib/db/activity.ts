import { supabase } from '../supabase';
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
 * CRUD operations for activity entries
 */

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: row.user_id,
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
 * Get all activities for the current user
 */
export async function getActivities(): Promise<{
  data: Activity[] | null;
  error: Error | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    logError('activity.getActivities', error);
    return { data: null, error };
  }

  const activities = (data as ActivityRow[]).map(rowToActivity);
  return { data: activities, error: null };
}

/**
 * Add a new activity
 */
export async function addActivity(
  input: ActivityInput
): Promise<{ data: Activity | null; error: Error | null }> {
  // Validate input
  const validation = validateActivity(input);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const sanitizedNotes = input.notes ? sanitizeString(input.notes) : null;

  const row = {
    user_id: user.id,
    date: input.date,
    time_of_day: input.timeOfDay,
    activity_type: input.activityType,
    duration_minutes: input.durationMinutes,
    intensity: input.intensity,
    notes: sanitizedNotes,
    zone1_minutes: input.zone1Minutes ?? null,
    zone2_minutes: input.zone2Minutes ?? null,
    zone3_minutes: input.zone3Minutes ?? null,
    zone4_minutes: input.zone4Minutes ?? null,
    zone5_minutes: input.zone5Minutes ?? null,
  };

  const { data, error } = await supabase.from('activities').insert(row).select().single();

  if (error) {
    logError('activity.addActivity', error);
    return { data: null, error };
  }

  return { data: rowToActivity(data as ActivityRow), error: null };
}

/**
 * Update an existing activity
 */
export async function updateActivity(
  id: string,
  input: ActivityInput
): Promise<{ data: Activity | null; error: Error | null }> {
  // Validate input
  const validation = validateActivity(input);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const sanitizedNotes = input.notes ? sanitizeString(input.notes) : null;

  const updates = {
    date: input.date,
    time_of_day: input.timeOfDay,
    activity_type: input.activityType,
    duration_minutes: input.durationMinutes,
    intensity: input.intensity,
    notes: sanitizedNotes,
    zone1_minutes: input.zone1Minutes ?? null,
    zone2_minutes: input.zone2Minutes ?? null,
    zone3_minutes: input.zone3Minutes ?? null,
    zone4_minutes: input.zone4Minutes ?? null,
    zone5_minutes: input.zone5Minutes ?? null,
  };

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    logError('activity.updateActivity', error);
    return { data: null, error };
  }

  return { data: rowToActivity(data as ActivityRow), error: null };
}

/**
 * Delete an activity
 */
export async function deleteActivity(id: string): Promise<{ error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase.from('activities').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    logError('activity.deleteActivity', error);
  }

  return { error };
}
