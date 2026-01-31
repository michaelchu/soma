import { supabase } from '../supabase';
import { validateActivity, sanitizeString } from '../validation';
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
    console.error('Error fetching activities:', error);
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
  };

  const { data, error } = await supabase.from('activities').insert(row).select().single();

  if (error) {
    console.error('Error adding activity:', error);
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
  };

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating activity:', error);
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
    console.error('Error deleting activity:', error);
  }

  return { error };
}
