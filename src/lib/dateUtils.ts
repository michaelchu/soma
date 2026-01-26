/**
 * Date utility functions
 * Centralizes all date handling to avoid manual timezone juggling throughout the codebase
 */

type DateInput = Date | string;

interface FormatDateOptions {
  includeYear?: boolean;
  hideCurrentYear?: boolean;
  includeTime?: boolean;
  includeWeekday?: boolean;
  locale?: string;
}

interface FormatTimeOptions {
  use24Hour?: boolean;
  locale?: string;
}

/**
 * Get the current datetime formatted for datetime-local input
 */
export function getLocalDatetimeNow(): string {
  const now = new Date();
  return formatDateForInput(now);
}

/**
 * Format a Date object for datetime-local input
 */
export function formatDateForInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

/**
 * Format an ISO datetime string for datetime-local input
 */
export function formatISOForInput(isoString: string): string {
  return formatDateForInput(new Date(isoString));
}

// Alias for backwards compatibility
export const toDatetimeLocalFormat = formatISOForInput;

/**
 * Convert a datetime-local input value to ISO string
 */
export function inputToISO(inputValue: string): string {
  return new Date(inputValue).toISOString();
}

// Alias for backwards compatibility
export const fromDatetimeLocalFormat = inputToISO;

/**
 * Format a date for display
 */
export function formatDate(date: DateInput, options: FormatDateOptions = {}): string {
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
  let showYear: boolean;
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
 */
export function formatTime(date: DateInput, options: FormatTimeOptions | string = {}): string {
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
 */
export function formatDateTime(
  date: DateInput,
  options: FormatDateOptions & FormatTimeOptions = {}
): { date: string; time: string } {
  return {
    date: formatDate(date, options),
    time: formatTime(date, options),
  };
}

/**
 * Format datetime for unique ID (e.g., for markdown anchors)
 */
export function formatDatetimeForId(datetime: DateInput): string {
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
 */
export function startOfDay(date: DateInput): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Get the end of a day
 */
export function endOfDay(date: DateInput): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Get date N days ago from today
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return startOfDay(date);
}

/**
 * Get date range boundaries
 */
export function getDateRange(range: string | number): { start: Date | null; end: Date } {
  const end = new Date();

  if (range === 'all') {
    return { start: null, end };
  }

  const days = typeof range === 'string' ? parseInt(range, 10) : range;
  const start = new Date();
  start.setDate(end.getDate() - days);

  return { start, end };
}

/**
 * Check if a date is within a range of days from today
 */
export function isWithinDays(date: DateInput, days: number): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const cutoff = daysAgo(days);
  return dateObj >= cutoff;
}

/**
 * Check if a date falls within a range
 */
export function isDateInRange(date: DateInput, start: Date | null, end: Date | null): boolean {
  const d = new Date(date);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

/**
 * Get the hour of a date (0-23)
 */
export function getHour(date: DateInput): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getHours();
}

/**
 * Check if a time is in the AM (before noon)
 */
export function isAM(date: DateInput): boolean {
  return getHour(date) < 12;
}

/**
 * Check if a time is in the PM (noon or after)
 */
export function isPM(date: DateInput): boolean {
  return getHour(date) >= 12;
}

/**
 * Check if a time is in the morning (6:00-11:59)
 */
export function isMorning(date: DateInput): boolean {
  const hour = getHour(date);
  return hour >= 6 && hour < 12;
}

/**
 * Check if a time is in the afternoon (12:00-17:59)
 */
export function isAfternoon(date: DateInput): boolean {
  const hour = getHour(date);
  return hour >= 12 && hour < 18;
}

/**
 * Check if a time is in the evening (18:00-5:59)
 */
export function isEvening(date: DateInput): boolean {
  const hour = getHour(date);
  return hour >= 18 || hour < 6;
}

/**
 * Check if a date falls within a time-of-day period
 */
export function isInTimeOfDay(date: DateInput, period: string): boolean {
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
 */
export function sortByDate<T extends Record<string, unknown>>(
  items: T[],
  dateKey: keyof T = 'date' as keyof T,
  ascending = false
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[dateKey] as string);
    const dateB = new Date(b[dateKey] as string);
    return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });
}
