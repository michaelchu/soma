import { RANGE_BAR_CONSTANTS } from '@/lib/constants';

/**
 * Status Helper Functions
 * Functions for determining and calculating metric statuses
 */

/**
 * Determine if a metric value is low, normal, or high
 */
export function getStatus(
  value: number,
  min: number | null | undefined,
  max: number | null | undefined
): 'low' | 'normal' | 'high' {
  if (min != null && value < min) return 'low';
  if (max != null && value > max) return 'high';
  return 'normal';
}

/**
 * Get the visual max for ranges with only a lower bound
 */
export function getVisualMax(min: number): number {
  return min * 2;
}

/**
 * Calculate position of value within range for visualization (0-100%)
 */
export function getPositionInRange(value: number, min: number | null, max: number | null): number {
  const { LOW_ZONE_END, NORMAL_ZONE_END, NORMAL_ZONE_WIDTH, OVERFLOW_FACTOR } = RANGE_BAR_CONSTANTS;

  if (min === null && max === null) return 50;

  // Only upper bound (e.g., LDL ≤3.5) - lower is better
  if (min === null && max !== null) {
    if (value <= 0) return LOW_ZONE_END;
    if (value >= max) {
      const overflow = (value - max) / (max * OVERFLOW_FACTOR);
      return Math.min(100, NORMAL_ZONE_END + overflow * LOW_ZONE_END);
    }
    return LOW_ZONE_END + (value / max) * NORMAL_ZONE_WIDTH;
  }

  // Only lower bound (e.g., HDL ≥1) - higher is better
  if (max === null && min !== null) {
    if (value < min) {
      const underflow = (min - value) / (min * OVERFLOW_FACTOR);
      return Math.max(0, LOW_ZONE_END - underflow * LOW_ZONE_END);
    }
    const visualMax = getVisualMax(min);
    const normalizedValue = Math.min(value, visualMax);
    return LOW_ZONE_END + ((normalizedValue - min) / (visualMax - min)) * NORMAL_ZONE_WIDTH;
  }

  // Both bounds defined (at this point, neither can be null)
  if (min === null || max === null) return 50;
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
 */
export function getOptimalZoneStyle(
  optimalMin: number | null,
  optimalMax: number | null,
  min: number | null,
  max: number | null
): { left: string; width: string } | null {
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
