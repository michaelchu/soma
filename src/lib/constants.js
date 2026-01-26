/**
 * Shared application constants
 * Centralizes magic numbers with documentation
 */

/**
 * Touch interaction thresholds for swipeable components
 */
export const TOUCH_CONSTANTS = {
  /** Minimum swipe distance (px) to reveal action button */
  SWIPE_THRESHOLD: 80,
  /** Swipe distance (px) to trigger delete action */
  DELETE_THRESHOLD: 150,
  /** Duration (ms) to trigger long press action */
  LONG_PRESS_DURATION: 500,
  /** Movement threshold (px) to cancel long press */
  MOVEMENT_THRESHOLD: 10,
};

/**
 * Blood pressure measurement limits
 * Based on clinical guidelines for valid readings
 */
export const BP_LIMITS = {
  systolic: { min: 60, max: 250 },
  diastolic: { min: 40, max: 150 },
  pulse: { min: 30, max: 220 },
};

/**
 * Range bar visualization constants
 * Defines the layout zones for metric range bars
 */
export const RANGE_BAR_CONSTANTS = {
  /** End of low zone (0-15%) */
  LOW_ZONE_END: 15,
  /** End of normal zone (15-85%) */
  NORMAL_ZONE_END: 85,
  /** Width of normal zone (85 - 15 = 70%) */
  NORMAL_ZONE_WIDTH: 70,
  /** Factor for showing overflow beyond bounds */
  OVERFLOW_FACTOR: 0.3,
};

/**
 * UI layout constants
 */
export const UI_CONSTANTS = {
  /** Scroll threshold (px) to show sticky header border */
  SCROLL_THRESHOLD: 8,
  /** Navbar height (px) for sticky positioning */
  NAVBAR_HEIGHT: 49,
};

/**
 * Date/time filter options
 */
export const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export const TIME_OF_DAY_OPTIONS = [
  { value: 'all', label: 'All times' },
  { value: 'am', label: 'AM' },
  { value: 'pm', label: 'PM' },
  { value: 'morning', label: 'Morning (6-12)' },
  { value: 'afternoon', label: 'Afternoon (12-18)' },
  { value: 'evening', label: 'Evening (18-6)' },
];
