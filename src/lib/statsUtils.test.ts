import { describe, expect, it } from 'vitest';
import {
  avg,
  avgRounded,
  calcStats,
  calcStatsRounded,
  linearRegression,
  roundStat,
  standardDeviation,
} from './statsUtils';

describe('statistics utilities', () => {
  it('handles averages, rounding, and empty inputs', () => {
    expect(avg([1, 2, 4])).toBe(7 / 3);
    expect(avg([])).toBeNull();
    expect(roundStat(2.6)).toBe(3);
    expect(roundStat(null)).toBeNull();
    expect(avgRounded([1, 2, 4])).toBe(2);
    expect(calcStats([])).toEqual({ min: null, max: null, avg: null });
    expect(calcStatsRounded([1, 2, 4])).toEqual({ min: 1, max: 4, avg: 2 });
  });

  it('calculates standard deviation and regression edge cases', () => {
    expect(standardDeviation([5])).toBe(0);
    expect(standardDeviation([1, 2, 3])).toBeCloseTo(Math.sqrt(2 / 3));
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 1, y: 2 }])).toBeNull();

    const flat = linearRegression([
      { x: 1, y: 4 },
      { x: 1, y: 6 },
    ])!;
    expect(flat.slope).toBe(0);
    expect(flat.predict(10)).toBe(5);

    const line = linearRegression([
      { x: 0, y: 1 },
      { x: 2, y: 5 },
    ])!;
    expect(line.predict(3)).toBe(7);
  });
});
