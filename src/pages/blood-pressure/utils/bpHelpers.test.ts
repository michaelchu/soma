import { describe, it, expect } from 'vitest';
import {
  getBPCategory,
  getCategoryInfo,
  calculateStats,
  calculateFullStats,
  formatDateTime,
  getTrend,
  getPreviousPeriodReadings,
} from './bpHelpers';
import { formatDatetimeForId } from '../../../lib/dateUtils';

describe('bpHelpers', () => {
  describe('getBPCategory', () => {
    it('returns null for invalid inputs', () => {
      expect(getBPCategory(null, 80)).toBeNull();
      expect(getBPCategory(120, null)).toBeNull();
      expect(getBPCategory(null, null)).toBeNull();
    });

    it('returns "normal" for normal blood pressure', () => {
      expect(getBPCategory(115, 75)).toBe('normal');
      expect(getBPCategory(110, 70)).toBe('normal');
    });

    it('returns "elevated" for elevated blood pressure', () => {
      expect(getBPCategory(125, 75)).toBe('elevated');
      expect(getBPCategory(128, 78)).toBe('elevated');
    });

    it('returns category for high blood pressure', () => {
      const result = getBPCategory(140, 90);
      expect(['stage1', 'hypertension_stage1', 'hypertension1', 'hypertension2']).toContain(result);
    });

    it('returns more severe category for very high blood pressure', () => {
      const result = getBPCategory(180, 120);
      expect(['crisis', 'hypertensive_crisis', 'stage2', 'hypertension_stage2']).toContain(result);
    });
  });

  describe('getCategoryInfo', () => {
    it('returns category info object', () => {
      const info = getCategoryInfo('normal');
      expect(info).toHaveProperty('bgClass');
      expect(info).toHaveProperty('textClass');
    });

    it('returns default info for unknown category', () => {
      const info = getCategoryInfo('unknown_category');
      expect(info).toBeDefined();
    });
  });

  describe('calculateStats', () => {
    const mockReadings = [
      { systolic: 120, diastolic: 80, pulse: 70 },
      { systolic: 130, diastolic: 85, pulse: 75 },
      { systolic: 125, diastolic: 82, pulse: 72 },
    ];

    it('returns null for empty array', () => {
      expect(calculateStats([])).toBeNull();
    });

    it('returns null for null input', () => {
      expect(calculateStats(null)).toBeNull();
    });

    it('calculates average systolic correctly', () => {
      const stats = calculateStats(mockReadings);
      expect(stats.avgSystolic).toBe(125); // (120+130+125)/3
    });

    it('calculates average diastolic correctly', () => {
      const stats = calculateStats(mockReadings);
      expect(stats.avgDiastolic).toBe(82); // (80+85+82)/3 ≈ 82
    });

    it('calculates average pulse correctly', () => {
      const stats = calculateStats(mockReadings);
      expect(stats.avgPulse).toBe(72); // (70+75+72)/3 ≈ 72
    });

    it('calculates min and max values correctly', () => {
      const stats = calculateStats(mockReadings);
      expect(stats.minSystolic).toBe(120);
      expect(stats.maxSystolic).toBe(130);
      expect(stats.minDiastolic).toBe(80);
      expect(stats.maxDiastolic).toBe(85);
    });

    it('returns correct count', () => {
      const stats = calculateStats(mockReadings);
      expect(stats.count).toBe(3);
    });

    it('handles readings without pulse', () => {
      const readingsNoPulse = [
        { systolic: 120, diastolic: 80 },
        { systolic: 130, diastolic: 85 },
      ];
      const stats = calculateStats(readingsNoPulse);
      expect(stats.avgPulse).toBeNull();
    });
  });

  describe('calculateFullStats', () => {
    const mockReadings = [
      { systolic: 120, diastolic: 80, pulse: 70 },
      { systolic: 130, diastolic: 85, pulse: 75 },
    ];

    it('returns null for empty array', () => {
      expect(calculateFullStats([])).toBeNull();
    });

    it('calculates pulse pressure (PP) correctly', () => {
      const stats = calculateFullStats(mockReadings);
      // PP = systolic - diastolic
      // Reading 1: 120 - 80 = 40
      // Reading 2: 130 - 85 = 45
      expect(stats.pp.min).toBe(40);
      expect(stats.pp.max).toBe(45);
    });

    it('calculates mean arterial pressure (MAP) correctly', () => {
      const stats = calculateFullStats(mockReadings);
      // MAP = diastolic + (1/3 * PP)
      // Reading 1: 80 + (40/3) ≈ 93
      // Reading 2: 85 + (45/3) = 100
      expect(stats.map.min).toBe(93);
      expect(stats.map.max).toBe(100);
    });

    it('includes systolic, diastolic, and pulse stats', () => {
      const stats = calculateFullStats(mockReadings);
      expect(stats.systolic).toBeDefined();
      expect(stats.diastolic).toBeDefined();
      expect(stats.pulse).toBeDefined();
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time correctly', () => {
      const result = formatDateTime('2024-03-15T14:30:00');
      expect(result.date).toBeDefined();
      expect(result.time).toBeDefined();
      expect(result.full).toBeDefined();
    });

    it('respects hideCurrentYear option', () => {
      const currentYear = new Date().getFullYear();
      const dateThisYear = `${currentYear}-06-15T10:00:00`;
      const result = formatDateTime(dateThisYear, { hideCurrentYear: true });
      expect(result.date).not.toContain(currentYear.toString());
    });

    it('respects hideWeekday option', () => {
      const result = formatDateTime('2024-03-15T14:30:00', { hideWeekday: true });
      // Weekday names are typically 3 letters (Mon, Tue, etc.)
      expect(result.date).not.toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
    });
  });

  describe('formatDatetimeForId', () => {
    it('formats datetime for markdown ID', () => {
      const result = formatDatetimeForId('2024-03-15T14:30:00');
      expect(result).toBe('2024-03-15 14:30');
    });

    it('pads single digit months and days', () => {
      const result = formatDatetimeForId('2024-01-05T09:05:00');
      expect(result).toBe('2024-01-05 09:05');
    });
  });

  describe('getTrend', () => {
    it('returns null for less than 2 readings', () => {
      expect(getTrend([])).toBeNull();
      expect(getTrend([{ systolic: 120, diastolic: 80, datetime: '2024-01-01' }])).toBeNull();
    });

    it('detects improving trend (decreasing BP)', () => {
      const readings = [
        { systolic: 140, diastolic: 90, datetime: '2024-01-01' },
        { systolic: 130, diastolic: 85, datetime: '2024-01-02' },
      ];
      const trend = getTrend(readings);
      expect(trend.systolic.isImproving).toBe(true);
      expect(trend.diastolic.isImproving).toBe(true);
    });

    it('detects worsening trend (increasing BP)', () => {
      const readings = [
        { systolic: 120, diastolic: 80, datetime: '2024-01-01' },
        { systolic: 130, diastolic: 85, datetime: '2024-01-02' },
      ];
      const trend = getTrend(readings);
      expect(trend.systolic.isImproving).toBe(false);
      expect(trend.diastolic.isImproving).toBe(false);
    });

    it('calculates correct differences', () => {
      const readings = [
        { systolic: 120, diastolic: 80, datetime: '2024-01-01' },
        { systolic: 125, diastolic: 82, datetime: '2024-01-02' },
      ];
      const trend = getTrend(readings);
      expect(trend.systolic.diff).toBe(5);
      expect(trend.diastolic.diff).toBe(2);
    });

    it('detects stable trend', () => {
      const readings = [
        { systolic: 120, diastolic: 80, datetime: '2024-01-01' },
        { systolic: 120, diastolic: 80, datetime: '2024-01-02' },
      ];
      const trend = getTrend(readings);
      expect(trend.systolic.direction).toBe('stable');
      expect(trend.diastolic.direction).toBe('stable');
    });
  });

  describe('getPreviousPeriodReadings', () => {
    const now = new Date();
    const daysAgo = (days) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date.toISOString();
    };

    const mockReadings = [
      { datetime: daysAgo(5) }, // Current period (last 7 days)
      { datetime: daysAgo(10) }, // Previous period (7-14 days ago)
      { datetime: daysAgo(12) }, // Previous period
      { datetime: daysAgo(20) }, // Outside both periods
    ];

    it('returns empty array for "all" date range', () => {
      expect(getPreviousPeriodReadings(mockReadings, 'all', 'all')).toEqual([]);
    });

    it('returns empty array for null readings', () => {
      expect(getPreviousPeriodReadings(null, '7', 'all')).toEqual([]);
    });

    it('filters readings from previous period', () => {
      const result = getPreviousPeriodReadings(mockReadings, '7', 'all');
      expect(result.length).toBe(2); // 10 and 12 days ago
    });
  });
});
