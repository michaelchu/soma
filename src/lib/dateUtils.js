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
 * @param {string} isoString - ISO datetime string
 * @returns {string} ISO datetime string without timezone (YYYY-MM-DDTHH:mm)
 */
export function formatISOForInput(isoString) {
  return formatDateForInput(new Date(isoString));
}

/**
 * Convert a datetime-local input value to ISO string
 * @param {string} inputValue - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns {string} Full ISO datetime string
 */
export function inputToISO(inputValue) {
  return new Date(inputValue).toISOString();
}

/**
 * Format a date for display
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Formatting options
 * @param {boolean} options.includeYear - Whether to include year (default: true)
 * @param {boolean} options.hideCurrentYear - Hide year if it's the current year
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const { includeYear = true, hideCurrentYear = false, locale = 'en-US' } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const showYear = includeYear && !(hideCurrentYear && dateObj.getFullYear() === now.getFullYear());

  return dateObj.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(showYear && { year: 'numeric' }),
  });
}

/**
 * Format a time for display
 * @param {Date|string} date - Date object or ISO string
 * @param {object} options - Formatting options
 * @param {boolean} options.use24Hour - Use 24-hour format (default: false)
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted time string
 */
export function formatTime(date, options = {}) {
  const { use24Hour = false, locale = 'en-US' } = options;

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
