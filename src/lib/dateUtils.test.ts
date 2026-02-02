import { describe, it, expect } from 'vitest';
import {
  getLocalDatetimeNow,
  formatDateForInput,
  formatISOForInput,
  inputToISO,
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
  isMorning,
  isAfternoon,
  isEvening,
  isInTimeOfDay,
  sortByDate,
  getCurrentTimezone,
  isOtherTimezone,
  formatTimeString,
  formatDuration,
} from './dateUtils';

describe('dateUtils', () => {
  describe('datetime formatting', () => {
    it('getLocalDatetimeNow returns YYYY-MM-DDTHH:MM format', () => {
      expect(getLocalDatetimeNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('formatDateForInput formats Date for datetime-local input', () => {
      const date = new Date('2024-03-15T14:30:00');
      expect(formatDateForInput(date)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('formatISOForInput formats ISO string for datetime-local input', () => {
      expect(formatISOForInput('2024-03-15T14:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('inputToISO converts datetime-local input to ISO string', () => {
      expect(inputToISO('2024-03-15T14:30')).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });
  });

  describe('formatDate', () => {
    it('formats date with various options', () => {
      expect(formatDate('2024-03-15')).toContain('Mar');
      expect(formatDate('2024-03-15', { includeYear: true })).toContain('2024');
      expect(formatDate('2024-03-15', { includeYear: false })).not.toContain('2024');
      expect(formatDate('2024-03-15', { includeWeekday: true })).toMatch(
        /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/
      );
      expect(formatDate('2024-03-15T14:30:00', { includeTime: true })).toMatch(/\d{1,2}:\d{2}/);
    });

    it('hides current year when hideCurrentYear is true', () => {
      const currentYear = new Date().getFullYear();
      const pastYear = currentYear - 2;
      expect(formatDate(`${currentYear}-06-15`, { hideCurrentYear: true })).not.toContain(
        currentYear.toString()
      );
      expect(formatDate(`${pastYear}-06-15`, { hideCurrentYear: true })).toContain(
        pastYear.toString()
      );
    });
  });

  describe('formatTime', () => {
    it('formats time from string and Date', () => {
      expect(formatTime('2024-03-15T14:30:00')).toMatch(/\d{1,2}:\d{2}/);
      expect(formatTime(new Date('2024-03-15T14:30:00'))).toMatch(/\d{1,2}:\d{2}/);
    });

    it('supports 24-hour format', () => {
      expect(formatTime('2024-03-15T14:30:00', { use24Hour: true })).toContain('14:30');
    });
  });

  describe('formatDateTime', () => {
    it('returns object with date and time', () => {
      const result = formatDateTime('2024-03-15T14:30:00');
      expect(result.date).toContain('Mar');
      expect(result.time).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDatetimeForId', () => {
    it('formats datetime with padding', () => {
      expect(formatDatetimeForId('2024-03-15T14:30:00')).toBe('2024-03-15 14:30');
      expect(formatDatetimeForId('2024-01-05T09:05:00')).toBe('2024-01-05 09:05');
      expect(formatDatetimeForId(new Date(2024, 2, 15, 14, 30))).toBe('2024-03-15 14:30');
    });
  });

  describe('day boundaries', () => {
    it('startOfDay returns midnight', () => {
      const result = startOfDay('2024-03-15T14:30:00');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it('endOfDay returns 23:59:59.999', () => {
      const result = endOfDay('2024-03-15T14:30:00');
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    it('daysAgo returns date N days ago at start of day', () => {
      const result = daysAgo(7);
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expect(result.getDate()).toBe(expected.getDate());
      expect(result.getHours()).toBe(0);
    });
  });

  describe('getDateRange', () => {
    it('returns null start for "all" range', () => {
      const { start, end } = getDateRange('all');
      expect(start).toBeNull();
      expect(end).toBeInstanceOf(Date);
    });

    it('returns correct range for numeric values', () => {
      const { start, end } = getDateRange('30');
      expect(start).toBeInstanceOf(Date);
      const diffDays = Math.round((end.getTime() - start!.getTime()) / (1000 * 60 * 60 * 24));
      // For a 30-day range: start is set 29 days back from today
      // The time span from start (midnight) to end (current time) is ~30 days
      expect(diffDays).toBe(30);
    });
  });

  describe('isWithinDays', () => {
    it('checks if date is within N days', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      expect(isWithinDays(recentDate, 7)).toBe(true);
      expect(isWithinDays(oldDate, 7)).toBe(false);
      expect(isWithinDays(new Date().toISOString(), 7)).toBe(true);
    });
  });

  describe('isDateInRange', () => {
    const start = new Date('2024-03-01');
    const end = new Date('2024-03-31');

    it('checks if date is within range', () => {
      expect(isDateInRange('2024-03-15', start, end)).toBe(true);
      expect(isDateInRange('2024-02-15', start, end)).toBe(false);
      expect(isDateInRange('2024-04-15', start, end)).toBe(false);
    });

    it('handles null boundaries', () => {
      expect(isDateInRange('2020-01-01', null, end)).toBe(true);
      expect(isDateInRange('2030-01-01', start, null)).toBe(true);
      expect(isDateInRange('2024-03-15', null, null)).toBe(true);
    });
  });

  describe('time of day functions', () => {
    it('getHour returns hour from date', () => {
      expect(getHour('2024-03-15T14:30:00')).toBe(14);
      expect(getHour('2024-03-15T00:00:00')).toBe(0);
    });

    it('isAM returns true for hours before noon', () => {
      expect(isAM('2024-03-15T06:00:00')).toBe(true);
      expect(isAM('2024-03-15T12:00:00')).toBe(false);
    });

    it('isMorning returns true for 6:00-11:59', () => {
      expect(isMorning('2024-03-15T09:00:00')).toBe(true);
      expect(isMorning('2024-03-15T05:59:59')).toBe(false);
      expect(isMorning('2024-03-15T12:00:00')).toBe(false);
    });

    it('isAfternoon returns true for 12:00-17:59', () => {
      expect(isAfternoon('2024-03-15T15:00:00')).toBe(true);
      expect(isAfternoon('2024-03-15T11:59:59')).toBe(false);
      expect(isAfternoon('2024-03-15T18:00:00')).toBe(false);
    });

    it('isEvening returns true for 18:00-5:59', () => {
      expect(isEvening('2024-03-15T20:00:00')).toBe(true);
      expect(isEvening('2024-03-15T00:00:00')).toBe(true);
      expect(isEvening('2024-03-15T06:00:00')).toBe(false);
    });
  });

  describe('isInTimeOfDay', () => {
    it('filters by time period', () => {
      expect(isInTimeOfDay('2024-03-15T12:00:00', 'all')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T10:00:00', 'am')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'am')).toBe(false);
      expect(isInTimeOfDay('2024-03-15T09:00:00', 'morning')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T14:00:00', 'afternoon')).toBe(true);
      expect(isInTimeOfDay('2024-03-15T20:00:00', 'evening')).toBe(true);
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
      expect(result.map((i) => i.value)).toEqual(['b', 'c', 'a']);
    });

    it('sorts ascending when specified', () => {
      const result = sortByDate(items, 'date', true);
      expect(result.map((i) => i.value)).toEqual(['a', 'c', 'b']);
    });

    it('uses custom date key', () => {
      const customItems = [
        { createdAt: '2024-03-15', value: 'c' },
        { createdAt: '2024-03-20', value: 'b' },
      ];
      expect(sortByDate(customItems, 'createdAt')[0].value).toBe('b');
    });

    it('does not mutate original array', () => {
      const original = [...items];
      sortByDate(items);
      expect(items).toEqual(original);
    });
  });

  describe('timezone functions', () => {
    it('getCurrentTimezone returns a string', () => {
      expect(typeof getCurrentTimezone()).toBe('string');
    });

    it('isOtherTimezone detects different timezones', () => {
      expect(isOtherTimezone(null)).toBe(false);
      expect(isOtherTimezone(getCurrentTimezone())).toBe(false);
      const current = getCurrentTimezone();
      const other = current === 'UTC' ? 'America/New_York' : 'UTC';
      expect(isOtherTimezone(other)).toBe(true);
    });
  });

  describe('formatTimeString', () => {
    it('formats time strings correctly', () => {
      expect(formatTimeString(null)).toBeNull();
      expect(formatTimeString('09:15')).toBe('9:15 AM');
      expect(formatTimeString('14:30')).toBe('2:30 PM');
      expect(formatTimeString('00:00')).toBe('12:00 AM');
      expect(formatTimeString('12:00')).toBe('12:00 PM');
      expect(formatTimeString('invalid')).toBe('invalid');
    });
  });

  describe('formatDuration', () => {
    it('formats duration in minutes', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });
  });
});
