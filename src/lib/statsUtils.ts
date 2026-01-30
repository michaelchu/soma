/**
 * Shared statistics utility functions
 * Provides consistent rounding and calculation methods across the app
 */

/**
 * Calculate the average of an array of numbers
 * Returns null if the array is empty
 */
export function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Round a number to the nearest integer using standard rounding (Math.round)
 * This is the canonical rounding function for all statistics display
 */
export function roundStat(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value);
}

/**
 * Calculate and round the average in one step
 * Returns null if the array is empty
 */
export function avgRounded(arr: number[]): number | null {
  const average = avg(arr);
  return roundStat(average);
}

/**
 * Calculate min, max, and avg for an array of numbers
 * Returns null values if the array is empty
 */
export function calcStats(values: number[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
} {
  if (values.length === 0) {
    return { min: null, max: null, avg: null };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: avg(values),
  };
}

/**
 * Calculate min, max, and rounded avg for an array of numbers
 * Returns null values if the array is empty
 */
export function calcStatsRounded(values: number[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
} {
  if (values.length === 0) {
    return { min: null, max: null, avg: null };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: avgRounded(values),
  };
}

/**
 * Calculate the standard deviation of an array of numbers
 * Returns 0 if the array has fewer than 2 values
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}
