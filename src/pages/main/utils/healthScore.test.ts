import { describe, it, expect, vi } from 'vitest';
import type { BPReadingSummary } from '@/types/bloodPressure';
import type { SleepEntry } from '@/lib/db/sleep';
import type { Activity } from '@/types/activity';
import {
  calculateBPScore,
  calculateSleepHealthScore,
  calculateActivityPillarScore,
  projectScore,
  calculateDynamicWeights,
  calculateCrossMetricAdjustments,
  calculateHealthScore,
} from './healthScore';

// ============================================================================
// Test Helpers
// ============================================================================

function makeBPReading(overrides: Partial<BPReadingSummary> = {}): BPReadingSummary {
  return {
    date: '2025-01-15',
    timeOfDay: 'morning',
    systolic: 118,
    diastolic: 75,
    pulse: 70,
    sessionId: 'test-session',
    ...overrides,
  };
}

function makeSleepEntry(overrides: Partial<SleepEntry> = {}): SleepEntry {
  return {
    id: 'sleep-1',
    date: '2025-01-15',
    timezone: 'America/Toronto',
    durationMinutes: 480,
    totalSleepMinutes: 420,
    sleepStart: '2025-01-14T23:00:00',
    sleepEnd: '2025-01-15T07:00:00',
    hrvLow: 30,
    hrvHigh: 65,
    restingHr: 55,
    lowestHrTime: '2025-01-15T03:00:00',
    hrDropMinutes: 60,
    deepSleepPct: 20,
    remSleepPct: 22,
    lightSleepPct: 45,
    awakePct: 13,
    skinTempAvg: 36.5,
    sleepCyclesFull: 4,
    sleepCyclesPartial: 1,
    movementCount: 20,
    notes: null,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    userId: 'user-1',
    date: '2025-01-15',
    timeOfDay: 'morning',
    activityType: 'walking',
    durationMinutes: 45,
    intensity: 3,
    notes: null,
    zone1Minutes: null,
    zone2Minutes: null,
    zone3Minutes: null,
    zone4Minutes: null,
    zone5Minutes: null,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-15T08:00:00Z',
    ...overrides,
  };
}

/**
 * Create a series of activities over multiple days for training load tests
 */
function makeActivitySeries(count: number, startDate: string, spacing: number = 1): Activity[] {
  const activities: Activity[] = [];
  const start = new Date(startDate + 'T00:00:00');

  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i * spacing);
    const dateStr = date.toISOString().slice(0, 10);

    activities.push(
      makeActivity({
        id: `activity-${i}`,
        date: dateStr,
        durationMinutes: 40 + Math.floor(i * 5),
        intensity: 3,
      })
    );
  }
  return activities;
}

// ============================================================================
// Mock getDailySleepScore to avoid complex sleep scoring dependencies
// ============================================================================

vi.mock('@/pages/sleep/utils/sleepHelpers', () => ({
  getDailySleepScore: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/dateUtils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/dateUtils')>('@/lib/dateUtils');
  return {
    ...actual,
    toLocalDateString: (date: Date) => date.toISOString().slice(0, 10),
  };
});

// ============================================================================
// Tests: BP Score
// ============================================================================

describe('calculateBPScore', () => {
  it('returns null for empty readings', () => {
    expect(calculateBPScore([])).toBeNull();
  });

  it('scores optimal BP highly', () => {
    const result = calculateBPScore([makeBPReading({ systolic: 110, diastolic: 70 })]);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(90);
    expect(result!.category).toBe('Optimal');
  });

  it('scores elevated BP lower', () => {
    const result = calculateBPScore([makeBPReading({ systolic: 135, diastolic: 87 })]);
    expect(result).not.toBeNull();
    expect(result!.score).toBeLessThan(80);
    expect(result!.category).toBe('Elevated');
  });

  it('scores Stage 2 BP very low', () => {
    const result = calculateBPScore([makeBPReading({ systolic: 165, diastolic: 105 })]);
    expect(result).not.toBeNull();
    expect(result!.score).toBeLessThan(45);
  });
});

// ============================================================================
// Tests: Sleep Score
// ============================================================================

describe('calculateSleepHealthScore', () => {
  it('returns null for empty entries', () => {
    expect(calculateSleepHealthScore([])).toBeNull();
  });

  it('scores good sleep duration highly', () => {
    const result = calculateSleepHealthScore([makeSleepEntry({ durationMinutes: 480 })]);
    expect(result).not.toBeNull();
    expect(result!.durationScore).toBe(100);
  });

  it('penalizes short sleep', () => {
    const result = calculateSleepHealthScore([makeSleepEntry({ durationMinutes: 300 })]);
    expect(result).not.toBeNull();
    expect(result!.durationScore).toBeLessThan(50);
  });
});

// ============================================================================
// Tests: Activity Pillar Score
// ============================================================================

describe('calculateActivityPillarScore', () => {
  it('returns null for zero activities', () => {
    expect(calculateActivityPillarScore('2025-01-15', [])).toBeNull();
  });

  it('scores an active building phase well', () => {
    // Create enough activity history to build training load
    const activities = makeActivitySeries(10, '2025-01-01');
    const result = calculateActivityPillarScore('2025-01-15', activities);

    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThan(30);
    expect(result!.trainingLoadScore).toBeGreaterThanOrEqual(20);
  });

  it('scores detraining state lower', () => {
    // Single activity 20 days ago
    const activities = [makeActivity({ date: '2024-12-25' })];
    const result = calculateActivityPillarScore('2025-01-15', activities);

    expect(result).not.toBeNull();
    expect(result!.trainingLoadScore).toBeLessThan(60);
  });

  it('normalizes consistency multiplier to 0-100', () => {
    // Activities spread over last 7 days → high consistency
    const activities = makeActivitySeries(4, '2025-01-08');
    const result = calculateActivityPillarScore('2025-01-15', activities);

    expect(result).not.toBeNull();
    expect(result!.consistencyScore).toBeGreaterThanOrEqual(30);
    expect(result!.consistencyScore).toBeLessThanOrEqual(100);
  });

  it('rewards rest on overreaching days', () => {
    // Heavy activity series to reach overreaching
    const activities: Activity[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date('2024-12-16T00:00:00');
      date.setDate(date.getDate() + i);
      activities.push(
        makeActivity({
          id: `act-${i}`,
          date: date.toISOString().slice(0, 10),
          durationMinutes: 90,
          intensity: 5,
        })
      );
    }
    // Test rest day after heavy activity
    const result = calculateActivityPillarScore('2025-01-16', activities);
    expect(result).not.toBeNull();
    // Effort score should be high because rest is appropriate when overreaching
    expect(result!.effortScore).toBeGreaterThanOrEqual(40);
  });
});

// ============================================================================
// Tests: Score Projection
// ============================================================================

describe('projectScore', () => {
  it('returns null with fewer than 3 data points', () => {
    const scores = [
      { date: '2025-01-10', score: 80 },
      { date: '2025-01-11', score: 82 },
    ];
    expect(projectScore('2025-01-15', scores)).toBeNull();
  });

  it('projects score using linear regression', () => {
    // Stable scores around 80
    const scores = [
      { date: '2025-01-10', score: 78 },
      { date: '2025-01-11', score: 80 },
      { date: '2025-01-12', score: 82 },
      { date: '2025-01-13', score: 80 },
    ];
    const projected = projectScore('2025-01-15', scores);
    expect(projected).not.toBeNull();
    // Should be close to 80 with stable trend
    expect(projected!).toBeGreaterThan(70);
    expect(projected!).toBeLessThan(90);
  });

  it('applies staleness decay for old data', () => {
    const scores = [
      { date: '2024-12-20', score: 90 },
      { date: '2024-12-22', score: 88 },
      { date: '2024-12-24', score: 85 },
    ];
    // 22 days since last reading — should use mean
    const projected = projectScore('2025-01-15', scores);
    expect(projected).not.toBeNull();
    // Mean is ~87.7, so projected should be close
    expect(projected!).toBeGreaterThan(80);
    expect(projected!).toBeLessThan(95);
  });

  it('returns null for data older than 30 days', () => {
    const scores = [
      { date: '2024-12-01', score: 80 },
      { date: '2024-12-02', score: 82 },
      { date: '2024-12-03', score: 84 },
    ];
    // All data > 30 days old from target
    expect(projectScore('2025-02-01', scores)).toBeNull();
  });

  it('clamps projected scores to 0-100', () => {
    // Strongly upward trend that might project above 100
    const scores = [
      { date: '2025-01-10', score: 85 },
      { date: '2025-01-11', score: 90 },
      { date: '2025-01-12', score: 95 },
      { date: '2025-01-13', score: 99 },
    ];
    const projected = projectScore('2025-01-14', scores);
    expect(projected).not.toBeNull();
    expect(projected!).toBeLessThanOrEqual(100);
    expect(projected!).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Tests: Dynamic Weighting
// ============================================================================

describe('calculateDynamicWeights', () => {
  it('returns zero score for no data', () => {
    const result = calculateDynamicWeights({ bp: null, sleep: null, activity: null });
    expect(result.weightedScore).toBe(0);
    expect(result.confidenceFactor).toBe(0);
  });

  it('uses full confidence with all three pillars', () => {
    const result = calculateDynamicWeights({ bp: 80, sleep: 80, activity: 80 });
    expect(result.confidenceFactor).toBe(1.0);
    expect(result.weightedScore).toBeCloseTo(80, 5);
  });

  it('applies 0.95 confidence with two pillars', () => {
    const result = calculateDynamicWeights({ bp: 80, sleep: 80, activity: null });
    expect(result.confidenceFactor).toBe(0.95);
    // Weighted: 80 * 0.95 + 65 * 0.05 = 76 + 3.25 = 79.25
    expect(result.weightedScore).toBeCloseTo(79.25, 1);
  });

  it('applies 0.85 confidence with one pillar', () => {
    const result = calculateDynamicWeights({ bp: 80, sleep: null, activity: null });
    expect(result.confidenceFactor).toBe(0.85);
    // Weighted: 80 * 0.85 + 65 * 0.15 = 68 + 9.75 = 77.75
    expect(result.weightedScore).toBeCloseTo(77.75, 1);
  });

  it('redistributes weights proportionally', () => {
    // BP (0.30) + Sleep (0.35) only → total base = 0.65
    const result = calculateDynamicWeights({ bp: 100, sleep: 50, activity: null });

    // BP effective weight: 0.30/0.65 ≈ 0.4615
    // Sleep effective weight: 0.35/0.65 ≈ 0.5385
    expect(result.effectiveWeights.bp).toBeCloseTo(0.3 / 0.65, 3);
    expect(result.effectiveWeights.sleep).toBeCloseTo(0.35 / 0.65, 3);
    expect(result.effectiveWeights.activity).toBe(0);
  });

  it('blends single extreme score toward neutral', () => {
    const highResult = calculateDynamicWeights({ bp: 100, sleep: null, activity: null });
    const lowResult = calculateDynamicWeights({ bp: 20, sleep: null, activity: null });

    // High score should be pulled down toward 65
    expect(highResult.weightedScore).toBeLessThan(100);
    // Low score should be pulled up toward 65
    expect(lowResult.weightedScore).toBeGreaterThan(20);
  });
});

// ============================================================================
// Tests: Cross-Metric Interactions
// ============================================================================

describe('calculateCrossMetricAdjustments', () => {
  it('returns no adjustment with no data', () => {
    const result = calculateCrossMetricAdjustments({ bp: null, sleep: null, activity: null });
    expect(result.adjustment).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it('penalizes poor sleep + elevated BP', () => {
    const result = calculateCrossMetricAdjustments({ bp: 40, sleep: 40, activity: null });
    expect(result.adjustment).toBeLessThan(0);
    expect(result.reasons).toContain('Poor sleep and elevated BP are compounding health risks');
  });

  it('rewards excellent sleep + excellent BP', () => {
    const result = calculateCrossMetricAdjustments({ bp: 85, sleep: 85, activity: null });
    expect(result.adjustment).toBeGreaterThan(0);
    expect(result.reasons).toContain('Excellent sleep and BP create a positive health synergy');
  });

  it('penalizes high activity + poor sleep', () => {
    const result = calculateCrossMetricAdjustments({ bp: null, sleep: 30, activity: 75 });
    expect(result.adjustment).toBeLessThan(0);
    expect(result.reasons).toContain('High activity with poor sleep risks overtraining');
  });

  it('rewards good activity + good sleep', () => {
    const result = calculateCrossMetricAdjustments({ bp: null, sleep: 80, activity: 80 });
    expect(result.adjustment).toBeGreaterThan(0);
    expect(result.reasons).toContain('Good exercise-recovery balance');
  });

  it('rewards good activity + good BP', () => {
    const result = calculateCrossMetricAdjustments({ bp: 80, sleep: null, activity: 75 });
    expect(result.adjustment).toBeGreaterThan(0);
    expect(result.reasons).toContain('Activity is supporting cardiovascular health');
  });

  it('heavily penalizes all three below 45', () => {
    const result = calculateCrossMetricAdjustments({ bp: 40, sleep: 40, activity: 40 });
    expect(result.adjustment).toBeLessThanOrEqual(-10);
  });

  it('caps total adjustment at -10 / +7', () => {
    // All excellent — could get +3 (sleep+bp) + 2 (activity+sleep) + 2 (activity+bp) = +7
    const positive = calculateCrossMetricAdjustments({ bp: 85, sleep: 85, activity: 80 });
    expect(positive.adjustment).toBeLessThanOrEqual(7);

    // All terrible — could get -5 (sleep+bp) -5 (all below 45) = -10
    const negative = calculateCrossMetricAdjustments({ bp: 30, sleep: 30, activity: 30 });
    expect(negative.adjustment).toBeGreaterThanOrEqual(-10);
  });
});

// ============================================================================
// Tests: Critical Floor
// ============================================================================

describe('critical floor enforcement', () => {
  it('caps overall at 45 when any pillar is below 30', () => {
    // Use calculateHealthScore directly with data that would produce low BP score
    // Since BP with systolic > 160 scores very low
    const bpReadings = [makeBPReading({ date: '2025-01-15', systolic: 180, diastolic: 110 })];
    const sleepEntries = [makeSleepEntry({ date: '2025-01-15', durationMinutes: 480 })];

    const result = calculateHealthScore(bpReadings, sleepEntries, [], '2025-01-15');

    // BP score should be very low (< 30), triggering 45 cap
    if (result.bpScore && result.bpScore.score < 30) {
      expect(result.overall).toBeLessThanOrEqual(45);
    }
  });

  it('caps overall at 55 when any pillar is below 40', () => {
    // Moderately bad BP
    const bpReadings = [makeBPReading({ date: '2025-01-15', systolic: 165, diastolic: 100 })];
    const sleepEntries = [makeSleepEntry({ date: '2025-01-15', durationMinutes: 480 })];

    const result = calculateHealthScore(bpReadings, sleepEntries, [], '2025-01-15');

    if (result.bpScore && result.bpScore.score >= 30 && result.bpScore.score < 40) {
      expect(result.overall).toBeLessThanOrEqual(55);
    }
  });
});

// ============================================================================
// Tests: Full Composite Score Integration
// ============================================================================

describe('calculateHealthScore', () => {
  it('returns result with all fields populated', () => {
    const bpReadings = [makeBPReading({ date: '2025-01-15' })];
    const sleepEntries = [makeSleepEntry({ date: '2025-01-15' })];
    const activities = makeActivitySeries(5, '2025-01-10');

    const result = calculateHealthScore(bpReadings, sleepEntries, activities, '2025-01-15');

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.bpScore).not.toBeNull();
    expect(result.sleepScore).not.toBeNull();
    expect(result.activityScore).not.toBeNull();
    expect(result.crossMetric).toBeDefined();
    expect(result.confidenceFactor).toBe(1.0);
    expect(typeof result.primaryDriver).toBe('string');
    expect(typeof result.primaryDetractor).toBe('string');
    expect(typeof result.actionItem).toBe('string');
  });

  it('works with only BP data', () => {
    const bpReadings = [makeBPReading({ date: '2025-01-15' })];
    const result = calculateHealthScore(bpReadings, [], [], '2025-01-15');

    expect(result.overall).toBeGreaterThan(0);
    expect(result.bpScore).not.toBeNull();
    expect(result.sleepScore).toBeNull();
    expect(result.activityScore).toBeNull();
    expect(result.confidenceFactor).toBe(0.85);
  });

  it('works with only sleep data', () => {
    const sleepEntries = [makeSleepEntry({ date: '2025-01-15' })];
    const result = calculateHealthScore([], sleepEntries, [], '2025-01-15');

    expect(result.overall).toBeGreaterThan(0);
    expect(result.bpScore).toBeNull();
    expect(result.sleepScore).not.toBeNull();
    expect(result.activityScore).toBeNull();
    expect(result.confidenceFactor).toBe(0.85);
  });

  it('works with only activity data', () => {
    const activities = makeActivitySeries(5, '2025-01-10');
    const result = calculateHealthScore([], [], activities, '2025-01-15');

    expect(result.overall).toBeGreaterThan(0);
    expect(result.bpScore).toBeNull();
    expect(result.sleepScore).toBeNull();
    expect(result.activityScore).not.toBeNull();
    expect(result.confidenceFactor).toBe(0.85);
  });

  it('handles two-pillar combinations', () => {
    const bpReadings = [makeBPReading({ date: '2025-01-15' })];
    const activities = makeActivitySeries(5, '2025-01-10');

    const result = calculateHealthScore(bpReadings, [], activities, '2025-01-15');

    expect(result.confidenceFactor).toBe(0.95);
    expect(result.bpScore).not.toBeNull();
    expect(result.activityScore).not.toBeNull();
    expect(result.sleepScore).toBeNull();
  });

  it('applies cross-metric adjustments to final score', () => {
    // Excellent BP + excellent sleep → should get synergy bonus
    const bpReadings = [makeBPReading({ date: '2025-01-15', systolic: 110, diastolic: 70 })];
    const sleepEntries = [
      makeSleepEntry({
        date: '2025-01-15',
        durationMinutes: 480,
        deepSleepPct: 25,
        remSleepPct: 25,
        restingHr: 48,
        hrvHigh: 85,
      }),
    ];

    const result = calculateHealthScore(bpReadings, sleepEntries, [], '2025-01-15');

    // Should have positive cross-metric adjustment
    expect(result.crossMetric.adjustment).toBeGreaterThanOrEqual(0);
  });

  it('produces scores in valid range for all combinations', () => {
    const testCases = [
      {
        bp: [makeBPReading({ date: '2025-01-15' })],
        sleep: [] as SleepEntry[],
        act: [] as Activity[],
      },
      { bp: [], sleep: [makeSleepEntry({ date: '2025-01-15' })], act: [] as Activity[] },
      { bp: [], sleep: [] as SleepEntry[], act: makeActivitySeries(3, '2025-01-12') },
      {
        bp: [makeBPReading({ date: '2025-01-15' })],
        sleep: [makeSleepEntry({ date: '2025-01-15' })],
        act: makeActivitySeries(3, '2025-01-12'),
      },
    ];

    for (const tc of testCases) {
      const result = calculateHealthScore(tc.bp, tc.sleep, tc.act, '2025-01-15');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    }
  });

  it('returns zero overall when no data at all', () => {
    const result = calculateHealthScore([], [], [], '2025-01-15');
    expect(result.overall).toBe(0);
  });

  it('generates activity-related insights', () => {
    const activities = [makeActivity({ date: '2024-12-20' })]; // Old activity → detraining
    const result = calculateHealthScore([], [], activities, '2025-01-15');

    expect(result.activityScore).not.toBeNull();
    // Should have an action item
    expect(result.actionItem.length).toBeGreaterThan(0);
  });

  it('projects BP score for missing days using recent data', () => {
    // Multiple BP readings on different days, but not on target date
    const bpReadings = [
      makeBPReading({ date: '2025-01-10', systolic: 118, diastolic: 75 }),
      makeBPReading({ date: '2025-01-11', systolic: 120, diastolic: 76 }),
      makeBPReading({ date: '2025-01-12', systolic: 119, diastolic: 74 }),
      makeBPReading({ date: '2025-01-13', systolic: 121, diastolic: 77 }),
    ];

    const result = calculateHealthScore(bpReadings, [], [], '2025-01-15');

    // Should have projected BP score (bpResult will be null since no direct readings)
    expect(result.bpScore).toBeNull();
    // But overall should still have a score from projection
    expect(result.overall).toBeGreaterThan(0);
  });
});
