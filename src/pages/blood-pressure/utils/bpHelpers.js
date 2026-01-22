import { BP_CATEGORIES } from '../constants/bpCategories';

/**
 * Determine BP category based on systolic and diastolic values
 * Following American Heart Association guidelines
 */
export function getBPCategory(systolic, diastolic) {
  if (!systolic || !diastolic) return null;

  // Crisis check first (either value triggers)
  if (systolic > 180 || diastolic > 120) return 'crisis';

  // Hypertension Stage 2 (either value triggers)
  if (systolic >= 140 || diastolic >= 90) return 'hypertension2';

  // Hypertension Stage 1 (either value triggers)
  if (systolic >= 130 || diastolic >= 80) return 'hypertension1';

  // Elevated (only systolic elevated, diastolic must be normal)
  if (systolic >= 120 && diastolic < 80) return 'elevated';

  // Normal
  return 'normal';
}

/**
 * Get category info object for display
 */
export function getCategoryInfo(category) {
  return BP_CATEGORIES[category] || BP_CATEGORIES.normal;
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
 * Format datetime for display
 * @param {string} datetime - ISO datetime string
 * @param {Object} options - Formatting options
 * @param {boolean} options.hideCurrentYear - Hide year if it's the current year (default: false)
 */
export function formatDateTime(datetime, options = {}) {
  const date = new Date(datetime);
  const { hideCurrentYear = false } = options;
  const isCurrentYear = hideCurrentYear && date.getFullYear() === new Date().getFullYear();

  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'short',
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
 * Format datetime for markdown ID
 */
export function formatDatetimeForId(datetime) {
  const date = new Date(datetime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
