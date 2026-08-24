import { describe, expect, it } from 'vitest';
import type { Activity } from '@/types/activity';
import {
  buildMonthWeekData,
  calculateStreak,
  formatDateKey,
  getActivitiesInWeek,
  getCalendarDays,
  getMonthWeeks,
  getWeekBounds,
  hasActivityInWeek,
  isInMonth,
  isSameDay,
} from './streakCalculator';

function activity(date: string, id = date): Activity {
  return {
    id,
    userId: '',
    date,
    timeOfDay: 'morning',
    activityType: 'walking',
    durationMinutes: 30,
    intensity: 2,
    notes: null,
    zone1Minutes: null,
    zone2Minutes: null,
    zone3Minutes: null,
    zone4Minutes: null,
    zone5Minutes: null,
    createdAt: `${date}T10:00:00Z`,
    updatedAt: `${date}T10:00:00Z`,
  };
}

describe('streak calculator', () => {
  it('returns Monday through Sunday bounds for Sunday and Monday dates', () => {
    const sunday = getWeekBounds(new Date(2024, 2, 17));
    expect(formatDateKey(sunday.start)).toBe('2024-03-11');
    expect(formatDateKey(sunday.end)).toBe('2024-03-17');

    const monday = getWeekBounds(new Date(2024, 2, 18));
    expect(formatDateKey(monday.start)).toBe('2024-03-18');
    expect(formatDateKey(monday.end)).toBe('2024-03-24');
  });

  it('builds padded month grids and marks activities in overlapping weeks', () => {
    const weeks = getMonthWeeks(2024, 2);
    expect(weeks.length).toBe(5);
    expect(formatDateKey(weeks[0].weekStart)).toBe('2024-02-26');

    const days = getCalendarDays(2024, 2);
    expect(days.length).toBe(35);
    expect(formatDateKey(days[0])).toBe('2024-02-26');
    expect(formatDateKey(days.at(-1)!)).toBe('2024-03-31');

    const entries = [activity('2024-03-15')];
    const built = buildMonthWeekData(entries, 2024, 2);
    const activeWeek = built.find((week) => week.hasActivity);
    expect(activeWeek?.activities).toEqual(entries);
    expect(hasActivityInWeek(entries, activeWeek!.weekStart, activeWeek!.weekEnd)).toBe(true);
    expect(getActivitiesInWeek(entries, activeWeek!.weekStart, activeWeek!.weekEnd)).toEqual(
      entries
    );
  });

  it('counts consecutive weeks and honors the early-week grace period', () => {
    const monday = new Date(2024, 2, 18);
    const entries = [activity('2024-03-11', 'previous-1'), activity('2024-03-12', 'previous-2')];

    expect(calculateStreak(entries, monday)).toEqual({ currentStreak: 1, streakActivities: 2 });
    expect(calculateStreak([], monday)).toEqual({ currentStreak: 0, streakActivities: 0 });

    const wednesday = new Date(2024, 2, 20);
    expect(calculateStreak(entries, wednesday)).toEqual({ currentStreak: 0, streakActivities: 0 });
  });

  it('compares calendar days and months using local date components', () => {
    const first = new Date(2024, 2, 15, 1);
    const second = new Date(2024, 2, 15, 23);
    expect(isSameDay(first, second)).toBe(true);
    expect(isSameDay(first, new Date(2024, 2, 16))).toBe(false);
    expect(isInMonth(first, 2024, 2)).toBe(true);
    expect(isInMonth(first, 2024, 1)).toBe(false);
  });
});
