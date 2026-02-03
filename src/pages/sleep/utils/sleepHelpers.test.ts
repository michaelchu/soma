import { describe, it, expect } from 'vitest';
import {
  calculateSleepStats,
  filterEntriesByDateRange,
  getPreviousPeriodEntries,
  calculateDetailedStats,
  calculatePersonalBaseline,
  calculateSleepScore,
} from './sleepHelpers';
import { toLocalDateString } from '../../../lib/dateUtils';
import type { SleepEntry } from '../../../lib/db/sleep';

// Helper to create a mock sleep entry
function createMockEntry(overrides: Partial<SleepEntry> = {}): SleepEntry {
  return {
    id: 'test-id-1',
    date: '2024-03-15',
    timezone: 'America/New_York',
    durationMinutes: 480,
    totalSleepMinutes: 450,
    sleepStart: '22:30',
    sleepEnd: '06:30',
    hrvLow: 35,
    hrvHigh: 55,
    restingHr: 52,
    lowestHrTime: '03:30',
    hrDropMinutes: 25,
    deepSleepPct: 20,
    remSleepPct: 22,
    lightSleepPct: 50,
    awakePct: 8,
    skinTempAvg: 36.5,
    sleepCyclesFull: 4,
    sleepCyclesPartial: 1,
    movementCount: 12,
    notes: null,
    ...overrides,
  };
}

// Helper to create a date N days ago
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDateString(date);
}

describe('sleepHelpers', () => {
  describe('calculateSleepStats', () => {
    it('returns null for empty array', () => {
      expect(calculateSleepStats([])).toBeNull();
    });

    it('handles entries with partial null values correctly', () => {
      const entries = [
        createMockEntry({ id: '1', hrvLow: 30, hrvHigh: 50, restingHr: 48 }),
        createMockEntry({ id: '2', hrvLow: null, hrvHigh: null, restingHr: 52 }),
        createMockEntry({ id: '3', hrvLow: 35, hrvHigh: 55, restingHr: null }),
      ];
      const stats = calculateSleepStats(entries)!;

      // HRV should only average non-null values
      expect(stats.avgHrvLow).toBe(33); // (30 + 35) / 2
      expect(stats.avgHrvHigh).toBe(53); // (50 + 55) / 2

      // Resting HR should only use non-null values
      expect(stats.avgRestingHr).toBe(50); // (48 + 52) / 2
      expect(stats.minRestingHr).toBe(48);
      expect(stats.maxRestingHr).toBe(52);
    });

    it('returns null for metrics when all entries have null values', () => {
      const entries = [
        createMockEntry({ id: '1', hrvLow: null, hrvHigh: null }),
        createMockEntry({ id: '2', hrvLow: null, hrvHigh: null }),
      ];
      const stats = calculateSleepStats(entries)!;
      expect(stats.avgHrvLow).toBeNull();
      expect(stats.avgHrvHigh).toBeNull();
    });
  });

  describe('calculateDetailedStats', () => {
    it('returns null for empty array', () => {
      expect(calculateDetailedStats([])).toBeNull();
    });

    it('calculates min/max/avg correctly across entries', () => {
      const entries = [
        createMockEntry({ id: '1', durationMinutes: 420, restingHr: 48 }),
        createMockEntry({ id: '2', durationMinutes: 480, restingHr: 52 }),
        createMockEntry({ id: '3', durationMinutes: 510, restingHr: 50 }),
      ];
      const stats = calculateDetailedStats(entries)!;

      expect(stats.count).toBe(3);
      expect(stats.duration).toEqual({ min: 420, max: 510, avg: 470 });
      expect(stats.restingHr).toEqual({ min: 48, max: 52, avg: 50 });
    });

    it('calculates restorative (deep + REM) correctly', () => {
      const entries = [
        createMockEntry({ id: '1', deepSleepPct: 18, remSleepPct: 20 }), // 38
        createMockEntry({ id: '2', deepSleepPct: 22, remSleepPct: 24 }), // 46
        createMockEntry({ id: '3', deepSleepPct: 20, remSleepPct: 22 }), // 42
      ];
      const stats = calculateDetailedStats(entries)!;
      expect(stats.restorative).toEqual({ min: 38, max: 46, avg: 42 });
    });

    it('handles mixed null values correctly', () => {
      const entries = [
        createMockEntry({ id: '1', hrvLow: 30, hrvHigh: null }),
        createMockEntry({ id: '2', hrvLow: null, hrvHigh: 55 }),
      ];
      const stats = calculateDetailedStats(entries)!;

      // Each metric only uses its own non-null values
      expect(stats.hrvLow).toEqual({ min: 30, max: 30, avg: 30 });
      expect(stats.hrvHigh).toEqual({ min: 55, max: 55, avg: 55 });
    });

    it('returns null stats when all values are null for a metric', () => {
      const entries = [
        createMockEntry({ id: '1', hrvLow: null, hrvHigh: null }),
        createMockEntry({ id: '2', hrvLow: null, hrvHigh: null }),
      ];
      const stats = calculateDetailedStats(entries)!;
      expect(stats.hrvLow).toEqual({ min: null, max: null, avg: null });
    });
  });

  describe('calculatePersonalBaseline', () => {
    const mockEntries = [
      createMockEntry({
        id: '1',
        durationMinutes: 420,
        hrvLow: 30,
        hrvHigh: 50,
        restingHr: 52,
        deepSleepPct: 18,
        remSleepPct: 20,
      }),
      createMockEntry({
        id: '2',
        durationMinutes: 480,
        hrvLow: 35,
        hrvHigh: 55,
        restingHr: 50,
        deepSleepPct: 22,
        remSleepPct: 24,
      }),
      createMockEntry({
        id: '3',
        durationMinutes: 450,
        hrvLow: 32,
        hrvHigh: 52,
        restingHr: 48,
        deepSleepPct: 20,
        remSleepPct: 22,
      }),
      createMockEntry({
        id: '4',
        durationMinutes: 510,
        hrvLow: 38,
        hrvHigh: 58,
        restingHr: 46,
        deepSleepPct: 24,
        remSleepPct: 26,
      }),
    ];

    it('calculates mean and standard deviation correctly', () => {
      const baseline = calculatePersonalBaseline(mockEntries);

      // Duration: [420, 480, 450, 510] → mean = 465
      expect(baseline.duration!.mean).toBe(465);
      expect(baseline.duration!.std).toBeGreaterThan(0);

      // Resting HR: [52, 50, 48, 46] → mean = 49
      expect(baseline.restingHr!.mean).toBe(49);

      // Restorative: [38, 46, 42, 50] → mean = 44
      expect(baseline.restorative!.mean).toBe(44);
    });

    it('excludes entry by ID when calculating baseline', () => {
      const baseline = calculatePersonalBaseline(mockEntries, '1');

      expect(baseline.count).toBe(3);
      // Duration without entry 1: [480, 450, 510] → mean = 480
      expect(baseline.duration!.mean).toBe(480);
    });

    it('returns null for metrics with fewer than 3 data points', () => {
      const twoEntries = mockEntries.slice(0, 2);
      const baseline = calculatePersonalBaseline(twoEntries);

      expect(baseline.count).toBe(2);
      expect(baseline.duration).toBeNull();
      expect(baseline.hrvLow).toBeNull();
      expect(baseline.restingHr).toBeNull();
    });

    it('handles sparse data where only some metrics have enough values', () => {
      const entries = [
        createMockEntry({ id: '1', durationMinutes: 420, hrvLow: 30 }),
        createMockEntry({ id: '2', durationMinutes: 480, hrvLow: null }),
        createMockEntry({ id: '3', durationMinutes: 450, hrvLow: null }),
        createMockEntry({ id: '4', durationMinutes: 510, hrvLow: null }),
      ];
      const baseline = calculatePersonalBaseline(entries);

      // Duration has 4 values → should have mean/std
      expect(baseline.duration).not.toBeNull();
      // HRV Low has only 1 value → should be null
      expect(baseline.hrvLow).toBeNull();
    });
  });

  describe('calculateSleepScore', () => {
    const baselineEntries = [
      createMockEntry({
        id: '1',
        durationMinutes: 450,
        hrvLow: 32,
        hrvHigh: 52,
        restingHr: 50,
        deepSleepPct: 20,
        remSleepPct: 22,
        awakePct: 7,
        movementCount: 10,
        sleepCyclesFull: 4,
        sleepCyclesPartial: 1,
      }),
      createMockEntry({
        id: '2',
        durationMinutes: 480,
        hrvLow: 35,
        hrvHigh: 55,
        restingHr: 48,
        deepSleepPct: 22,
        remSleepPct: 24,
        awakePct: 6,
        movementCount: 8,
        sleepCyclesFull: 5,
        sleepCyclesPartial: 0,
      }),
      createMockEntry({
        id: '3',
        durationMinutes: 420,
        hrvLow: 30,
        hrvHigh: 50,
        restingHr: 52,
        deepSleepPct: 18,
        remSleepPct: 20,
        awakePct: 8,
        movementCount: 12,
        sleepCyclesFull: 4,
        sleepCyclesPartial: 0,
      }),
      createMockEntry({
        id: '4',
        durationMinutes: 465,
        hrvLow: 33,
        hrvHigh: 53,
        restingHr: 49,
        deepSleepPct: 21,
        remSleepPct: 23,
        awakePct: 7,
        movementCount: 9,
        sleepCyclesFull: 4,
        sleepCyclesPartial: 1,
      }),
    ];

    it('returns null scores when baseline has insufficient data', () => {
      const smallBaseline = calculatePersonalBaseline(baselineEntries.slice(0, 2));
      const entry = createMockEntry();
      const score = calculateSleepScore(entry, smallBaseline);

      expect(score.overall).toBeNull();
      expect(score.componentsAvailable).toBe(0);
      expect(score.componentsTotal).toBe(4);
    });

    it('scores average sleep around baseline (65 points)', () => {
      const baseline = calculatePersonalBaseline(baselineEntries);
      const avgEntry = createMockEntry({
        durationMinutes: 454,
        hrvLow: 33,
        hrvHigh: 53,
        restingHr: 50,
        deepSleepPct: 20,
        remSleepPct: 22,
        awakePct: 7,
        movementCount: 10,
        sleepCyclesFull: 4,
        sleepCyclesPartial: 1,
      });

      const score = calculateSleepScore(avgEntry, baseline);
      expect(score.overall).toBeGreaterThanOrEqual(55);
      expect(score.overall).toBeLessThanOrEqual(75);
    });

    it('scores better-than-average sleep higher', () => {
      const baseline = calculatePersonalBaseline(baselineEntries);
      const goodEntry = createMockEntry({
        durationMinutes: 510,
        hrvLow: 42,
        hrvHigh: 65,
        restingHr: 44,
        deepSleepPct: 28,
        remSleepPct: 28,
        awakePct: 3,
        movementCount: 4,
        sleepCyclesFull: 6,
        sleepCyclesPartial: 0,
      });

      const score = calculateSleepScore(goodEntry, baseline);
      expect(score.overall).toBeGreaterThan(70);
    });

    it('scores worse-than-average sleep lower', () => {
      const baseline = calculatePersonalBaseline(baselineEntries);
      const poorEntry = createMockEntry({
        durationMinutes: 300,
        hrvLow: 22,
        hrvHigh: 38,
        restingHr: 60,
        deepSleepPct: 10,
        remSleepPct: 12,
        awakePct: 15,
        movementCount: 25,
        sleepCyclesFull: 2,
        sleepCyclesPartial: 0,
      });

      const score = calculateSleepScore(poorEntry, baseline);
      expect(score.overall).toBeLessThan(55);
    });

    it('clamps extreme scores to 0-100 range', () => {
      const baseline = calculatePersonalBaseline(baselineEntries);
      const extremeEntry = createMockEntry({
        durationMinutes: 600,
        hrvLow: 80,
        hrvHigh: 120,
        restingHr: 35,
        deepSleepPct: 40,
        remSleepPct: 35,
        awakePct: 0,
        movementCount: 0,
        sleepCyclesFull: 8,
        sleepCyclesPartial: 0,
      });

      const score = calculateSleepScore(extremeEntry, baseline);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });

    it('calculates partial scores when entry has missing data', () => {
      const baseline = calculatePersonalBaseline(baselineEntries);
      const sparseEntry = createMockEntry({
        durationMinutes: 480,
        hrvLow: null,
        hrvHigh: null,
        restingHr: null,
        deepSleepPct: null,
        remSleepPct: null,
        awakePct: null,
        movementCount: null,
        sleepCyclesFull: null,
        sleepCyclesPartial: null,
      });

      const score = calculateSleepScore(sparseEntry, baseline);
      expect(score.duration).not.toBeNull();
      expect(score.heartHealth).toBeNull();
      expect(score.sleepQuality).toBeNull();
      expect(score.restfulness).toBeNull();
      expect(score.componentsAvailable).toBe(1);
    });
  });

  describe('period filtering and comparison', () => {
    it('filters entries by date range correctly', () => {
      const entries = [
        createMockEntry({ id: '1', date: daysAgo(2) }),
        createMockEntry({ id: '2', date: daysAgo(5) }),
        createMockEntry({ id: '3', date: daysAgo(10) }),
        createMockEntry({ id: '4', date: daysAgo(25) }),
        createMockEntry({ id: '5', date: daysAgo(50) }),
      ];

      expect(filterEntriesByDateRange(entries, 'all').length).toBe(5);
      expect(filterEntriesByDateRange(entries, '1w').length).toBe(2);
      expect(filterEntriesByDateRange(entries, '1m').length).toBe(4);
    });

    it('gets previous period entries for comparison', () => {
      const entries = [
        createMockEntry({ id: '1', date: daysAgo(2) }), // Current week
        createMockEntry({ id: '2', date: daysAgo(5) }), // Current week
        createMockEntry({ id: '3', date: daysAgo(8) }), // Previous week
        createMockEntry({ id: '4', date: daysAgo(10) }), // Previous week
        createMockEntry({ id: '5', date: daysAgo(20) }), // Outside both
      ];

      const previous = getPreviousPeriodEntries(entries, '1w');
      expect(previous.length).toBe(2);
      expect(previous.map((e) => e.id).sort()).toEqual(['3', '4']);
    });

    it('returns empty array for previous period when using "all" range', () => {
      const entries = [createMockEntry({ id: '1', date: daysAgo(5) })];
      expect(getPreviousPeriodEntries(entries, 'all')).toEqual([]);
    });
  });

  describe('full period comparison flow', () => {
    it('calculates all metrics for current vs previous period comparison', () => {
      const allEntries = [
        // Current period - better sleep overall
        createMockEntry({
          id: '1',
          date: daysAgo(1),
          durationMinutes: 480,
          hrvLow: 35,
          hrvHigh: 58,
          restingHr: 48,
          deepSleepPct: 22,
          remSleepPct: 24,
        }),
        createMockEntry({
          id: '2',
          date: daysAgo(3),
          durationMinutes: 510,
          hrvLow: 38,
          hrvHigh: 62,
          restingHr: 46,
          deepSleepPct: 24,
          remSleepPct: 26,
        }),
        createMockEntry({
          id: '3',
          date: daysAgo(5),
          durationMinutes: 465,
          hrvLow: 32,
          hrvHigh: 55,
          restingHr: 50,
          deepSleepPct: 20,
          remSleepPct: 22,
        }),
        // Previous period - worse sleep overall
        createMockEntry({
          id: '4',
          date: daysAgo(8),
          durationMinutes: 390,
          hrvLow: 28,
          hrvHigh: 45,
          restingHr: 55,
          deepSleepPct: 16,
          remSleepPct: 18,
        }),
        createMockEntry({
          id: '5',
          date: daysAgo(10),
          durationMinutes: 360,
          hrvLow: 25,
          hrvHigh: 42,
          restingHr: 58,
          deepSleepPct: 14,
          remSleepPct: 16,
        }),
        createMockEntry({
          id: '6',
          date: daysAgo(12),
          durationMinutes: 420,
          hrvLow: 30,
          hrvHigh: 48,
          restingHr: 54,
          deepSleepPct: 18,
          remSleepPct: 20,
        }),
      ];

      const currentEntries = filterEntriesByDateRange(allEntries, '1w');
      const previousEntries = getPreviousPeriodEntries(allEntries, '1w');

      const currentStats = calculateDetailedStats(currentEntries)!;
      const previousStats = calculateDetailedStats(previousEntries)!;

      // Duration comparison
      expect(currentStats.duration.avg).toBe(485); // (480+510+465)/3
      expect(previousStats.duration.avg).toBe(390); // (390+360+420)/3
      expect(currentStats.duration.avg - previousStats.duration.avg).toBe(95);

      // HRV comparison (higher is better)
      expect(currentStats.hrvLow.avg).toBe(35); // (35+38+32)/3
      expect(previousStats.hrvLow.avg).toBe(28); // (28+25+30)/3
      expect(currentStats.hrvHigh.avg).toBe(58); // (58+62+55)/3
      expect(previousStats.hrvHigh.avg).toBe(45); // (45+42+48)/3

      // Resting HR comparison (lower is better)
      expect(currentStats.restingHr.avg).toBe(48); // (48+46+50)/3
      expect(previousStats.restingHr.avg).toBe(56); // (55+58+54)/3

      // Restorative % comparison (deep + REM)
      expect(currentStats.restorative.avg).toBe(46); // (46+50+42)/3
      expect(previousStats.restorative.avg).toBe(34); // (34+30+38)/3

      // Min/max for key metrics
      expect(currentStats.duration.min).toBe(465);
      expect(currentStats.duration.max).toBe(510);
      expect(previousStats.duration.min).toBe(360);
      expect(previousStats.duration.max).toBe(420);
    });

    it('calculates 1-month period comparison correctly', () => {
      const allEntries = [
        // Current month
        createMockEntry({ id: '1', date: daysAgo(5), durationMinutes: 480, hrvHigh: 55 }),
        createMockEntry({ id: '2', date: daysAgo(15), durationMinutes: 450, hrvHigh: 52 }),
        createMockEntry({ id: '3', date: daysAgo(25), durationMinutes: 470, hrvHigh: 58 }),
        // Previous month (31-60 days ago)
        createMockEntry({ id: '4', date: daysAgo(35), durationMinutes: 400, hrvHigh: 45 }),
        createMockEntry({ id: '5', date: daysAgo(45), durationMinutes: 380, hrvHigh: 42 }),
        createMockEntry({ id: '6', date: daysAgo(55), durationMinutes: 420, hrvHigh: 48 }),
      ];

      const currentEntries = filterEntriesByDateRange(allEntries, '1m');
      const previousEntries = getPreviousPeriodEntries(allEntries, '1m');

      expect(currentEntries.length).toBe(3);
      expect(previousEntries.length).toBe(3);

      const currentStats = calculateDetailedStats(currentEntries)!;
      const previousStats = calculateDetailedStats(previousEntries)!;

      // Current month: (480+450+470)/3 = 467
      expect(currentStats.duration.avg).toBe(467);
      // Previous month: (400+380+420)/3 = 400
      expect(previousStats.duration.avg).toBe(400);

      // HRV improved
      expect(currentStats.hrvHigh.avg).toBe(55); // (55+52+58)/3
      expect(previousStats.hrvHigh.avg).toBe(45); // (45+42+48)/3
    });

    it('handles previous period with partial null data', () => {
      const allEntries = [
        // Current period - complete data
        createMockEntry({
          id: '1',
          date: daysAgo(2),
          durationMinutes: 480,
          hrvHigh: 55,
          deepSleepPct: 22,
          remSleepPct: 24,
        }),
        createMockEntry({
          id: '2',
          date: daysAgo(4),
          durationMinutes: 450,
          hrvHigh: 52,
          deepSleepPct: 20,
          remSleepPct: 22,
        }),
        // Previous period - some null values (older data often incomplete)
        createMockEntry({
          id: '3',
          date: daysAgo(8),
          durationMinutes: 420,
          hrvHigh: 48,
          deepSleepPct: 18,
          remSleepPct: null, // missing REM data
        }),
        createMockEntry({
          id: '4',
          date: daysAgo(10),
          durationMinutes: 400,
          hrvHigh: null, // missing HRV
          deepSleepPct: null,
          remSleepPct: null,
        }),
      ];

      const currentEntries = filterEntriesByDateRange(allEntries, '1w');
      const previousEntries = getPreviousPeriodEntries(allEntries, '1w');

      const currentStats = calculateDetailedStats(currentEntries)!;
      const previousStats = calculateDetailedStats(previousEntries)!;

      // Duration still works for both periods
      expect(currentStats.duration.avg).toBe(465); // (480+450)/2
      expect(previousStats.duration.avg).toBe(410); // (420+400)/2

      // HRV: current has 2 values, previous has only 1
      expect(currentStats.hrvHigh.avg).toBe(54); // (55+52)/2
      expect(previousStats.hrvHigh.avg).toBe(48); // only 1 value

      // Restorative: current has 2 values, previous has only 1 (entry 3 has deep but no REM)
      expect(currentStats.restorative.avg).toBe(44); // (46+42)/2
      expect(previousStats.restorative.avg).toBe(18); // only entry 3 has partial data
    });

    it('handles missing previous period gracefully', () => {
      const allEntries = [
        createMockEntry({ id: '1', date: daysAgo(1) }),
        createMockEntry({ id: '2', date: daysAgo(3) }),
      ];

      const previousEntries = getPreviousPeriodEntries(allEntries, '1w');
      const previousStats = calculateDetailedStats(previousEntries);

      expect(previousEntries).toEqual([]);
      expect(previousStats).toBeNull();
    });
  });
});
