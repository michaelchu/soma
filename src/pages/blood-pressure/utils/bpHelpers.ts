import { BP_GUIDELINES, BP_CATEGORY_INFO, DEFAULT_GUIDELINE } from '../constants/bpGuidelines';
import { getPreviousDateRange, getTimeOfDayLabel } from '@/lib/dateUtils';
import { avgRounded, calcStats } from '@/lib/statsUtils';
import type { BPCategoryKey, TimeOfDay, BPTimeOfDay } from '@/types/bloodPressure';

interface BPReading {
  date?: string;
  timeOfDay?: BPTimeOfDay;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
}

/**
 * Determine BP category based on systolic and diastolic values
 * Uses the specified guideline for classification
 */
export function getBPCategory(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
  guidelineKey: string = DEFAULT_GUIDELINE
): BPCategoryKey | null {
  if (!systolic || !diastolic) return null;

  const guideline = BP_GUIDELINES[guidelineKey];
  if (!guideline) return null;

  const { categories, thresholds } = guideline;

  // Check categories in reverse order (most severe first)
  for (let i = categories.length - 1; i >= 0; i--) {
    const category = categories[i] as BPCategoryKey;
    const threshold = thresholds[category];

    if (!threshold) continue;

    const sysMin = threshold.systolic?.min ?? 0;
    const diaMin = threshold.diastolic?.min ?? 0;

    // For most categories, either systolic OR diastolic exceeding triggers
    // Exception: "elevated" in AHA requires systolic elevated but diastolic normal
    if (category === 'elevated') {
      const sysMax = threshold.systolic?.max ?? 999;
      const diaMax = threshold.diastolic?.max ?? 999;
      if (systolic >= sysMin && systolic <= sysMax && diastolic <= diaMax) {
        return category;
      }
    } else if (category === 'normal' || category === 'optimal') {
      // Normal/optimal: both must be below max
      const sysMax = threshold.systolic?.max ?? 999;
      const diaMax = threshold.diastolic?.max ?? 999;
      if (systolic <= sysMax && diastolic <= diaMax) {
        return category;
      }
    } else {
      // All other categories: either value exceeding min triggers
      if (systolic >= sysMin || diastolic >= diaMin) {
        return category;
      }
    }
  }

  // Fallback to first category (should be normal/optimal)
  return categories[0] as BPCategoryKey;
}

/**
 * Get category info object for display
 */
export function getCategoryInfo(category: string | null) {
  return BP_CATEGORY_INFO[category || 'normal'] || BP_CATEGORY_INFO.normal;
}

/**
 * Get reference lines for charts based on guideline
 */
export function getReferenceLines(guidelineKey: string = DEFAULT_GUIDELINE) {
  const guideline = BP_GUIDELINES[guidelineKey];
  return guideline?.referenceLines || BP_GUIDELINES[DEFAULT_GUIDELINE].referenceLines;
}

/**
 * Get combined CSS classes for a category badge
 */
export function getCategoryClasses(category: BPCategoryKey | null): string {
  const info = getCategoryInfo(category);
  return `${info.bgClass} ${info.textClass} ${info.borderClass}`;
}

/**
 * Calculate daily BP average from readings
 */
export function calculateDailyBPAverage(
  readings: BPReading[] | null | undefined
): { systolic: number; diastolic: number } | null {
  if (!readings || readings.length === 0) return null;

  const avgSystolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
  );
  const avgDiastolic = Math.round(
    readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
  );

  return { systolic: avgSystolic, diastolic: avgDiastolic };
}

/**
 * Calculate statistics from readings array
 */
export function calculateStats(readings: BPReading[] | null | undefined) {
  if (!readings || readings.length === 0) return null;

  const systolics = readings.map((r) => r.systolic);
  const diastolics = readings.map((r) => r.diastolic);
  const pulses = readings.filter((r) => r.pulse).map((r) => r.pulse as number);

  // Get latest reading (arrays are guaranteed non-empty at this point due to early return)
  const latestSystolic = systolics[systolics.length - 1];
  const latestDiastolic = diastolics[diastolics.length - 1];

  return {
    avgSystolic: avgRounded(systolics)!,
    avgDiastolic: avgRounded(diastolics)!,
    avgPulse: avgRounded(pulses),
    minSystolic: Math.min(...systolics),
    maxSystolic: Math.max(...systolics),
    minDiastolic: Math.min(...diastolics),
    maxDiastolic: Math.max(...diastolics),
    count: readings.length,
    latestCategory: getBPCategory(latestSystolic, latestDiastolic),
  };
}

/**
 * Calculate full statistics including PP and MAP
 */
export function calculateFullStats(readings: BPReading[] | null | undefined) {
  if (!readings || readings.length === 0) return null;

  const systolics = readings.map((r) => r.systolic);
  const diastolics = readings.map((r) => r.diastolic);
  const pulses = readings.filter((r) => r.pulse).map((r) => r.pulse as number);

  // Calculate PP (Pulse Pressure) = Systolic - Diastolic
  const pps = readings.map((r) => r.systolic - r.diastolic);

  // Calculate MAP (Mean Arterial Pressure) = Diastolic + (1/3 * PP)
  // Keep full precision - don't round individual values
  const maps = readings.map((r) => {
    const pp = r.systolic - r.diastolic;
    return r.diastolic + pp / 3;
  });

  return {
    systolic: calcStats(systolics),
    diastolic: calcStats(diastolics),
    pulse: calcStats(pulses),
    pp: calcStats(pps),
    map: calcStats(maps),
    count: readings.length,
  };
}

/**
 * Get readings for the previous equivalent period
 * e.g., if current is "rolling 1 month", previous is "the month before that"
 * Supports: '1w' (7 days), '1m' (1 month), '3m' (3 months), or number of days
 */
export function getPreviousPeriodReadings(
  allReadings: BPReading[] | null | undefined,
  dateRange: string,
  timeOfDay: TimeOfDay | 'all'
): BPReading[] {
  if (!allReadings || dateRange === 'all') return [];

  const { start: previousStart, end: previousEnd } = getPreviousDateRange(dateRange);
  if (!previousStart || !previousEnd) return [];

  let filtered = allReadings.filter((r) => {
    if (!r.date) return false;
    const date = new Date(r.date);
    return date >= previousStart && date < previousEnd;
  });

  // Apply time of day filter
  if (timeOfDay !== 'all') {
    filtered = filtered.filter((r) => r.timeOfDay === timeOfDay);
  }

  return filtered;
}

interface FormatBPDateOptions {
  hideCurrentYear?: boolean;
  hideWeekday?: boolean;
}

/**
 * Format BP date and time of day for display
 */
export function formatBPDateTime(
  dateStr: string,
  timeOfDay: BPTimeOfDay,
  options: FormatBPDateOptions = {}
) {
  const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
  const { hideCurrentYear = false, hideWeekday = false } = options;
  const isCurrentYear = hideCurrentYear && date.getFullYear() === new Date().getFullYear();

  return {
    date: date.toLocaleDateString('en-US', {
      ...(hideWeekday ? {} : { weekday: 'short' }),
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' }),
    }),
    time: getTimeOfDayLabel(timeOfDay),
    full: `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} ${getTimeOfDayLabel(timeOfDay)}`,
  };
}

interface Reading {
  date: string;
  systolic: number;
  diastolic: number;
}

/**
 * Get trend between two readings
 */
export function getTrend(readings: Reading[]) {
  if (readings.length < 2) return null;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const systolicDiff = latest.systolic - previous.systolic;
  const diastolicDiff = latest.diastolic - previous.diastolic;

  return {
    systolic: {
      diff: systolicDiff,
      direction: systolicDiff > 0 ? 'up' : systolicDiff < 0 ? 'down' : 'stable',
      isImproving: systolicDiff < 0,
    },
    diastolic: {
      diff: diastolicDiff,
      direction: diastolicDiff > 0 ? 'up' : diastolicDiff < 0 ? 'down' : 'stable',
      isImproving: diastolicDiff < 0,
    },
  };
}
