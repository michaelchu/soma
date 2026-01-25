import { BP_GUIDELINES, BP_CATEGORY_INFO, DEFAULT_GUIDELINE } from '../constants/bpGuidelines';
import { isInTimeOfDay } from '@/lib/dateUtils';

/**
 * Determine BP category based on systolic and diastolic values
 * Uses the specified guideline for classification
 */
export function getBPCategory(systolic, diastolic, guidelineKey = DEFAULT_GUIDELINE) {
  if (!systolic || !diastolic) return null;

  const guideline = BP_GUIDELINES[guidelineKey];
  if (!guideline) return null;

  const { categories, thresholds } = guideline;

  // Check categories in reverse order (most severe first)
  for (let i = categories.length - 1; i >= 0; i--) {
    const category = categories[i];
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
  return categories[0];
}

/**
 * Get category info object for display
 */
export function getCategoryInfo(category) {
  return BP_CATEGORY_INFO[category] || BP_CATEGORY_INFO.normal;
}

/**
 * Get reference lines for charts based on guideline
 */
export function getReferenceLines(guidelineKey = DEFAULT_GUIDELINE) {
  const guideline = BP_GUIDELINES[guidelineKey];
  return guideline?.referenceLines || BP_GUIDELINES[DEFAULT_GUIDELINE].referenceLines;
}

/**
 * Get combined CSS classes for a category badge
 */
export function getCategoryClasses(category) {
  const info = getCategoryInfo(category);
  return `${info.bgClass} ${info.textClass} ${info.borderClass}`;
}

/**
 * Calculate statistics from readings array
 */
export function calculateStats(readings) {
  if (!readings || readings.length === 0) return null;

  const systolics = readings.map((r) => r.systolic);
  const diastolics = readings.map((r) => r.diastolic);
  const pulses = readings.filter((r) => r.pulse).map((r) => r.pulse);

  return {
    avgSystolic: Math.round(systolics.reduce((a, b) => a + b, 0) / systolics.length),
    avgDiastolic: Math.round(diastolics.reduce((a, b) => a + b, 0) / diastolics.length),
    avgPulse:
      pulses.length > 0 ? Math.round(pulses.reduce((a, b) => a + b, 0) / pulses.length) : null,
    minSystolic: Math.min(...systolics),
    maxSystolic: Math.max(...systolics),
    minDiastolic: Math.min(...diastolics),
    maxDiastolic: Math.max(...diastolics),
    count: readings.length,
    latestCategory: getBPCategory(
      systolics[systolics.length - 1],
      diastolics[diastolics.length - 1]
    ),
  };
}

/**
 * Calculate full statistics including PP and MAP
 */
export function calculateFullStats(readings) {
  if (!readings || readings.length === 0) return null;

  const systolics = readings.map((r) => r.systolic);
  const diastolics = readings.map((r) => r.diastolic);
  const pulses = readings.filter((r) => r.pulse).map((r) => r.pulse);

  // Calculate PP (Pulse Pressure) = Systolic - Diastolic
  const pps = readings.map((r) => r.systolic - r.diastolic);

  // Calculate MAP (Mean Arterial Pressure) = Diastolic + (1/3 * PP)
  const maps = readings.map((r) => {
    const pp = r.systolic - r.diastolic;
    return Math.round(r.diastolic + pp / 3);
  });

  const avg = (arr) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return {
    systolic: {
      min: Math.min(...systolics),
      max: Math.max(...systolics),
      avg: avg(systolics),
    },
    diastolic: {
      min: Math.min(...diastolics),
      max: Math.max(...diastolics),
      avg: avg(diastolics),
    },
    pulse: {
      min: pulses.length > 0 ? Math.min(...pulses) : null,
      max: pulses.length > 0 ? Math.max(...pulses) : null,
      avg: avg(pulses),
    },
    pp: {
      min: Math.min(...pps),
      max: Math.max(...pps),
      avg: avg(pps),
    },
    map: {
      min: Math.min(...maps),
      max: Math.max(...maps),
      avg: avg(maps),
    },
    count: readings.length,
  };
}

/**
 * Get readings for the previous equivalent period
 * e.g., if current is "last 7 days", previous is "7-14 days ago"
 */
export function getPreviousPeriodReadings(allReadings, dateRange, timeOfDay) {
  if (!allReadings || dateRange === 'all') return [];

  const days = parseInt(dateRange, 10);
  const now = new Date();

  // Previous period: from (days*2) ago to (days) ago
  const previousStart = new Date();
  previousStart.setDate(now.getDate() - days * 2);

  const previousEnd = new Date();
  previousEnd.setDate(now.getDate() - days);

  let filtered = allReadings.filter((r) => {
    const date = new Date(r.datetime);
    return date >= previousStart && date < previousEnd;
  });

  // Apply time of day filter
  if (timeOfDay !== 'all') {
    filtered = filtered.filter((r) => isInTimeOfDay(r.datetime, timeOfDay));
  }

  return filtered;
}

/**
 * Format datetime for display
 * @param {string} datetime - ISO datetime string
 * @param {Object} options - Formatting options
 * @param {boolean} options.hideCurrentYear - Hide year if it's the current year (default: false)
 * @param {boolean} options.hideWeekday - Hide weekday from date (default: false)
 */
export function formatDateTime(datetime, options = {}) {
  const date = new Date(datetime);
  const { hideCurrentYear = false, hideWeekday = false } = options;
  const isCurrentYear = hideCurrentYear && date.getFullYear() === new Date().getFullYear();

  return {
    date: date.toLocaleDateString('en-US', {
      ...(hideWeekday ? {} : { weekday: 'short' }),
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' }),
    }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    full: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

/**
 * Get trend between two readings
 */
export function getTrend(readings) {
  if (readings.length < 2) return null;

  const sorted = [...readings].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
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
