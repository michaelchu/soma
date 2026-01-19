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
 * The bar layout is: [low zone 0-15%] [normal zone 15-85%] [high zone 85-100%]
 * @param {number} value - The metric value
 * @param {number|null} min - Minimum reference range value
 * @param {number|null} max - Maximum reference range value
 * @returns {number} Position percentage (0-100)
 */
export function getPositionInRange(value, min, max) {
  if (min === null && max === null) return 50;

  // Only upper bound (e.g., LDL ≤3.5) - lower is better
  // Normal zone is 0 to max, visualized in the 15-85% range
  if (min === null) {
    if (value <= 0) return 15;
    if (value >= max) {
      // Above max - position in high zone (85-100%)
      const overflow = (value - max) / (max * 0.3);
      return Math.min(100, 85 + overflow * 15);
    }
    // Within normal range - position in normal zone (15-85%)
    return 15 + (value / max) * 70;
  }

  // Only lower bound (e.g., HDL ≥1) - higher is better
  // Normal zone is min to infinity, visualized in the 15-85% range
  if (max === null) {
    if (value < min) {
      // Below min - position in low zone (0-15%)
      const underflow = (min - value) / (min * 0.3);
      return Math.max(0, 15 - underflow * 15);
    }
    // Within normal range - use min as anchor at 15%, scale based on reasonable upper display
    // Use 2x min as the visual max for positioning
    const visualMax = min * 2;
    const normalizedValue = Math.min(value, visualMax);
    return 15 + ((normalizedValue - min) / (visualMax - min)) * 70;
  }

  // Both bounds defined
  if (value < min) {
    return Math.max(0, ((value - (min - (max - min) * 0.3)) / ((max - min) * 0.3)) * 15);
  }
  if (value > max) {
    return Math.min(100, 85 + ((value - max) / ((max - min) * 0.3)) * 15);
  }
  return 15 + ((value - min) / (max - min)) * 70;
}
