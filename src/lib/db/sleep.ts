import { supabase } from '../supabase';
import { sanitizeString } from '../validation';

/**
 * Sleep data service
 * CRUD operations for sleep entries
 */

interface SleepEntryRow {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number | null;
  sleep_start: string | null;
  sleep_end: string | null;
  hrv_low: number | null;
  hrv_high: number | null;
  resting_hr: number | null;
  lowest_hr_time: string | null;
  hr_drop_minutes: number | null;
  deep_sleep_pct: number | null;
  rem_sleep_pct: number | null;
  light_sleep_pct: number | null;
  awake_pct: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  durationMinutes: number;
  sleepStart: string | null;
  sleepEnd: string | null;
  hrvLow: number | null;
  hrvHigh: number | null;
  restingHr: number | null;
  lowestHrTime: string | null;
  hrDropMinutes: number | null;
  deepSleepPct: number | null;
  remSleepPct: number | null;
  lightSleepPct: number | null;
  awakePct: number | null;
  notes: string | null;
}

export interface SleepEntryInput {
  date: string;
  durationMinutes?: number | null;
  sleepStart?: string | null;
  sleepEnd?: string | null;
  hrvLow?: number | null;
  hrvHigh?: number | null;
  restingHr?: number | null;
  lowestHrTime?: string | null;
  hrDropMinutes?: number | null;
  deepSleepPct?: number | null;
  remSleepPct?: number | null;
  lightSleepPct?: number | null;
  awakePct?: number | null;
  notes?: string | null;
}

/**
 * Calculate duration in minutes from sleep start and end times
 * Handles overnight sleep (end time before start time)
 */
function calculateDurationFromTimes(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // If end is before start, it's overnight sleep
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

function rowToEntry(row: SleepEntryRow): SleepEntry {
  // Calculate duration from times if not directly stored
  let durationMinutes = row.duration_minutes;
  if (durationMinutes === null && row.sleep_start && row.sleep_end) {
    durationMinutes = calculateDurationFromTimes(row.sleep_start, row.sleep_end);
  }

  return {
    id: row.id,
    date: row.date,
    durationMinutes: durationMinutes ?? 0,
    sleepStart: row.sleep_start,
    sleepEnd: row.sleep_end,
    hrvLow: row.hrv_low,
    hrvHigh: row.hrv_high,
    restingHr: row.resting_hr,
    lowestHrTime: row.lowest_hr_time,
    hrDropMinutes: row.hr_drop_minutes,
    deepSleepPct: row.deep_sleep_pct,
    remSleepPct: row.rem_sleep_pct,
    lightSleepPct: row.light_sleep_pct,
    awakePct: row.awake_pct,
    notes: row.notes,
  };
}

/**
 * Get all sleep entries for the current user
 */
export async function getSleepEntries(): Promise<{
  data: SleepEntry[] | null;
  error: Error | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('sleep_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching sleep entries:', error);
    return { data: null, error };
  }

  const entries = (data as SleepEntryRow[]).map(rowToEntry);
  return { data: entries, error: null };
}

/**
 * Add a new sleep entry
 */
export async function addSleepEntry(
  entry: SleepEntryInput
): Promise<{ data: SleepEntry | null; error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;

  const row = {
    user_id: user.id,
    date: entry.date,
    duration_minutes: entry.durationMinutes || null,
    sleep_start: entry.sleepStart || null,
    sleep_end: entry.sleepEnd || null,
    hrv_low: entry.hrvLow || null,
    hrv_high: entry.hrvHigh || null,
    resting_hr: entry.restingHr || null,
    lowest_hr_time: entry.lowestHrTime || null,
    hr_drop_minutes: entry.hrDropMinutes || null,
    deep_sleep_pct: entry.deepSleepPct || null,
    rem_sleep_pct: entry.remSleepPct || null,
    light_sleep_pct: entry.lightSleepPct || null,
    awake_pct: entry.awakePct || null,
    notes: sanitizedNotes,
  };

  const { data, error } = await supabase.from('sleep_entries').insert(row).select().single();

  if (error) {
    console.error('Error adding sleep entry:', error);
    return { data: null, error };
  }

  return { data: rowToEntry(data as SleepEntryRow), error: null };
}

/**
 * Update an existing sleep entry
 */
export async function updateSleepEntry(
  id: string,
  entry: SleepEntryInput
): Promise<{ data: SleepEntry | null; error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;

  const updates = {
    date: entry.date,
    duration_minutes: entry.durationMinutes || null,
    sleep_start: entry.sleepStart || null,
    sleep_end: entry.sleepEnd || null,
    hrv_low: entry.hrvLow || null,
    hrv_high: entry.hrvHigh || null,
    resting_hr: entry.restingHr || null,
    lowest_hr_time: entry.lowestHrTime || null,
    hr_drop_minutes: entry.hrDropMinutes || null,
    deep_sleep_pct: entry.deepSleepPct || null,
    rem_sleep_pct: entry.remSleepPct || null,
    light_sleep_pct: entry.lightSleepPct || null,
    awake_pct: entry.awakePct || null,
    notes: sanitizedNotes,
  };

  const { data, error } = await supabase
    .from('sleep_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating sleep entry:', error);
    return { data: null, error };
  }

  return { data: rowToEntry(data as SleepEntryRow), error: null };
}

/**
 * Delete a sleep entry
 */
export async function deleteSleepEntry(id: string): Promise<{ error: Error | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('sleep_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting sleep entry:', error);
  }

  return { error };
}
