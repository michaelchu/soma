/**
 * Date utility functions
 * Centralizes all date handling to avoid manual timezone juggling throughout the codebase
 */

/**
 * Get the current datetime formatted for datetime-local input
 * @returns {string} ISO datetime string without timezone (YYYY-MM-DDTHH:mm)
 */
export function getLocalDatetimeNow() {
  const now = new Date();
  return formatDateForInput(now);
}

/**
 * Format a Date object for datetime-local input
 * @param {Date} date - Date object to format
 * @returns {string} ISO datetime string without timezone (YYYY-MM-DDTHH:mm)
 */
export function formatDateForInput(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

/**
 * Format an ISO datetime string for datetime-local input
 * Alias: toDatetimeLocalFormat
 * @param {string} isoString - ISO datetime string
 * @returns {string} ISO datetime string without timezone (YYYY-MM-DDTHH:mm)
 */
export function formatISOForInput(isoString) {
  return formatDateForInput(new Date(isoString));
}

// Alias for backwards compatibility
export const toDatetimeLocalFormat = formatISOForInput;

/**
 * Convert a datetime-local input value to ISO string
 * Alias: fromDatetimeLocalFormat
 * @param {string} inputValue - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns {string} Full ISO datetime string
 */
export function inputToISO(inputValue) {
  return new Date(inputValue).toISOString();
}

// Alias for backwards compatibility
export const fromDatetimeLocalFormat = inputToISO;

/**
 * Format a date for display
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Formatting options
 * @param {boolean} options.includeYear - Whether to include year (default: auto based on current year)
 * @param {boolean} options.hideCurrentYear - Hide year if it's the current year
 * @param {boolean} options.includeTime - Include time (default: false)
 * @param {boolean} options.includeWeekday - Include weekday (default: false)
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const {
    includeYear,
    hideCurrentYear = false,
    includeTime = false,
    includeWeekday = false,
    locale = 'en-US',
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isCurrentYear = dateObj.getFullYear() === now.getFullYear();

  // Determine if year should be shown
  let showYear;
  if (includeYear !== undefined) {
    showYear = includeYear;
  } else if (hideCurrentYear) {
    showYear = !isCurrentYear;
  } else {
    showYear = !isCurrentYear; // Default: hide current year
  }

  return dateObj.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(showYear && { year: 'numeric' }),
    ...(includeWeekday && { weekday: 'short' }),
    ...(includeTime && { hour: 'numeric', minute: '2-digit' }),
  });
}

/**
 * Format a time for display
 * @param {Date|string} date - Date object or ISO string
 * @param {object|string} options - Formatting options or locale string
 * @param {boolean} options.use24Hour - Use 24-hour format (default: false)
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted time string
 */
export function formatTime(date, options = {}) {
  // Support passing locale as string for backwards compatibility
  const opts = typeof options === 'string' ? { locale: options } : options;
  const { use24Hour = false, locale = 'en-US' } = opts;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(use24Hour && { hour12: false }),
  });
}

/**
 * Format date and time together
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Formatting options
 * @returns {object} Object with formatted date and time strings
 */
export function formatDateTime(date, options = {}) {
  return {
    date: formatDate(date, options),
    time: formatTime(date, options),
  };
}

/**
 * Format datetime for unique ID (e.g., for markdown anchors)
 * @param {string|Date} datetime - Datetime to format
 * @returns {string} Formatted string like "2024-01-15 09:30"
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
 * Get the start of a day
 * @param {Date|string} date - Date object or ISO string
 * @returns {Date} Date object set to start of day (00:00:00.000)
 */
export function startOfDay(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Get the end of a day
 * @param {Date|string} date - Date object or ISO string
 * @returns {Date} Date object set to end of day (23:59:59.999)
 */
export function endOfDay(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Get date N days ago from today
 * @param {number} days - Number of days ago
 * @returns {Date} Date object
 */
export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return startOfDay(date);
}

/**
 * Get date range boundaries
 * @param {string|number} range - Range identifier ('7', '30', '90', 'all')
 * @returns {{start: Date|null, end: Date}} Start and end dates
 */
export function getDateRange(range) {
  const end = new Date();

  if (range === 'all') {
    return { start: null, end };
  }

  const days = parseInt(range, 10);
  const start = new Date();
  start.setDate(end.getDate() - days);

  return { start, end };
}

/**
 * Check if a date is within a range of days from today
 * @param {Date|string} date - Date to check
 * @param {number} days - Number of days (e.g., 7 for "last 7 days")
 * @returns {boolean}
 */
export function isWithinDays(date, days) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const cutoff = daysAgo(days);
  return dateObj >= cutoff;
}

/**
 * Check if a date falls within a range
 * @param {string|Date} date - Date to check
 * @param {Date|null} start - Start of range (null for no lower bound)
 * @param {Date|null} end - End of range (null for no upper bound)
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(date, start, end) {
  const d = new Date(date);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

/**
 * Get the hour of a date (0-23)
 * @param {Date|string} date - Date object or ISO string
 * @returns {number} Hour (0-23)
 */
export function getHour(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getHours();
}

/**
 * Check if a time is in the AM (before noon)
 * @param {Date|string} date - Date object or ISO string
 * @returns {boolean}
 */
export function isAM(date) {
  return getHour(date) < 12;
}

/**
 * Check if a time is in the PM (noon or after)
 * @param {Date|string} date - Date object or ISO string
 * @returns {boolean}
 */
export function isPM(date) {
  return getHour(date) >= 12;
}

/**
 * Check if a time is in the morning (6:00-11:59)
 * @param {Date|string} date - Date object or ISO string
 * @returns {boolean}
 */
export function isMorning(date) {
  const hour = getHour(date);
  return hour >= 6 && hour < 12;
}

/**
 * Check if a time is in the afternoon (12:00-17:59)
 * @param {Date|string} date - Date object or ISO string
 * @returns {boolean}
 */
export function isAfternoon(date) {
  const hour = getHour(date);
  return hour >= 12 && hour < 18;
}

/**
 * Check if a time is in the evening (18:00-5:59)
 * @param {Date|string} date - Date object or ISO string
 * @returns {boolean}
 */
export function isEvening(date) {
  const hour = getHour(date);
  return hour >= 18 || hour < 6;
}

/**
 * Check if a date falls within a time-of-day period
 * @param {string|Date} date - Date to check
 * @param {string} period - Period: 'all', 'am', 'pm', 'morning', 'afternoon', 'evening'
 * @returns {boolean} True if date falls within period
 */
export function isInTimeOfDay(date, period) {
  if (period === 'all') return true;

  const hour = getHour(date);

  switch (period) {
    case 'am':
      return hour < 12;
    case 'pm':
      return hour >= 12;
    case 'morning':
      return hour >= 6 && hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 18;
    case 'evening':
      return hour >= 18;
    default:
      return true;
  }
}

/**
 * Sort an array of objects by date
 * @param {Array} items - Array of objects with date property
 * @param {string} dateKey - Key of the date property
 * @param {boolean} ascending - Sort ascending (oldest first) if true
 * @returns {Array} Sorted array
 */
export function sortByDate(items, dateKey = 'date', ascending = false) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[dateKey]);
    const dateB = new Date(b[dateKey]);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}
