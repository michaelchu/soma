import type { SleepEntry } from '../../../lib/db/sleep';

/**
 * Format duration in minutes to hours and minutes string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Parse hours and minutes string to total minutes
 */
export function parseDuration(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

/**
 * Format HRV range
 */
export function formatHrvRange(low: number | null, high: number | null): string {
  if (low === null && high === null) return '-';
  if (low === null) return `${high} ms`;
  if (high === null) return `${low} ms`;
  return `${low}-${high} ms`;
}

/**
 * Calculate restorative sleep percentage (Deep + REM)
 */
export function getRestorativeSleepPct(entry: SleepEntry): number | null {
  if (entry.deepSleepPct === null && entry.remSleepPct === null) return null;
  return (entry.deepSleepPct || 0) + (entry.remSleepPct || 0);
}

/**
 * Get sleep quality rating based on metrics
 */
export function getSleepQuality(entry: SleepEntry): 'poor' | 'fair' | 'good' | 'excellent' {
  let score = 0;
  let factors = 0;

  // Duration (7-9 hours is optimal)
  const hours = entry.durationMinutes / 60;
  if (hours >= 7 && hours <= 9) {
    score += 2;
  } else if (hours >= 6 && hours <= 10) {
    score += 1;
  }
  factors += 2;

  // Restorative sleep (Deep + REM should be 40%+)
  const restorative = getRestorativeSleepPct(entry);
  if (restorative !== null) {
    if (restorative >= 40) score += 2;
    else if (restorative >= 30) score += 1;
    factors += 2;
  }

  // HRV (higher is generally better)
  if (entry.hrvHigh !== null) {
    if (entry.hrvHigh >= 50) score += 1;
    factors += 1;
  }

  // HR Drop (faster drop is better recovery)
  if (entry.hrDropMinutes !== null) {
    if (entry.hrDropMinutes <= 30) score += 1;
    factors += 1;
  }

  const pct = factors > 0 ? score / factors : 0;
  if (pct >= 0.8) return 'excellent';
  if (pct >= 0.6) return 'good';
  if (pct >= 0.4) return 'fair';
  return 'poor';
}

/**
 * Calculate statistics from sleep entries
 */
export function calculateSleepStats(entries: SleepEntry[]) {
  if (entries.length === 0) return null;

  const avgDuration = Math.round(
    entries.reduce((sum, e) => sum + e.durationMinutes, 0) / entries.length
  );

  const hrvLows = entries.filter((e) => e.hrvLow !== null).map((e) => e.hrvLow!);
  const hrvHighs = entries.filter((e) => e.hrvHigh !== null).map((e) => e.hrvHigh!);
  const restingHrs = entries.filter((e) => e.restingHr !== null).map((e) => e.restingHr!);
  const deepPcts = entries.filter((e) => e.deepSleepPct !== null).map((e) => e.deepSleepPct!);
  const remPcts = entries.filter((e) => e.remSleepPct !== null).map((e) => e.remSleepPct!);
  const hrDrops = entries.filter((e) => e.hrDropMinutes !== null).map((e) => e.hrDropMinutes!);

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const min = (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : null);
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : null);

  return {
    count: entries.length,
    avgDuration,
    avgHrvLow: avg(hrvLows),
    avgHrvHigh: avg(hrvHighs),
    avgRestingHr: avg(restingHrs),
    minRestingHr: min(restingHrs),
    maxRestingHr: max(restingHrs),
    avgDeepPct: avg(deepPcts),
    avgRemPct: avg(remPcts),
    avgHrDrop: avg(hrDrops),
  };
}

/**
 * Filter entries by date range
 */
export function filterEntriesByDateRange(
  entries: SleepEntry[],
  days: number | 'all'
): SleepEntry[] {
  if (days === 'all') return entries;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return entries.filter((e) => new Date(e.date) >= cutoff);
}
