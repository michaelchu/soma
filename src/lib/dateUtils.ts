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
 * Get the current date formatted for date input (YYYY-MM-DD)
 */
export function getLocalDateNow(): string {
  return toLocalDateString(new Date());
}

/**
 * Convert a Date object to a local YYYY-MM-DD string.
 * This avoids the timezone shift that occurs with toISOString().
 *
 * IMPORTANT: Always use this instead of date.toISOString().split('T')[0]
 * because toISOString() converts to UTC, which can shift the date by a day
 * for users in timezones west of UTC (e.g., EST, PST).
 *
 * Example: At 11pm EST on Feb 2nd:
 *   - toISOString() returns "2026-02-03T04:00:00Z" (wrong date!)
 *   - toLocalDateString() returns "2026-02-02" (correct local date)
 */
export function toLocalDateString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

/**
 * Get the current time of day category based on the current hour
 * Morning: 6am-12pm, Afternoon: 12pm-6pm, Evening: 6pm-6am
 */
export function getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get display label for a time of day category
 */
export function getTimeOfDayLabel(timeOfDay: 'morning' | 'afternoon' | 'evening'): string {
  switch (timeOfDay) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
  }
}

/**
 * Calculate duration in minutes from start and end times (HH:MM format)
 * Handles overnight periods (end time before start time)
 */
export function calculateDurationFromTimes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // If end is before start, it's overnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
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
 * Parse a date string, handling date-only strings (YYYY-MM-DD) as local dates
 * to avoid timezone issues where UTC midnight becomes the previous day in local time
 */
function parseDate(date: DateInput): Date {
  if (typeof date !== 'string') return date;

  // Check if it's a date-only string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Parse as local date by using date components directly
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // For full ISO strings or other formats, use standard parsing
  return new Date(date);
}

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

  const dateObj = parseDate(date);
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
 * Calculate the start date for a rolling period
 * Internal helper to avoid duplication
 */
function calculatePeriodStart(range: string | number, fromDate: Date = new Date()): Date | null {
  const start = new Date(fromDate);

  if (typeof range === 'string') {
    if (range === '1w') {
      start.setDate(start.getDate() - 6); // -6 because today counts as day 1
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (range === '1m') {
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (range === '3m') {
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    // Fallback: try parsing as number of days
    const days = parseInt(range, 10);
    if (!isNaN(days)) {
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      return start;
    }
  }

  if (typeof range === 'number') {
    start.setDate(start.getDate() - (range - 1));
    start.setHours(0, 0, 0, 0);
    return start;
  }

  return null;
}

/**
 * Get date range boundaries based on rolling periods
 * Supports: '1w' (rolling 7 days), '1m' (rolling 1 month), '3m' (rolling 3 months), 'all', or number of days
 */
export function getDateRange(range: string | number): { start: Date | null; end: Date } {
  const end = new Date();

  if (range === 'all') {
    return { start: null, end };
  }

  const start = calculatePeriodStart(range);
  return { start, end };
}

/**
 * Get date range boundaries for the previous equivalent period
 * e.g., if range is '1m', returns the boundaries for 1-2 months ago
 * Supports: '1w', '1m', '3m', or number of days
 */
export function getPreviousDateRange(range: string | number): {
  start: Date | null;
  end: Date | null;
} {
  if (range === 'all') {
    return { start: null, end: null };
  }

  // Current period start becomes the previous period end
  const currentStart = calculatePeriodStart(range);
  if (!currentStart) {
    return { start: null, end: null };
  }

  const previousEnd = new Date(currentStart);
  previousEnd.setHours(0, 0, 0, 0);

  // Calculate previous period start (same offset from current start)
  const previousStart = calculatePeriodStart(range, currentStart);

  return { start: previousStart, end: previousEnd };
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

/**
 * Get the current user's IANA timezone identifier
 */
export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get a short timezone abbreviation from IANA timezone
 * e.g., 'America/New_York' -> 'EST' or 'EDT' depending on DST
 */
export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
  const d = date || new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(d);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Check if a timezone differs from the current user's timezone
 */
export function isOtherTimezone(timezone: string | null): boolean {
  if (!timezone) return false;
  return timezone !== getCurrentTimezone();
}

/**
 * Format a time string (HH:MM) from 24-hour to 12-hour format
 * e.g., "23:30" -> "11:30 PM", "09:15" -> "9:15 AM"
 */
export function formatTimeString(timeStr: string | null): string | null {
  if (!timeStr) return null;

  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';

  if (isNaN(hour)) return timeStr;

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return `${hour12}:${minute} ${period}`;
}

/**
 * Format duration in minutes to readable string
 * @param minutes Duration in minutes
 * @returns Formatted string (e.g., "45m", "1h", "1h 15m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format duration with full "min" label for short durations
 * @param minutes Duration in minutes
 * @returns Formatted string (e.g., "45 min", "1h", "1h 15m")
 */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}
