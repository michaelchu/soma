import { supabase } from '../supabase';
import { sanitizeString, validateSleepEntry, type SleepEntryInput } from '../validation';
import { logError } from '../logger';
import { calculateDurationFromTimes } from '../dateUtils';

/**
 * Sleep data service
 * CRUD operations for sleep entries
 */

interface SleepEntryRow {
  id: string;
  user_id: string;
  date: string;
  timezone: string | null;
  total_sleep_minutes: number | null;
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
  skin_temp_avg: number | null;
  sleep_cycles_full: number | null;
  sleep_cycles_partial: number | null;
  movement_count: number | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  timezone: string | null;
  durationMinutes: number; // Time in bed (calculated from sleep times)
  totalSleepMinutes: number | null; // Actual sleep time (externally calculated)
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
  skinTempAvg: number | null;
  sleepCyclesFull: number | null;
  sleepCyclesPartial: number | null;
  movementCount: number | null;
  notes: string | null;
}

// Re-export SleepEntryInput from validation for convenience
export type { SleepEntryInput } from '../validation';

function rowToEntry(row: SleepEntryRow): SleepEntry {
  // Calculate time in bed from sleep times
  let durationMinutes = 0;
  if (row.sleep_start && row.sleep_end) {
    durationMinutes = calculateDurationFromTimes(row.sleep_start, row.sleep_end);
  }

  return {
    id: row.id,
    date: row.date,
    timezone: row.timezone,
    durationMinutes, // Time in bed (always calculated from times)
    totalSleepMinutes: row.total_sleep_minutes, // Actual sleep time (from DB)
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
    skinTempAvg: row.skin_temp_avg,
    sleepCyclesFull: row.sleep_cycles_full,
    sleepCyclesPartial: row.sleep_cycles_partial,
    movementCount: row.movement_count,
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
    logError('sleep.getSleepEntries', error);
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

  // Validate input
  const validation = validateSleepEntry(entry);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }

  const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;

  const row = {
    user_id: user.id,
    date: entry.date,
    timezone: entry.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    total_sleep_minutes: entry.totalSleepMinutes || null,
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
    skin_temp_avg: entry.skinTempAvg || null,
    sleep_cycles_full: entry.sleepCyclesFull || null,
    sleep_cycles_partial: entry.sleepCyclesPartial || null,
    movement_count: entry.movementCount || null,
    notes: sanitizedNotes,
  };

  const { data, error } = await supabase.from('sleep_entries').insert(row).select().single();

  if (error) {
    logError('sleep.addSleepEntry', error);
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

  // Validate input
  const validation = validateSleepEntry(entry);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }

  const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;

  const updates = {
    date: entry.date,
    timezone: entry.timezone || undefined,
    total_sleep_minutes: entry.totalSleepMinutes || null,
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
    skin_temp_avg: entry.skinTempAvg || null,
    sleep_cycles_full: entry.sleepCyclesFull || null,
    sleep_cycles_partial: entry.sleepCyclesPartial || null,
    movement_count: entry.movementCount || null,
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
    logError('sleep.updateSleepEntry', error);
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
    logError('sleep.deleteSleepEntry', error);
  }

  return { error };
}
