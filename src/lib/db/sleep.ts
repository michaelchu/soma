import { querySQL, execSQL } from '../sqlite';
import { sanitizeString, validateSleepEntry, type SleepEntryInput } from '../validation';
import { logError } from '../logger';
import { calculateDurationFromTimes } from '../dateUtils';

/**
 * Sleep data service
 * CRUD operations for sleep entries (local SQLite)
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

/**
 * Get all sleep entries
 */
export async function getSleepEntries(): Promise<{
  data: SleepEntry[] | null;
  error: Error | null;
}> {
  try {
    const rows = await querySQL<SleepEntryRow>('SELECT * FROM sleep_entries ORDER BY date DESC');
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
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await execSQL(
      `INSERT INTO sleep_entries
        (id, date, timezone, total_sleep_minutes, sleep_start, sleep_end,
         hrv_low, hrv_high, resting_hr, lowest_hr_time, hr_drop_minutes,
         deep_sleep_pct, rem_sleep_pct, light_sleep_pct, awake_pct,
         skin_temp_avg, sleep_cycles_full, sleep_cycles_partial, movement_count,
         notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.date,
        entry.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        entry.totalSleepMinutes || null,
        entry.sleepStart || null,
        entry.sleepEnd || null,
        entry.hrvLow || null,
        entry.hrvHigh || null,
        entry.restingHr || null,
        entry.lowestHrTime || null,
        entry.hrDropMinutes || null,
        entry.deepSleepPct || null,
        entry.remSleepPct || null,
        entry.lightSleepPct || null,
        entry.awakePct || null,
        entry.skinTempAvg || null,
        entry.sleepCyclesFull || null,
        entry.sleepCyclesPartial || null,
        entry.movementCount || null,
        sanitizedNotes,
        now,
        now,
      ]
    );

    const rows = await querySQL<SleepEntryRow>('SELECT * FROM sleep_entries WHERE id = ?', [id]);
    return { data: rowToEntry(rows[0]), error: null };
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
    const now = new Date().toISOString();

    await execSQL(
      `UPDATE sleep_entries SET
        date=?, timezone=?, total_sleep_minutes=?, sleep_start=?, sleep_end=?,
        hrv_low=?, hrv_high=?, resting_hr=?, lowest_hr_time=?, hr_drop_minutes=?,
        deep_sleep_pct=?, rem_sleep_pct=?, light_sleep_pct=?, awake_pct=?,
        skin_temp_avg=?, sleep_cycles_full=?, sleep_cycles_partial=?, movement_count=?,
        notes=?, updated_at=?
       WHERE id=?`,
      [
        entry.date,
        entry.timezone || null,
        entry.totalSleepMinutes || null,
        entry.sleepStart || null,
        entry.sleepEnd || null,
        entry.hrvLow || null,
        entry.hrvHigh || null,
        entry.restingHr || null,
        entry.lowestHrTime || null,
        entry.hrDropMinutes || null,
        entry.deepSleepPct || null,
        entry.remSleepPct || null,
        entry.lightSleepPct || null,
        entry.awakePct || null,
        entry.skinTempAvg || null,
        entry.sleepCyclesFull || null,
        entry.sleepCyclesPartial || null,
        entry.movementCount || null,
        sanitizedNotes,
        now,
        id,
      ]
    );

    const rows = await querySQL<SleepEntryRow>('SELECT * FROM sleep_entries WHERE id = ?', [id]);
    return { data: rowToEntry(rows[0]), error: null };
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
    await execSQL('DELETE FROM sleep_entries WHERE id = ?', [id]);
    return { error: null };
  } catch (err) {
    logError('sleep.deleteSleepEntry', err);
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
