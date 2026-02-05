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

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
}

/**
 * Simple least-squares linear regression
 * Requires at least 2 points. Returns slope, intercept, and a predict function.
 */
export function linearRegression(
  points: { x: number; y: number }[]
): LinearRegressionResult | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    // All x values are the same — return flat line at mean y
    const meanY = sumY / n;
    return { slope: 0, intercept: meanY, predict: () => meanY };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  };
}
