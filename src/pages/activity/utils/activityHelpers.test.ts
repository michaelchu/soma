import { describe, expect, it } from 'vitest';
import {
  calculateConsistencyMultiplier,
  calculateDailyActivityScore,
  calculateEffortScore,
  filterActivities,
  getDailyActivityScore,
  groupActivitiesByDay,
  hasHrZoneData,
} from './activityHelpers';
import type { Activity } from '@/types/activity';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    userId: '',
    date: '2024-03-15',
    timeOfDay: 'morning',
    activityType: 'walking',
    durationMinutes: 60,
    intensity: 3,
    notes: null,
    zone1Minutes: null,
    zone2Minutes: null,
    zone3Minutes: null,
    zone4Minutes: null,
    zone5Minutes: null,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
    ...overrides,
  };
}

describe('activity helpers', () => {
  it('detects HR zone data and calculates effort from zones', () => {
    const withZones = activity({
      zone1Minutes: 10,
      zone2Minutes: 10,
      zone3Minutes: 10,
      zone4Minutes: 10,
      zone5Minutes: 10,
    });

    expect(hasHrZoneData(withZones)).toBe(true);
    expect(calculateEffortScore(withZones)).toBe(54);
    expect(hasHrZoneData(activity())).toBe(false);
  });

  it('estimates effort from intensity when zones are absent', () => {
    expect(
      calculateEffortScore(activity({ intensity: 5, activityType: 'badminton' }))
    ).toBeGreaterThan(calculateEffortScore(activity({ intensity: 1 })));
  });

  it('groups days, calculates weighted intensity, and sorts ISO dates', () => {
    const entries = [
      activity({ id: 'late', date: '2024-03-16', durationMinutes: 30, intensity: 5 }),
      activity({ id: 'early', date: '2024-03-14', durationMinutes: 60, intensity: 2 }),
      activity({ id: 'same-day', date: '2024-03-16', durationMinutes: 30, intensity: 1 }),
    ];

    const grouped = groupActivitiesByDay(entries, entries);

    expect(grouped.map((day) => day.date)).toEqual(['2024-03-14', '2024-03-16']);
    expect(grouped[1].totalDuration).toBe(60);
    expect(grouped[1].avgIntensity).toBe(3);
  });

  it('returns daily scores only when a date has activities', () => {
    const entries = [activity()];

    expect(getDailyActivityScore('2024-03-15', entries)).toBeGreaterThan(0);
    expect(getDailyActivityScore('2024-03-14', entries)).toBeNull();
    expect(calculateDailyActivityScore([], entries)).toBe(0);
  });

  it('calculates the consistency multiplier from prior local calendar dates', () => {
    const reference = new Date(2024, 2, 15);
    const entries = [
      activity({ date: '2024-03-08' }),
      activity({ date: '2024-03-10' }),
      activity({ date: '2024-03-12' }),
    ];

    expect(calculateConsistencyMultiplier(entries, reference)).toBe(1);
  });

  it('leaves all activities unchanged for the all-range filter', () => {
    const entries = [activity(), activity({ id: 'activity-2', date: '2020-01-01' })];
    expect(filterActivities(entries, 'all')).toBe(entries);
  });
});
