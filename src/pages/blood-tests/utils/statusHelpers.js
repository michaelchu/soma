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
 * Calculate position of value within range for visualization (0-100%)
 * @param {number} value - The metric value
 * @param {number|null} min - Minimum reference range value
 * @param {number|null} max - Maximum reference range value
 * @returns {number} Position percentage (0-100)
 */
export function getPositionInRange(value, min, max) {
  if (min === null && max === null) return 50;
  if (min === null) return value <= max ? (value / max) * 50 : 50 + ((value - max) / max) * 50;
  if (max === null) return value >= min ? 50 + ((value - min) / min) * 25 : (value / min) * 50;
  if (value < min)
    return Math.max(0, ((value - (min - (max - min) * 0.3)) / ((max - min) * 0.3)) * 15);
  if (value > max) return Math.min(100, 85 + ((value - max) / ((max - min) * 0.3)) * 15);
  return 15 + ((value - min) / (max - min)) * 70;
}
