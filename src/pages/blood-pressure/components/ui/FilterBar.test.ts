import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterReadings } from './FilterBar';
import type { BPSession } from '@/types/bloodPressure';

function session(date: string, timeOfDay: BPSession['timeOfDay'] = 'morning'): BPSession {
  return {
    sessionId: date,
    date,
    timeOfDay,
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    notes: null,
    readings: [],
    readingCount: 0,
  };
}

describe('blood pressure filters', () => {
  afterEach(() => vi.useRealTimers());

  it('compares date-only readings as local calendar dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 15, 12));

    const result = filterReadings(
      [session('2024-03-15'), session('2024-03-09'), session('2024-03-08')],
      '1w',
      'all'
    );

    expect(result.map((entry) => entry.date)).toEqual(['2024-03-15', '2024-03-09']);
  });

  it('filters time of day and handles missing input', () => {
    expect(filterReadings(null, 'all', 'all')).toEqual([]);
    expect(
      filterReadings(
        [session('2024-03-15', 'morning'), session('2024-03-15', 'evening')],
        'all',
        'evening'
      )
    ).toHaveLength(1);
  });
});
