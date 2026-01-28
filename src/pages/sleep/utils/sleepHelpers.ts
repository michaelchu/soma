import type { SleepEntry } from '../../../lib/db/sleep';

/**
 * Sleep stage colors for consistent styling across components
 */
export const STAGE_COLORS = {
  deep: 'bg-blue-600',
  rem: 'bg-sky-400',
  light: 'bg-blue-300',
  awake: 'bg-lime-400',
};

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

/**
 * Get entries from the previous period for comparison
 * e.g., if dateRange is 30, get entries from 31-60 days ago
 */
export function getPreviousPeriodEntries(
  allEntries: SleepEntry[],
  dateRange: string
): SleepEntry[] {
  if (dateRange === 'all') return [];

  const days = parseInt(dateRange, 10);
  if (isNaN(days)) return [];

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Current period: now - days to now
  // Previous period: now - (2 * days) to now - days
  const currentCutoff = new Date(now);
  currentCutoff.setDate(currentCutoff.getDate() - days);
  currentCutoff.setHours(0, 0, 0, 0);

  const previousCutoff = new Date(now);
  previousCutoff.setDate(previousCutoff.getDate() - days * 2);
  previousCutoff.setHours(0, 0, 0, 0);

  return allEntries.filter((e) => {
    const entryDate = new Date(e.date);
    return entryDate >= previousCutoff && entryDate < currentCutoff;
  });
}

/**
 * Calculate detailed stats with min/max/avg for table display
 */
export interface DetailedSleepStats {
  count: number;
  duration: { min: number; max: number; avg: number };
  hrvLow: { min: number | null; max: number | null; avg: number | null };
  hrvHigh: { min: number | null; max: number | null; avg: number | null };
  restingHr: { min: number | null; max: number | null; avg: number | null };
  deepSleepPct: { min: number | null; max: number | null; avg: number | null };
  remSleepPct: { min: number | null; max: number | null; avg: number | null };
  restorative: { min: number | null; max: number | null; avg: number | null };
  hrDrop: { min: number | null; max: number | null; avg: number | null };
}

export function calculateDetailedStats(entries: SleepEntry[]): DetailedSleepStats | null {
  if (entries.length === 0) return null;

  const calcStats = (values: number[]) => {
    if (values.length === 0) return { min: null, max: null, avg: null };
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
    };
  };

  const durations = entries.map((e) => e.durationMinutes);
  const hrvLows = entries.filter((e) => e.hrvLow !== null).map((e) => e.hrvLow!);
  const hrvHighs = entries.filter((e) => e.hrvHigh !== null).map((e) => e.hrvHigh!);
  const restingHrs = entries.filter((e) => e.restingHr !== null).map((e) => e.restingHr!);
  const deepPcts = entries.filter((e) => e.deepSleepPct !== null).map((e) => e.deepSleepPct!);
  const remPcts = entries.filter((e) => e.remSleepPct !== null).map((e) => e.remSleepPct!);
  const restoratives = entries
    .filter((e) => e.deepSleepPct !== null || e.remSleepPct !== null)
    .map((e) => (e.deepSleepPct || 0) + (e.remSleepPct || 0));
  const hrDrops = entries.filter((e) => e.hrDropMinutes !== null).map((e) => e.hrDropMinutes!);

  const durationStats = calcStats(durations);

  return {
    count: entries.length,
    duration: {
      min: durationStats.min!,
      max: durationStats.max!,
      avg: durationStats.avg!,
    },
    hrvLow: calcStats(hrvLows),
    hrvHigh: calcStats(hrvHighs),
    restingHr: calcStats(restingHrs),
    deepSleepPct: calcStats(deepPcts),
    remSleepPct: calcStats(remPcts),
    restorative: calcStats(restoratives),
    hrDrop: calcStats(hrDrops),
  };
}

/**
 * Personal baseline statistics with mean and standard deviation
 */
export interface PersonalBaseline {
  count: number;
  duration: { mean: number; std: number } | null;
  hrvLow: { mean: number; std: number } | null;
  hrvHigh: { mean: number; std: number } | null;
  restingHr: { mean: number; std: number } | null;
  deepSleepPct: { mean: number; std: number } | null;
  remSleepPct: { mean: number; std: number } | null;
  restorative: { mean: number; std: number } | null;
  awakePct: { mean: number; std: number } | null;
  movementCount: { mean: number; std: number } | null;
  sleepCycles: { mean: number; std: number } | null;
}

/**
 * Calculate mean and standard deviation for an array of numbers
 */
function calcMeanStd(values: number[]): { mean: number; std: number } | null {
  if (values.length < 3) return null; // Need at least 3 data points for meaningful stats
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  return { mean, std: std || 1 }; // Avoid division by zero
}

/**
 * Calculate personal baseline from historical entries
 * Excludes the current entry if provided
 */
export function calculatePersonalBaseline(
  entries: SleepEntry[],
  excludeId?: string
): PersonalBaseline {
  const filtered = excludeId ? entries.filter((e) => e.id !== excludeId) : entries;

  const durations = filtered.map((e) => e.durationMinutes);
  const hrvLows = filtered.filter((e) => e.hrvLow !== null).map((e) => e.hrvLow!);
  const hrvHighs = filtered.filter((e) => e.hrvHigh !== null).map((e) => e.hrvHigh!);
  const restingHrs = filtered.filter((e) => e.restingHr !== null).map((e) => e.restingHr!);
  const deepPcts = filtered.filter((e) => e.deepSleepPct !== null).map((e) => e.deepSleepPct!);
  const remPcts = filtered.filter((e) => e.remSleepPct !== null).map((e) => e.remSleepPct!);
  const awakePcts = filtered.filter((e) => e.awakePct !== null).map((e) => e.awakePct!);
  const movements = filtered.filter((e) => e.movementCount !== null).map((e) => e.movementCount!);
  const cycles = filtered
    .filter((e) => e.sleepCyclesFull !== null)
    .map((e) => e.sleepCyclesFull! + (e.sleepCyclesPartial || 0) * 0.5);

  // Calculate restorative (deep + REM) for entries that have both
  const restoratives = filtered
    .filter((e) => e.deepSleepPct !== null || e.remSleepPct !== null)
    .map((e) => (e.deepSleepPct || 0) + (e.remSleepPct || 0));

  return {
    count: filtered.length,
    duration: calcMeanStd(durations),
    hrvLow: calcMeanStd(hrvLows),
    hrvHigh: calcMeanStd(hrvHighs),
    restingHr: calcMeanStd(restingHrs),
    deepSleepPct: calcMeanStd(deepPcts),
    remSleepPct: calcMeanStd(remPcts),
    restorative: calcMeanStd(restoratives),
    awakePct: calcMeanStd(awakePcts),
    movementCount: calcMeanStd(movements),
    sleepCycles: calcMeanStd(cycles),
  };
}

/**
 * Calculate z-score (how many standard deviations from mean)
 * Returns null if baseline not available
 */
function zScore(
  value: number | null,
  baseline: { mean: number; std: number } | null
): number | null {
  if (value === null || baseline === null) return null;
  return (value - baseline.mean) / baseline.std;
}

/**
 * Convert z-score to a 0-100 scale score
 * 50 = average, each std dev = 10 points
 * Clamped to 0-100 range
 */
function zScoreToPoints(z: number | null, invertDirection = false): number | null {
  if (z === null) return null;
  const adjusted = invertDirection ? -z : z;
  return Math.max(0, Math.min(100, 50 + adjusted * 10));
}

/**
 * Sleep score breakdown by category
 */
export interface SleepScoreBreakdown {
  overall: number | null;
  duration: number | null;
  heartHealth: number | null; // HRV + Resting HR
  sleepQuality: number | null; // Restorative % + Awake %
  restfulness: number | null; // Movement count + cycles
  componentsAvailable: number;
  componentsTotal: number;
}

/**
 * Calculate personal sleep score based on historical baseline
 * Returns a score from 0-100 where 50 = your average
 *
 * Higher is better for: duration, HRV, deep%, REM%, cycles
 * Lower is better for: resting HR, awake%, movements
 */
export function calculateSleepScore(
  entry: SleepEntry,
  baseline: PersonalBaseline
): SleepScoreBreakdown {
  // Need minimum data for scoring
  if (baseline.count < 3) {
    return {
      overall: null,
      duration: null,
      heartHealth: null,
      sleepQuality: null,
      restfulness: null,
      componentsAvailable: 0,
      componentsTotal: 4,
    };
  }

  const scores: { score: number; weight: number; category: string }[] = [];

  // Duration score (higher is better, but penalize extremes)
  if (baseline.duration) {
    const durationZ = zScore(entry.durationMinutes, baseline.duration);
    // Optimal is slightly above average, heavily penalize very long sleep too
    const durationScore = zScoreToPoints(durationZ);
    if (durationScore !== null) {
      scores.push({ score: durationScore, weight: 1.5, category: 'duration' });
    }
  }

  // HRV scores (higher is better)
  const hrvScores: number[] = [];
  const hrvLowScore = zScoreToPoints(zScore(entry.hrvLow, baseline.hrvLow));
  const hrvHighScore = zScoreToPoints(zScore(entry.hrvHigh, baseline.hrvHigh));
  if (hrvLowScore !== null) hrvScores.push(hrvLowScore);
  if (hrvHighScore !== null) hrvScores.push(hrvHighScore);

  // Resting HR (lower is better)
  const rhrScore = zScoreToPoints(zScore(entry.restingHr, baseline.restingHr), true);
  if (rhrScore !== null) hrvScores.push(rhrScore);

  if (hrvScores.length > 0) {
    const avgHeart = hrvScores.reduce((a, b) => a + b, 0) / hrvScores.length;
    scores.push({ score: avgHeart, weight: 1.5, category: 'heartHealth' });
  }

  // Sleep quality (restorative + awake)
  const qualityScores: number[] = [];
  const restorativeValue =
    entry.deepSleepPct !== null || entry.remSleepPct !== null
      ? (entry.deepSleepPct || 0) + (entry.remSleepPct || 0)
      : null;
  const restorativeScore = zScoreToPoints(zScore(restorativeValue, baseline.restorative));
  if (restorativeScore !== null) qualityScores.push(restorativeScore);

  const awakeScore = zScoreToPoints(zScore(entry.awakePct, baseline.awakePct), true);
  if (awakeScore !== null) qualityScores.push(awakeScore);

  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    scores.push({ score: avgQuality, weight: 2, category: 'sleepQuality' });
  }

  // Restfulness (movements + cycles)
  const restfulScores: number[] = [];
  const movementScore = zScoreToPoints(zScore(entry.movementCount, baseline.movementCount), true);
  if (movementScore !== null) restfulScores.push(movementScore);

  const cyclesValue =
    entry.sleepCyclesFull !== null
      ? entry.sleepCyclesFull + (entry.sleepCyclesPartial || 0) * 0.5
      : null;
  const cyclesScore = zScoreToPoints(zScore(cyclesValue, baseline.sleepCycles));
  if (cyclesScore !== null) restfulScores.push(cyclesScore);

  if (restfulScores.length > 0) {
    const avgRestful = restfulScores.reduce((a, b) => a + b, 0) / restfulScores.length;
    scores.push({ score: avgRestful, weight: 1, category: 'restfulness' });
  }

  // Calculate weighted overall score
  if (scores.length === 0) {
    return {
      overall: null,
      duration: null,
      heartHealth: null,
      sleepQuality: null,
      restfulness: null,
      componentsAvailable: 0,
      componentsTotal: 4,
    };
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  const overall = Math.round(weightedSum / totalWeight);

  // Extract category scores
  const getCategory = (cat: string) => {
    const found = scores.find((s) => s.category === cat);
    return found ? Math.round(found.score) : null;
  };

  return {
    overall,
    duration: getCategory('duration'),
    heartHealth: getCategory('heartHealth'),
    sleepQuality: getCategory('sleepQuality'),
    restfulness: getCategory('restfulness'),
    componentsAvailable: scores.length,
    componentsTotal: 4,
  };
}

/**
 * Get score label based on value
 */
export function getScoreLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 70) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 45) return 'Average';
  if (score >= 30) return 'Below Avg';
  return 'Poor';
}

/**
 * Get score color class based on value
 */
export function getScoreColorClass(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 55) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 45) return 'text-foreground';
  if (score >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get score background color class based on value
 */
export function getScoreBgClass(score: number | null): string {
  if (score === null) return 'bg-muted/50';
  if (score >= 70) return 'bg-green-500/10';
  if (score >= 55) return 'bg-emerald-500/10';
  if (score >= 45) return 'bg-muted/50';
  if (score >= 30) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}
