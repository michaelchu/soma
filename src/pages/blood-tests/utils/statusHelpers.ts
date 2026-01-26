import { RANGE_BAR_CONSTANTS } from '@/lib/constants';

/**
 * Status Helper Functions
 * Functions for determining and calculating metric statuses
 */

/**
 * Determine if a metric value is low, normal, or high
 * @param {number} value - The metric value
 * @param {number|null} min - Minimum reference range value
 * @param {number|null} max - Maximum reference range value
 * @returns {string} "low", "normal", or "high"
 */
export function getStatus(value, min, max) {
  if (min !== null && value < min) return 'low';
  if (max !== null && value > max) return 'high';
  return 'normal';
}

/**
 * Get the visual max for ranges with only a lower bound
 * @param {number} min - Minimum reference range value
 * @returns {number} Visual max for positioning
 */
export function getVisualMax(min) {
  return min * 2;
}

/**
 * Calculate position of value within range for visualization (0-100%)
 * @param {number} value - The metric value
 * @param {number|null} min - Minimum reference range value
 * @param {number|null} max - Maximum reference range value
 * @returns {number} Position percentage (0-100)
 */
export function getPositionInRange(value, min, max) {
  const { LOW_ZONE_END, NORMAL_ZONE_END, NORMAL_ZONE_WIDTH, OVERFLOW_FACTOR } = RANGE_BAR_CONSTANTS;

  if (min === null && max === null) return 50;

  // Only upper bound (e.g., LDL ≤3.5) - lower is better
  if (min === null) {
    if (value <= 0) return LOW_ZONE_END;
    if (value >= max) {
      const overflow = (value - max) / (max * OVERFLOW_FACTOR);
      return Math.min(100, NORMAL_ZONE_END + overflow * LOW_ZONE_END);
    }
    return LOW_ZONE_END + (value / max) * NORMAL_ZONE_WIDTH;
  }

  // Only lower bound (e.g., HDL ≥1) - higher is better
  if (max === null) {
    if (value < min) {
      const underflow = (min - value) / (min * OVERFLOW_FACTOR);
      return Math.max(0, LOW_ZONE_END - underflow * LOW_ZONE_END);
    }
    const visualMax = getVisualMax(min);
    const normalizedValue = Math.min(value, visualMax);
    return LOW_ZONE_END + ((normalizedValue - min) / (visualMax - min)) * NORMAL_ZONE_WIDTH;
  }

  // Both bounds defined
  const range = max - min;
  if (value < min) {
    return 0;
  }
  if (value > max) {
    return 100;
  }
  return LOW_ZONE_END + ((value - min) / range) * NORMAL_ZONE_WIDTH;
}

/**
 * Calculate optimal zone style for range bar visualization
 * @param {number|null} optimalMin - Optimal minimum value
 * @param {number|null} optimalMax - Optimal maximum value
 * @param {number|null} min - Reference range minimum
 * @param {number|null} max - Reference range maximum
 * @returns {object|null} CSS style object with left and width, or null if no optimal range
 */
export function getOptimalZoneStyle(optimalMin, optimalMax, min, max) {
  if (optimalMin === null || optimalMax === null) return null;

  const { LOW_ZONE_END, NORMAL_ZONE_WIDTH } = RANGE_BAR_CONSTANTS;

  if (min !== null && max !== null) {
    const range = max - min;
    return {
      left: `${LOW_ZONE_END + ((optimalMin - min) / range) * NORMAL_ZONE_WIDTH}%`,
      width: `${((optimalMax - optimalMin) / range) * NORMAL_ZONE_WIDTH}%`,
    };
  }

  if (min === null && max !== null) {
    return {
      left: `${LOW_ZONE_END + (optimalMin / max) * NORMAL_ZONE_WIDTH}%`,
      width: `${((optimalMax - optimalMin) / max) * NORMAL_ZONE_WIDTH}%`,
    };
  }

  if (max === null && min !== null) {
    const visualMax = getVisualMax(min);
    const range = visualMax - min;
    return {
      left: `${LOW_ZONE_END + ((optimalMin - min) / range) * NORMAL_ZONE_WIDTH}%`,
      width: `${((optimalMax - optimalMin) / range) * NORMAL_ZONE_WIDTH}%`,
    };
  }

  return null;
}
