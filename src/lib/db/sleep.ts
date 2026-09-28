import { apiGet, apiPost, apiPut, apiDelete } from '../api';
import { sanitizeString, validateSleepEntry, type SleepEntryInput } from '../validation';
import { logError } from '../logger';
import { calculateDurationFromTimes } from '../dateUtils';

/**
 * Sleep data service
 * CRUD operations for sleep entries (server API backed by Postgres)
 */

interface SleepEntryRow {
  id: string;
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
  durationMinutes: number;
  totalSleepMinutes: number | null;
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

export type { SleepEntryInput } from '../validation';

function rowToEntry(row: SleepEntryRow): SleepEntry {
  let durationMinutes = 0;
  if (row.sleep_start && row.sleep_end) {
    durationMinutes = calculateDurationFromTimes(row.sleep_start, row.sleep_end);
  }

  return {
    id: row.id,
    date: row.date,
    timezone: row.timezone,
    durationMinutes,
    totalSleepMinutes: row.total_sleep_minutes,
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

function toPayload(entry: SleepEntryInput, notes: string | null, fallbackTimezone: boolean) {
  return {
    date: entry.date,
    timezone:
      entry.timezone ||
      (fallbackTimezone ? Intl.DateTimeFormat().resolvedOptions().timeZone : null),
    totalSleepMinutes: entry.totalSleepMinutes || null,
    sleepStart: entry.sleepStart || null,
    sleepEnd: entry.sleepEnd || null,
    hrvLow: entry.hrvLow || null,
    hrvHigh: entry.hrvHigh || null,
    restingHr: entry.restingHr || null,
    lowestHrTime: entry.lowestHrTime || null,
    hrDropMinutes: entry.hrDropMinutes || null,
    deepSleepPct: entry.deepSleepPct || null,
    remSleepPct: entry.remSleepPct || null,
    lightSleepPct: entry.lightSleepPct || null,
    awakePct: entry.awakePct || null,
    skinTempAvg: entry.skinTempAvg || null,
    sleepCyclesFull: entry.sleepCyclesFull || null,
    sleepCyclesPartial: entry.sleepCyclesPartial || null,
    movementCount: entry.movementCount || null,
    notes,
  };
}

/**
 * Get all sleep entries
 */
export async function getSleepEntries(): Promise<{
  data: SleepEntry[] | null;
  error: Error | null;
}> {
  try {
    const { rows } = await apiGet<{ rows: SleepEntryRow[] }>('/api/sleep');
    return { data: rows.map(rowToEntry), error: null };
  } catch (err) {
    logError('sleep.getSleepEntries', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Add a new sleep entry
 */
export async function addSleepEntry(
  entry: SleepEntryInput
): Promise<{ data: SleepEntry | null; error: Error | null }> {
  const validation = validateSleepEntry(entry);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }

  try {
    const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;
    const { row } = await apiPost<{ row: SleepEntryRow }>(
      '/api/sleep',
      toPayload(entry, sanitizedNotes, true)
    );
    return { data: rowToEntry(row), error: null };
  } catch (err) {
    logError('sleep.addSleepEntry', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update an existing sleep entry
 */
export async function updateSleepEntry(
  id: string,
  entry: SleepEntryInput
): Promise<{ data: SleepEntry | null; error: Error | null }> {
  const validation = validateSleepEntry(entry);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }

  try {
    const sanitizedNotes = entry.notes ? sanitizeString(entry.notes) : null;
    const { row } = await apiPut<{ row: SleepEntryRow }>(
      `/api/sleep?id=${encodeURIComponent(id)}`,
      toPayload(entry, sanitizedNotes, false)
    );
    return { data: rowToEntry(row), error: null };
  } catch (err) {
    logError('sleep.updateSleepEntry', err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a sleep entry
 */
export async function deleteSleepEntry(id: string): Promise<{ error: Error | null }> {
  try {
    await apiDelete(`/api/sleep?id=${encodeURIComponent(id)}`);
    return { error: null };
  } catch (err) {
    logError('sleep.deleteSleepEntry', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
