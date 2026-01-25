/**
 * Centralized date utilities
 * Provides consistent date handling across the application
 */

/**
 * Get current datetime adjusted for local timezone (for datetime-local inputs)
 * @returns {string} ISO string sliced to datetime-local format (YYYY-MM-DDTHH:mm)
 */
export function getLocalDatetimeNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/**
 * Convert ISO datetime to datetime-local input format
 * @param {string} isoString - ISO datetime string
 * @returns {string} Formatted for datetime-local input
 */
export function toDatetimeLocalFormat(isoString) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

/**
 * Convert datetime-local input value to ISO string
 * @param {string} localDatetime - Value from datetime-local input
 * @returns {string} ISO datetime string
 */
export function fromDatetimeLocalFormat(localDatetime) {
  return new Date(localDatetime).toISOString();
}

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Include time (default: false)
 * @param {boolean} options.includeYear - Include year (default: auto based on current year)
 * @param {boolean} options.includeWeekday - Include weekday (default: false)
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const { includeTime = false, includeYear, includeWeekday = false, locale = 'en-US' } = options;

  const d = new Date(date);
  const isCurrentYear = d.getFullYear() === new Date().getFullYear();
  const showYear = includeYear ?? !isCurrentYear;

  const dateOptions = {
    month: 'short',
    day: 'numeric',
    ...(showYear && { year: 'numeric' }),
    ...(includeWeekday && { weekday: 'short' }),
    ...(includeTime && { hour: 'numeric', minute: '2-digit' }),
  };

  return d.toLocaleDateString(locale, dateOptions);
}

/**
 * Format a time for display
 * @param {string|Date} date - Date to extract time from
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted time string
 */
export function formatTime(date, locale = 'en-US') {
  return new Date(date).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
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
 * Get the hour from a date for time-of-day filtering
 * @param {string|Date} date - Date to extract hour from
 * @returns {number} Hour (0-23)
 */
export function getHour(date) {
  return new Date(date).getHours();
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
