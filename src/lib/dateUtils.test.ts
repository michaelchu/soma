import { describe, it, expect } from 'vitest';
import {
  getLocalDatetimeNow,
  formatDateForInput,
  formatISOForInput,
  toDatetimeLocalFormat,
  inputToISO,
  fromDatetimeLocalFormat,
  formatDate,
  formatTime,
  formatDateTime,
  formatDatetimeForId,
  startOfDay,
  endOfDay,
  daysAgo,
  getDateRange,
  isWithinDays,
  isDateInRange,
  getHour,
  isAM,
  isPM,
  isMorning,
  isAfternoon,
  isEvening,
  isInTimeOfDay,
  sortByDate,
  getCurrentTimezone,
  getTimezoneAbbreviation,
  isOtherTimezone,
  formatTimeString,
  formatDuration,
  formatDurationLong,
} from './dateUtils';

describe('dateUtils', () => {
  describe('getLocalDatetimeNow', () => {
    it('returns a datetime string in YYYY-MM-DDTHH:MM format', () => {
      const result = getLocalDatetimeNow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('formatDateForInput', () => {
    it('formats date for datetime-local input', () => {
      const date = new Date('2024-03-15T14:30:00');
      const result = formatDateForInput(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('formatISOForInput', () => {
    it('formats ISO string for datetime-local input', () => {
      const result = formatISOForInput('2024-03-15T14:30:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('toDatetimeLocalFormat (alias)', () => {
    it('is an alias for formatISOForInput', () => {
      expect(toDatetimeLocalFormat).toBe(formatISOForInput);
    });
  });

  describe('inputToISO', () => {
    it('converts datetime-local input to ISO string', () => {
      const result = inputToISO('2024-03-15T14:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('fromDatetimeLocalFormat (alias)', () => {
    it('is an alias for inputToISO', () => {
      expect(fromDatetimeLocalFormat).toBe(inputToISO);
    });
  });

  describe('formatDate', () => {
    it('formats date with default options', () => {
      const result = formatDate('2024-03-15');
      expect(result).toContain('Mar');
      expect(result).toContain('15');
    });

    it('includes year when includeYear is true', () => {
      const result = formatDate('2024-03-15', { includeYear: true });
      expect(result).toContain('2024');
    });

    it('excludes year when includeYear is false', () => {
      const result = formatDate('2024-03-15', { includeYear: false });
      expect(result).not.toContain('2024');
    });

    it('hides current year when hideCurrentYear is true', () => {
      const currentYear = new Date().getFullYear();
      const dateThisYear = `${currentYear}-06-15`;
      const result = formatDate(dateThisYear, { hideCurrentYear: true });
      expect(result).not.toContain(currentYear.toString());
    });

    it('shows non-current year when hideCurrentYear is true', () => {
      const pastYear = new Date().getFullYear() - 2;
      const datePastYear = `${pastYear}-06-15`;
      const result = formatDate(datePastYear, { hideCurrentYear: true });
      expect(result).toContain(pastYear.toString());
    });

    it('includes weekday when includeWeekday is true', () => {
      const result = formatDate('2024-03-15', { includeWeekday: true });
      expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
    });

    it('includes time when includeTime is true', () => {
      const result = formatDate('2024-03-15T14:30:00', { includeTime: true });
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('accepts Date object', () => {
      const result = formatDate(new Date('2024-03-15'));
      expect(result).toContain('Mar');
    });
  });

  describe('formatTime', () => {
    it('formats time from date string', () => {
      const result = formatTime('2024-03-15T14:30:00');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formats time from Date object', () => {
      const result = formatTime(new Date('2024-03-15T14:30:00'));
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('supports 24-hour format', () => {
      const result = formatTime('2024-03-15T14:30:00', { use24Hour: true });
      expect(result).toContain('14:30');
    });

    it('supports locale as string (backwards compatibility)', () => {
      const result = formatTime('2024-03-15T14:30:00', 'en-US');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDateTime', () => {
    it('returns object with date and time', () => {
      const result = formatDateTime('2024-03-15T14:30:00');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('time');
      expect(result.date).toContain('Mar');
      expect(result.time).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDatetimeForId', () => {
    it('formats datetime for markdown ID', () => {
      const result = formatDatetimeForId('2024-03-15T14:30:00');
      expect(result).toBe('2024-03-15 14:30');
    });

    it('pads single digit values', () => {
      const result = formatDatetimeForId('2024-01-05T09:05:00');
      expect(result).toBe('2024-01-05 09:05');
    });

    it('accepts Date object', () => {
      const date = new Date(2024, 2, 15, 14, 30); // Month is 0-indexed
      const result = formatDatetimeForId(date);
      expect(result).toBe('2024-03-15 14:30');
    });
  });

  describe('startOfDay', () => {
    it('returns date at midnight', () => {
      const result = startOfDay('2024-03-15T14:30:00');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('accepts Date object', () => {
      const result = startOfDay(new Date('2024-03-15T14:30:00'));
      expect(result.getHours()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('returns date at 23:59:59.999', () => {
      const result = endOfDay('2024-03-15T14:30:00');
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('daysAgo', () => {
    it('returns date N days ago at start of day', () => {
      const today = new Date();
      const result = daysAgo(7);

      const expected = new Date(today);
      expected.setDate(expected.getDate() - 7);

      expect(result.getDate()).toBe(expected.getDate());
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('returns today for 0 days', () => {
      const result = daysAgo(0);
      const today = new Date();
      expect(result.getDate()).toBe(today.getDate());
    });
  });

  describe('getDateRange', () => {
    it('returns null start for "all" range', () => {
      const { start, end } = getDateRange('all');
      expect(start).toBeNull();
      expect(end).toBeInstanceOf(Date);
    });

    it('returns correct range for numeric string', () => {
      const { start, end } = getDateRange('30');
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);

      const diffDays = Math.round((end.getTime() - start!.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(29); // 30 days inclusive of today
    });

    it('returns correct range for number', () => {
      const { start } = getDateRange(7);
      expect(start).toBeInstanceOf(Date);
      expect(start!.getHours()).toBe(0); // Start of day
    });
  });

  describe('isWithinDays', () => {
    it('returns true for date within range', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      expect(isWithinDays(recentDate, 7)).toBe(true);
    });

    it('returns false for date outside range', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      expect(isWithinDays(oldDate, 7)).toBe(false);
    });

    it('accepts string date', () => {
      const today = new Date().toISOString();
      expect(isWithinDays(today, 7)).toBe(true);
    });
  });

  describe('isDateInRange', () => {
    const start = new Date('2024-03-01');
    const end = new Date('2024-03-31');

    it('returns true for date within range', () => {
      expect(isDateInRange('2024-03-15', start, end)).toBe(true);
    });

    it('returns false for date before start', () => {
      expect(isDateInRange('2024-02-15', start, end)).toBe(false);
    });

    it('returns false for date after end', () => {
      expect(isDateInRange('2024-04-15', start, end)).toBe(false);
    });

    it('handles null start', () => {
      expect(isDateInRange('2020-01-01', null, end)).toBe(true);
    });

    it('handles null end', () => {
      expect(isDateInRange('2030-01-01', start, null)).toBe(true);
    });

    it('handles both null', () => {
      expect(isDateInRange('2024-03-15', null, null)).toBe(true);
    });
  });

  describe('getHour', () => {
    it('returns hour from string', () => {
      expect(getHour('2024-03-15T14:30:00')).toBe(14);
      expect(getHour('2024-03-15T00:00:00')).toBe(0);
      expect(getHour('2024-03-15T23:59:59')).toBe(23);
    });

    it('returns hour from Date object', () => {
      const date = new Date(2024, 2, 15, 10, 30);
      expect(getHour(date)).toBe(10);
    });
  });

  describe('isAM', () => {
    it('returns true for morning hours', () => {
      expect(isAM('2024-03-15T00:00:00')).toBe(true);
      expect(isAM('2024-03-15T06:00:00')).toBe(true);
      expect(isAM('2024-03-15T11:59:59')).toBe(true);
    });

    it('returns false for afternoon/evening hours', () => {
      expect(isAM('2024-03-15T12:00:00')).toBe(false);
      expect(isAM('2024-03-15T18:00:00')).toBe(false);
      expect(isAM('2024-03-15T23:59:59')).toBe(false);
    });
  });

  describe('isPM', () => {
    it('returns false for morning hours', () => {
      expect(isPM('2024-03-15T00:00:00')).toBe(false);
      expect(isPM('2024-03-15T11:59:59')).toBe(false);
    });

    it('returns true for afternoon/evening hours', () => {
      expect(isPM('2024-03-15T12:00:00')).toBe(true);
      expect(isPM('2024-03-15T18:00:00')).toBe(true);
    });
  });

  describe('isMorning', () => {
    it('returns true for 6:00-11:59', () => {
      expect(isMorning('2024-03-15T06:00:00')).toBe(true);
      expect(isMorning('2024-03-15T09:00:00')).toBe(true);
      expect(isMorning('2024-03-15T11:59:59')).toBe(true);
    });

    it('returns false outside morning hours', () => {
      expect(isMorning('2024-03-15T05:59:59')).toBe(false);
      expect(isMorning('2024-03-15T12:00:00')).toBe(false);
      expect(isMorning('2024-03-15T00:00:00')).toBe(false);
    });
  });

  describe('isAfternoon', () => {
    it('returns true for 12:00-17:59', () => {
      expect(isAfternoon('2024-03-15T12:00:00')).toBe(true);
      expect(isAfternoon('2024-03-15T15:00:00')).toBe(true);
      expect(isAfternoon('2024-03-15T17:59:59')).toBe(true);
    });

    it('returns false outside afternoon hours', () => {
      expect(isAfternoon('2024-03-15T11:59:59')).toBe(false);
      expect(isAfternoon('2024-03-15T18:00:00')).toBe(false);
    });
  });

  describe('isEvening', () => {
    it('returns true for 18:00-5:59', () => {
      expect(isEvening('2024-03-15T18:00:00')).toBe(true);
      expect(isEvening('2024-03-15T23:00:00')).toBe(true);
      expect(isEvening('2024-03-15T00:00:00')).toBe(true);
      expect(isEvening('2024-03-15T05:59:59')).toBe(true);
    });

    it('returns false during day hours', () => {
      expect(isEvening('2024-03-15T06:00:00')).toBe(false);
      expect(isEvening('2024-03-15T12:00:00')).toBe(false);
      expect(isEvening('2024-03-15T17:59:59')).toBe(false);
    });
  });

  describe('isInTimeOfDay', () => {
    it('returns true for "all" period', () => {
      expect(isInTimeOfDay('2024-03-15T12:00:00', 'all')).toBe(true);
    });

    it('handles "am" period', () => {
      expect(isInTimeOfDay('2024-03-15T10:00:00', 'am')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'am')).toBe(false);
    });

    it('handles "pm" period', () => {
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'pm')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T10:00:00', 'pm')).toBe(false);
    });

    it('handles "morning" period', () => {
      expect(isInTimeOfDay('2024-03-15T09:00:00', 'morning')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T05:00:00', 'morning')).toBe(false);
    });

    it('handles "afternoon" period', () => {
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'afternoon')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T18:00:00', 'afternoon')).toBe(false);
    });

    it('handles "evening" period', () => {
      expect(isInTimeOfDay('2024-03-15T20:00:00', 'evening')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'evening')).toBe(false);
    });

    it('returns true for unknown period', () => {
      expect(isInTimeOfDay('2024-03-15T12:00:00', 'unknown')).toBe(true);
    });
  });

  describe('sortByDate', () => {
    const items = [
      { date: '2024-03-15', value: 'c' },
      { date: '2024-03-10', value: 'a' },
      { date: '2024-03-20', value: 'b' },
    ];

    it('sorts descending by default', () => {
      const result = sortByDate(items);
      expect(result[0].value).toBe('b');
      expect(result[1].value).toBe('c');
      expect(result[2].value).toBe('a');
    });

    it('sorts ascending when specified', () => {
      const result = sortByDate(items, 'date', true);
      expect(result[0].value).toBe('a');
      expect(result[1].value).toBe('c');
      expect(result[2].value).toBe('b');
    });

    it('uses custom date key', () => {
      const customItems = [
        { createdAt: '2024-03-15', value: 'c' },
        { createdAt: '2024-03-10', value: 'a' },
        { createdAt: '2024-03-20', value: 'b' },
      ];
      const result = sortByDate(customItems, 'createdAt');
      expect(result[0].value).toBe('b');
    });

    it('does not mutate original array', () => {
      const original = [...items];
      sortByDate(items);
      expect(items).toEqual(original);
    });
  });

  describe('getCurrentTimezone', () => {
    it('returns a timezone string', () => {
      const result = getCurrentTimezone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getTimezoneAbbreviation', () => {
    it('returns abbreviation for valid timezone', () => {
      const result = getTimezoneAbbreviation('America/New_York');
      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('returns timezone string for invalid timezone', () => {
      const result = getTimezoneAbbreviation('Invalid/Timezone');
      expect(result).toBe('Invalid/Timezone');
    });
  });

  describe('isOtherTimezone', () => {
    it('returns false for null', () => {
      expect(isOtherTimezone(null)).toBe(false);
    });

    it('returns false for current timezone', () => {
      const current = getCurrentTimezone();
      expect(isOtherTimezone(current)).toBe(false);
    });

    it('returns true for different timezone', () => {
      const current = getCurrentTimezone();
      const other = current === 'UTC' ? 'America/New_York' : 'UTC';
      expect(isOtherTimezone(other)).toBe(true);
    });
  });

  describe('formatTimeString', () => {
    it('returns null for null input', () => {
      expect(formatTimeString(null)).toBeNull();
    });

    it('formats morning time', () => {
      expect(formatTimeString('09:15')).toBe('9:15 AM');
    });

    it('formats afternoon time', () => {
      expect(formatTimeString('14:30')).toBe('2:30 PM');
    });

    it('formats midnight', () => {
      expect(formatTimeString('00:00')).toBe('12:00 AM');
    });

    it('formats noon', () => {
      expect(formatTimeString('12:00')).toBe('12:00 PM');
    });

    it('formats late night time', () => {
      expect(formatTimeString('23:30')).toBe('11:30 PM');
    });

    it('handles time without minutes', () => {
      expect(formatTimeString('14')).toBe('2:00 PM');
    });

    it('returns original for invalid format', () => {
      expect(formatTimeString('invalid')).toBe('invalid');
    });
  });

  describe('formatDuration', () => {
    it('formats minutes under an hour', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(45)).toBe('45m');
    });

    it('formats exact hours', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(75)).toBe('1h 15m');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });
  });

  describe('formatDurationLong', () => {
    it('formats minutes with "min" label', () => {
      expect(formatDurationLong(30)).toBe('30 min');
      expect(formatDurationLong(45)).toBe('45 min');
    });

    it('formats exact hours', () => {
      expect(formatDurationLong(60)).toBe('1h');
      expect(formatDurationLong(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatDurationLong(75)).toBe('1h 15m');
      expect(formatDurationLong(90)).toBe('1h 30m');
    });
  });
});
