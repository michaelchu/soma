import { describe, it, expect } from 'vitest';
import {
  getBPCategory,
  getCategoryInfo,
  calculateStats,
  calculateFullStats,
  formatBPDateTime,
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
      const stats = calculateStats(mockReadings)!;
      expect(stats.avgSystolic).toBe(125); // (120+130+125)/3
    });

    it('calculates average diastolic correctly', () => {
      const stats = calculateStats(mockReadings)!;
      expect(stats.avgDiastolic).toBe(82); // (80+85+82)/3 ≈ 82
    });

    it('calculates average pulse correctly', () => {
      const stats = calculateStats(mockReadings)!;
      expect(stats.avgPulse).toBe(72); // (70+75+72)/3 ≈ 72
    });

    it('calculates min and max values correctly', () => {
      const stats = calculateStats(mockReadings)!;
      expect(stats.minSystolic).toBe(120);
      expect(stats.maxSystolic).toBe(130);
      expect(stats.minDiastolic).toBe(80);
      expect(stats.maxDiastolic).toBe(85);
    });

    it('returns correct count', () => {
      const stats = calculateStats(mockReadings)!;
      expect(stats.count).toBe(3);
    });

    it('handles readings without pulse', () => {
      const readingsNoPulse = [
        { systolic: 120, diastolic: 80 },
        { systolic: 130, diastolic: 85 },
      ];
      const stats = calculateStats(readingsNoPulse)!;
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

    it('returns null for null input', () => {
      expect(calculateFullStats(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(calculateFullStats(undefined)).toBeNull();
    });

    describe('systolic stats', () => {
      it('calculates min, max, avg correctly', () => {
        const stats = calculateFullStats(mockReadings)!;
        expect(stats.systolic.min).toBe(120);
        expect(stats.systolic.max).toBe(130);
        // avg = (120 + 130) / 2 = 125
        expect(stats.systolic.avg).toBe(125);
      });
    });

    describe('diastolic stats', () => {
      it('calculates min, max, avg correctly', () => {
        const stats = calculateFullStats(mockReadings)!;
        expect(stats.diastolic.min).toBe(80);
        expect(stats.diastolic.max).toBe(85);
        // avg = (80 + 85) / 2 = 82.5
        expect(stats.diastolic.avg).toBe(82.5);
      });
    });

    describe('pulse stats', () => {
      it('calculates min, max, avg correctly', () => {
        const stats = calculateFullStats(mockReadings)!;
        expect(stats.pulse.min).toBe(70);
        expect(stats.pulse.max).toBe(75);
        // avg = (70 + 75) / 2 = 72.5
        expect(stats.pulse.avg).toBe(72.5);
      });

      it('returns null values when no pulse data', () => {
        const readingsNoPulse = [
          { systolic: 120, diastolic: 80 },
          { systolic: 130, diastolic: 85 },
        ];
        const stats = calculateFullStats(readingsNoPulse)!;
        expect(stats.pulse.min).toBeNull();
        expect(stats.pulse.max).toBeNull();
        expect(stats.pulse.avg).toBeNull();
      });

      it('only uses readings that have pulse', () => {
        const mixedReadings = [
          { systolic: 120, diastolic: 80, pulse: 70 },
          { systolic: 130, diastolic: 85 }, // no pulse
          { systolic: 125, diastolic: 82, pulse: 80 },
        ];
        const stats = calculateFullStats(mixedReadings)!;
        // Only 70 and 80 should be included
        expect(stats.pulse.min).toBe(70);
        expect(stats.pulse.max).toBe(80);
        expect(stats.pulse.avg).toBe(75); // (70 + 80) / 2
      });
    });

    describe('pulse pressure (PP) stats', () => {
      it('calculates PP = systolic - diastolic for each reading', () => {
        const stats = calculateFullStats(mockReadings)!;
        // Reading 1: 120 - 80 = 40
        // Reading 2: 130 - 85 = 45
        expect(stats.pp.min).toBe(40);
        expect(stats.pp.max).toBe(45);
        // avg = (40 + 45) / 2 = 42.5
        expect(stats.pp.avg).toBe(42.5);
      });

      it('calculates PP correctly with various readings', () => {
        const readings = [
          { systolic: 110, diastolic: 70, pulse: 65 }, // PP = 40
          { systolic: 140, diastolic: 90, pulse: 75 }, // PP = 50
          { systolic: 125, diastolic: 80, pulse: 70 }, // PP = 45
        ];
        const stats = calculateFullStats(readings)!;
        expect(stats.pp.min).toBe(40);
        expect(stats.pp.max).toBe(50);
        // avg = (40 + 50 + 45) / 3 = 45
        expect(stats.pp.avg).toBe(45);
      });
    });

    describe('mean arterial pressure (MAP) stats', () => {
      it('calculates MAP = diastolic + (PP / 3) for each reading', () => {
        const stats = calculateFullStats(mockReadings)!;
        // Reading 1: 80 + (40/3) = 80 + 13.333... = 93.333...
        // Reading 2: 85 + (45/3) = 85 + 15 = 100
        expect(stats.map.min).toBeCloseTo(93.333, 2);
        expect(stats.map.max).toBe(100);
        // avg = (93.333 + 100) / 2 = 96.666...
        expect(stats.map.avg).toBeCloseTo(96.667, 2);
      });

      it('calculates MAP correctly with various readings', () => {
        const readings = [
          { systolic: 120, diastolic: 80, pulse: 70 }, // PP=40, MAP=80+40/3=93.33
          { systolic: 120, diastolic: 80, pulse: 72 }, // PP=40, MAP=93.33
          { systolic: 120, diastolic: 80, pulse: 68 }, // PP=40, MAP=93.33
        ];
        const stats = calculateFullStats(readings)!;
        // All MAPs are the same: 93.333...
        expect(stats.map.min).toBeCloseTo(93.333, 2);
        expect(stats.map.max).toBeCloseTo(93.333, 2);
        expect(stats.map.avg).toBeCloseTo(93.333, 2);
      });
    });

    describe('count', () => {
      it('returns correct count of readings', () => {
        const stats = calculateFullStats(mockReadings)!;
        expect(stats.count).toBe(2);
      });

      it('counts all readings regardless of pulse presence', () => {
        const mixedReadings = [
          { systolic: 120, diastolic: 80, pulse: 70 },
          { systolic: 130, diastolic: 85 }, // no pulse
          { systolic: 125, diastolic: 82, pulse: 80 },
        ];
        const stats = calculateFullStats(mixedReadings)!;
        expect(stats.count).toBe(3);
      });
    });

    describe('single reading', () => {
      it('handles single reading correctly', () => {
        const singleReading = [{ systolic: 120, diastolic: 80, pulse: 70 }];
        const stats = calculateFullStats(singleReading)!;

        // All min/max/avg should be the same value
        expect(stats.systolic.min).toBe(120);
        expect(stats.systolic.max).toBe(120);
        expect(stats.systolic.avg).toBe(120);

        expect(stats.diastolic.min).toBe(80);
        expect(stats.diastolic.max).toBe(80);
        expect(stats.diastolic.avg).toBe(80);

        expect(stats.pulse.min).toBe(70);
        expect(stats.pulse.max).toBe(70);
        expect(stats.pulse.avg).toBe(70);

        // PP = 120 - 80 = 40
        expect(stats.pp.min).toBe(40);
        expect(stats.pp.max).toBe(40);
        expect(stats.pp.avg).toBe(40);

        // MAP = 80 + 40/3 = 93.333
        expect(stats.map.min).toBeCloseTo(93.333, 2);
        expect(stats.map.max).toBeCloseTo(93.333, 2);
        expect(stats.map.avg).toBeCloseTo(93.333, 2);

        expect(stats.count).toBe(1);
      });
    });

    describe('rounding behavior (displayed values)', () => {
      // The UI rounds values using Math.round when displaying
      // These tests verify what the displayed values would be
      it('provides values that round correctly for display', () => {
        const readings = [
          { systolic: 121, diastolic: 79, pulse: 71 },
          { systolic: 122, diastolic: 81, pulse: 73 },
        ];
        const stats = calculateFullStats(readings)!;

        // Systolic: avg = (121 + 122) / 2 = 121.5 → rounds to 122
        expect(Math.round(stats.systolic.avg!)).toBe(122);

        // Diastolic: avg = (79 + 81) / 2 = 80
        expect(Math.round(stats.diastolic.avg!)).toBe(80);

        // Pulse: avg = (71 + 73) / 2 = 72
        expect(Math.round(stats.pulse.avg!)).toBe(72);

        // PP: (121-79=42, 122-81=41) → avg = 41.5 → rounds to 42
        expect(Math.round(stats.pp.avg!)).toBe(42);

        // MAP:
        // Reading 1: 79 + 42/3 = 93
        // Reading 2: 81 + 41/3 = 94.666...
        // avg ≈ 93.833 → rounds to 94
        expect(Math.round(stats.map.avg!)).toBe(94);
      });
    });
  });

  describe('formatBPDateTime', () => {
    it('formats date and time of day correctly', () => {
      const result = formatBPDateTime('2024-03-15', 'morning');
      expect(result.date).toBeDefined();
      expect(result.time).toBe('Morning');
      expect(result.full).toBeDefined();
    });

    it('respects hideCurrentYear option', () => {
      const currentYear = new Date().getFullYear();
      const dateThisYear = `${currentYear}-06-15`;
      const result = formatBPDateTime(dateThisYear, 'afternoon', { hideCurrentYear: true });
      expect(result.date).not.toContain(currentYear.toString());
    });

    it('respects hideWeekday option', () => {
      const result = formatBPDateTime('2024-03-15', 'evening', { hideWeekday: true });
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
      expect(getTrend([{ systolic: 120, diastolic: 80, date: '2024-01-01' }])).toBeNull();
    });

    it('detects improving trend (decreasing BP)', () => {
      const readings = [
        { systolic: 140, diastolic: 90, date: '2024-01-01' },
        { systolic: 130, diastolic: 85, date: '2024-01-02' },
      ];
      const trend = getTrend(readings)!;
      expect(trend.systolic.isImproving).toBe(true);
      expect(trend.diastolic.isImproving).toBe(true);
    });

    it('detects worsening trend (increasing BP)', () => {
      const readings = [
        { systolic: 120, diastolic: 80, date: '2024-01-01' },
        { systolic: 130, diastolic: 85, date: '2024-01-02' },
      ];
      const trend = getTrend(readings)!;
      expect(trend.systolic.isImproving).toBe(false);
      expect(trend.diastolic.isImproving).toBe(false);
    });

    it('calculates correct differences', () => {
      const readings = [
        { systolic: 120, diastolic: 80, date: '2024-01-01' },
        { systolic: 125, diastolic: 82, date: '2024-01-02' },
      ];
      const trend = getTrend(readings)!;
      expect(trend.systolic.diff).toBe(5);
      expect(trend.diastolic.diff).toBe(2);
    });

    it('detects stable trend', () => {
      const readings = [
        { systolic: 120, diastolic: 80, date: '2024-01-01' },
        { systolic: 120, diastolic: 80, date: '2024-01-02' },
      ];
      const trend = getTrend(readings)!;
      expect(trend.systolic.direction).toBe('stable');
      expect(trend.diastolic.direction).toBe('stable');
    });
  });

  describe('getPreviousPeriodReadings', () => {
    // Helper to create a date N days ago in YYYY-MM-DD format
    const daysAgoDate = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    };

    it('returns empty array for "all" date range', () => {
      const mockReadings = [
        { date: daysAgoDate(5), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 },
      ];
      expect(getPreviousPeriodReadings(mockReadings, 'all', 'all')).toEqual([]);
    });

    it('returns empty array for null readings', () => {
      expect(getPreviousPeriodReadings(null, '7', 'all')).toEqual([]);
    });

    it('returns empty array for undefined readings', () => {
      expect(getPreviousPeriodReadings(undefined, '1w', 'all')).toEqual([]);
    });

    describe('1w (7 days) date range', () => {
      it('filters readings from previous 7-day period', () => {
        const mockReadings = [
          { date: daysAgoDate(2), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 }, // Current period
          { date: daysAgoDate(5), timeOfDay: 'morning' as const, systolic: 121, diastolic: 81 }, // Current period
          { date: daysAgoDate(8), timeOfDay: 'morning' as const, systolic: 122, diastolic: 82 }, // Previous period
          { date: daysAgoDate(10), timeOfDay: 'morning' as const, systolic: 123, diastolic: 83 }, // Previous period
          { date: daysAgoDate(12), timeOfDay: 'morning' as const, systolic: 124, diastolic: 84 }, // Previous period
          { date: daysAgoDate(15), timeOfDay: 'morning' as const, systolic: 125, diastolic: 85 }, // Outside both periods
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'all');
        expect(result.length).toBe(3);
        expect(result.map((r) => r.systolic).sort()).toEqual([122, 123, 124]);
      });
    });

    describe('1m (1 month) date range', () => {
      it('filters readings from previous month', () => {
        const mockReadings = [
          { date: daysAgoDate(10), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 }, // Current month
          { date: daysAgoDate(35), timeOfDay: 'morning' as const, systolic: 130, diastolic: 85 }, // Previous month
          { date: daysAgoDate(45), timeOfDay: 'morning' as const, systolic: 135, diastolic: 88 }, // Previous month
          { date: daysAgoDate(70), timeOfDay: 'morning' as const, systolic: 140, diastolic: 90 }, // Two months ago
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1m', 'all');
        expect(result.length).toBe(2);
        expect(result.map((r) => r.systolic).sort()).toEqual([130, 135]);
      });
    });

    describe('time of day filtering', () => {
      it('filters previous period readings by morning', () => {
        const mockReadings = [
          { date: daysAgoDate(2), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 }, // Current, morning
          { date: daysAgoDate(8), timeOfDay: 'morning' as const, systolic: 121, diastolic: 81 }, // Previous, morning
          { date: daysAgoDate(9), timeOfDay: 'afternoon' as const, systolic: 122, diastolic: 82 }, // Previous, afternoon
          { date: daysAgoDate(10), timeOfDay: 'morning' as const, systolic: 123, diastolic: 83 }, // Previous, morning
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'morning');
        expect(result.length).toBe(2);
        expect(result.map((r) => r.systolic).sort()).toEqual([121, 123]);
      });

      it('filters previous period readings by afternoon', () => {
        const mockReadings = [
          { date: daysAgoDate(2), timeOfDay: 'afternoon' as const, systolic: 120, diastolic: 80 }, // Current, afternoon
          { date: daysAgoDate(8), timeOfDay: 'morning' as const, systolic: 121, diastolic: 81 }, // Previous, morning
          { date: daysAgoDate(9), timeOfDay: 'afternoon' as const, systolic: 122, diastolic: 82 }, // Previous, afternoon
          { date: daysAgoDate(10), timeOfDay: 'afternoon' as const, systolic: 123, diastolic: 83 }, // Previous, afternoon
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'afternoon');
        expect(result.length).toBe(2);
        expect(result.map((r) => r.systolic).sort()).toEqual([122, 123]);
      });

      it('filters previous period readings by evening', () => {
        const mockReadings = [
          { date: daysAgoDate(8), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 }, // Previous, morning
          { date: daysAgoDate(9), timeOfDay: 'evening' as const, systolic: 121, diastolic: 81 }, // Previous, evening
          { date: daysAgoDate(10), timeOfDay: 'evening' as const, systolic: 122, diastolic: 82 }, // Previous, evening
          { date: daysAgoDate(11), timeOfDay: 'afternoon' as const, systolic: 123, diastolic: 83 }, // Previous, afternoon
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'evening');
        expect(result.length).toBe(2);
        expect(result.map((r) => r.systolic).sort()).toEqual([121, 122]);
      });
    });

    describe('readings without date', () => {
      it('excludes readings without date', () => {
        const mockReadings = [
          { date: daysAgoDate(8), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 },
          { systolic: 125, diastolic: 82 } as any, // No date
          { date: daysAgoDate(10), timeOfDay: 'morning' as const, systolic: 130, diastolic: 85 },
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'all');
        expect(result.length).toBe(2);
      });
    });

    describe('empty previous period', () => {
      it('returns empty array when no readings in previous period', () => {
        const mockReadings = [
          { date: daysAgoDate(2), timeOfDay: 'morning' as const, systolic: 120, diastolic: 80 }, // Current period only
          { date: daysAgoDate(5), timeOfDay: 'morning' as const, systolic: 121, diastolic: 81 }, // Current period only
        ];
        const result = getPreviousPeriodReadings(mockReadings, '1w', 'all');
        expect(result).toEqual([]);
      });
    });
  });

  describe('current vs previous period comparison (integration)', () => {
    // These tests verify the full comparison scenario as used in StatisticsTab
    const daysAgoDate = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split('T')[0];
    };

    it('calculates correct stats for comparison between periods', () => {
      // Simulate a realistic scenario:
      // Current period (last 7 days): higher BP readings
      // Previous period (7-14 days ago): lower BP readings
      const allReadings = [
        // Current period readings (days 0-6)
        {
          date: daysAgoDate(1),
          timeOfDay: 'morning' as const,
          systolic: 135,
          diastolic: 88,
          pulse: 75,
        },
        {
          date: daysAgoDate(3),
          timeOfDay: 'morning' as const,
          systolic: 140,
          diastolic: 92,
          pulse: 78,
        },
        {
          date: daysAgoDate(5),
          timeOfDay: 'morning' as const,
          systolic: 138,
          diastolic: 90,
          pulse: 76,
        },

        // Previous period readings (days 7-13)
        {
          date: daysAgoDate(8),
          timeOfDay: 'morning' as const,
          systolic: 125,
          diastolic: 82,
          pulse: 70,
        },
        {
          date: daysAgoDate(10),
          timeOfDay: 'morning' as const,
          systolic: 128,
          diastolic: 84,
          pulse: 72,
        },
        {
          date: daysAgoDate(12),
          timeOfDay: 'morning' as const,
          systolic: 122,
          diastolic: 80,
          pulse: 68,
        },
      ];

      // Get current period readings (normally done by date filtering in the component)
      const currentReadings = allReadings.filter((r) => {
        const date = new Date(r.date);
        const sixDaysAgo = new Date();
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        sixDaysAgo.setHours(0, 0, 0, 0);
        return date >= sixDaysAgo;
      });

      const previousReadings = getPreviousPeriodReadings(allReadings, '1w', 'all');

      const currentStats = calculateFullStats(currentReadings)!;
      const previousStats = calculateFullStats(previousReadings)!;

      // Verify current period stats
      expect(currentStats.count).toBe(3);
      // Systolic: (135 + 140 + 138) / 3 = 137.666...
      expect(currentStats.systolic.avg).toBeCloseTo(137.667, 2);
      expect(Math.round(currentStats.systolic.avg!)).toBe(138);
      expect(currentStats.systolic.min).toBe(135);
      expect(currentStats.systolic.max).toBe(140);

      // Diastolic: (88 + 92 + 90) / 3 = 90
      expect(currentStats.diastolic.avg).toBe(90);
      expect(currentStats.diastolic.min).toBe(88);
      expect(currentStats.diastolic.max).toBe(92);

      // Verify previous period stats
      expect(previousStats.count).toBe(3);
      // Systolic: (125 + 128 + 122) / 3 = 125
      expect(previousStats.systolic.avg).toBe(125);
      expect(previousStats.systolic.min).toBe(122);
      expect(previousStats.systolic.max).toBe(128);

      // Diastolic: (82 + 84 + 80) / 3 = 82
      expect(previousStats.diastolic.avg).toBe(82);
      expect(previousStats.diastolic.min).toBe(80);
      expect(previousStats.diastolic.max).toBe(84);

      // The comparison in UI would show:
      // Current avg systolic (138) vs previous (125) = +13 (worsening)
      // Current avg diastolic (90) vs previous (82) = +8 (worsening)
      const systolicChange =
        Math.round(currentStats.systolic.avg!) - Math.round(previousStats.systolic.avg!);
      const diastolicChange =
        Math.round(currentStats.diastolic.avg!) - Math.round(previousStats.diastolic.avg!);

      expect(systolicChange).toBe(13); // 138 - 125
      expect(diastolicChange).toBe(8); // 90 - 82
    });

    it('calculates correct PP and MAP comparisons', () => {
      const allReadings = [
        // Current period: higher PP (wider gap)
        {
          date: daysAgoDate(1),
          timeOfDay: 'morning' as const,
          systolic: 140,
          diastolic: 80,
          pulse: 72,
        }, // PP=60, MAP=100
        {
          date: daysAgoDate(3),
          timeOfDay: 'morning' as const,
          systolic: 145,
          diastolic: 85,
          pulse: 74,
        }, // PP=60, MAP=105

        // Previous period: normal PP
        {
          date: daysAgoDate(8),
          timeOfDay: 'morning' as const,
          systolic: 120,
          diastolic: 80,
          pulse: 68,
        }, // PP=40, MAP=93.33
        {
          date: daysAgoDate(10),
          timeOfDay: 'morning' as const,
          systolic: 125,
          diastolic: 85,
          pulse: 70,
        }, // PP=40, MAP=98.33
      ];

      const currentReadings = allReadings.slice(0, 2);
      const previousReadings = getPreviousPeriodReadings(allReadings, '1w', 'all');

      const currentStats = calculateFullStats(currentReadings)!;
      const previousStats = calculateFullStats(previousReadings)!;

      // Current PP: avg of 60, 60 = 60
      expect(currentStats.pp.avg).toBe(60);
      // Previous PP: avg of 40, 40 = 40
      expect(previousStats.pp.avg).toBe(40);

      // Current MAP: avg of 100, 105 = 102.5 → rounds to 103
      expect(Math.round(currentStats.map.avg!)).toBe(103);
      // Previous MAP: avg of 93.33, 98.33 = 95.83 → rounds to 96
      expect(Math.round(previousStats.map.avg!)).toBe(96);

      // PP comparison: 60 - 40 = +20 (elevated PP is concerning)
      expect(Math.round(currentStats.pp.avg!) - Math.round(previousStats.pp.avg!)).toBe(20);
    });

    it('handles scenario where previous period has no data', () => {
      const allReadings = [
        // Only current period readings
        {
          date: daysAgoDate(1),
          timeOfDay: 'morning' as const,
          systolic: 120,
          diastolic: 80,
          pulse: 70,
        },
        {
          date: daysAgoDate(3),
          timeOfDay: 'morning' as const,
          systolic: 125,
          diastolic: 82,
          pulse: 72,
        },
      ];

      const previousReadings = getPreviousPeriodReadings(allReadings, '1w', 'all');
      const previousStats = calculateFullStats(previousReadings);

      expect(previousReadings).toEqual([]);
      expect(previousStats).toBeNull();
    });

    it('handles scenario with different reading counts per period', () => {
      const allReadings = [
        // Current period: 2 readings
        {
          date: daysAgoDate(1),
          timeOfDay: 'morning' as const,
          systolic: 130,
          diastolic: 85,
          pulse: 72,
        },
        {
          date: daysAgoDate(3),
          timeOfDay: 'morning' as const,
          systolic: 132,
          diastolic: 87,
          pulse: 74,
        },

        // Previous period: 5 readings
        {
          date: daysAgoDate(7),
          timeOfDay: 'morning' as const,
          systolic: 125,
          diastolic: 80,
          pulse: 68,
        },
        {
          date: daysAgoDate(8),
          timeOfDay: 'morning' as const,
          systolic: 128,
          diastolic: 82,
          pulse: 70,
        },
        {
          date: daysAgoDate(9),
          timeOfDay: 'morning' as const,
          systolic: 126,
          diastolic: 81,
          pulse: 69,
        },
        {
          date: daysAgoDate(10),
          timeOfDay: 'morning' as const,
          systolic: 124,
          diastolic: 79,
          pulse: 67,
        },
        {
          date: daysAgoDate(11),
          timeOfDay: 'morning' as const,
          systolic: 127,
          diastolic: 83,
          pulse: 71,
        },
      ];

      const currentReadings = allReadings.slice(0, 2);
      const previousReadings = getPreviousPeriodReadings(allReadings, '1w', 'all');

      const currentStats = calculateFullStats(currentReadings)!;
      const previousStats = calculateFullStats(previousReadings)!;

      expect(currentStats.count).toBe(2);
      expect(previousStats.count).toBe(5);

      // Current systolic avg: (130 + 132) / 2 = 131
      expect(currentStats.systolic.avg).toBe(131);

      // Previous systolic avg: (125 + 128 + 126 + 124 + 127) / 5 = 126
      expect(previousStats.systolic.avg).toBe(126);
    });
  });
});
