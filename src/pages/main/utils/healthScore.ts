/**
 * Health Score Algorithm
 *
 * Calculates a composite health score (0-100) based on BP and Sleep data.
 * The algorithm accounts for averages, variability, and trends.
 */

import type { SleepEntry } from '@/lib/db/sleep';
import type { BPReadingSummary } from '@/types/bloodPressure';
import { avg, avgRounded, standardDeviation } from '@/lib/statsUtils';
import { getDailySleepScore } from '@/pages/sleep/utils/sleepHelpers';

// ============================================================================
// BLOOD PRESSURE SCORE (50% of total)
// ============================================================================

interface BPScoreResult {
  score: number;
  baseScore: number;
  variabilityPenalty: number;
  trendModifier: number;
  avgSystolic: number;
  avgDiastolic: number;
  category: string;
}

/**
 * Calculate BP score from readings
 * Base score from BP category, penalties for variability, bonuses for trends
 */
export function calculateBPScore(readings: BPReadingSummary[]): BPScoreResult | null {
  if (!readings || readings.length === 0) return null;

  const systolics = readings.map((r) => r.systolic);
  const diastolics = readings.map((r) => r.diastolic);

  const avgSystolic = avg(systolics)!;
  const avgDiastolic = avg(diastolics)!;

  // Base score from BP category (interpolated for precision)
  const baseScore = getBPBaseScore(avgSystolic, avgDiastolic);
  const category = getBPCategoryLabel(avgSystolic, avgDiastolic);

  // Variability penalty (coefficient of variation)
  const variabilityPenalty = calculateVariabilityPenalty(systolics, diastolics);

  // Trend modifier (compare recent vs older readings)
  const trendModifier = calculateBPTrendModifier(readings);

  // Final score with clamp
  const score = Math.max(0, Math.min(100, baseScore - variabilityPenalty + trendModifier));

  return {
    score: Math.round(score),
    baseScore: Math.round(baseScore),
    variabilityPenalty: Math.round(variabilityPenalty),
    trendModifier: Math.round(trendModifier),
    avgSystolic: avgRounded(systolics)!,
    avgDiastolic: avgRounded(diastolics)!,
    category,
  };
}

/**
 * Get base score from average BP values
 * Uses continuous interpolation rather than discrete categories
 */
function getBPBaseScore(systolic: number, diastolic: number): number {
  // Optimal: < 120/80 → 100 points
  // Normal: 120-129/80-84 → 85 points
  // Elevated: 130-139/85-89 → 70 points
  // Stage 1: 140-159/90-99 → 50 points
  // Stage 2: ≥160/≥100 → 30 points

  // Use the worse of systolic or diastolic for scoring
  const sysScore = getSystolicScore(systolic);
  const diaScore = getDiastolicScore(diastolic);

  return Math.min(sysScore, diaScore);
}

function getSystolicScore(systolic: number): number {
  if (systolic < 110) return 100;
  if (systolic < 120) return 100 - ((systolic - 110) / 10) * 5; // 100 → 95
  if (systolic < 130) return 95 - ((systolic - 120) / 10) * 15; // 95 → 80
  if (systolic < 140) return 80 - ((systolic - 130) / 10) * 15; // 80 → 65
  if (systolic < 160) return 65 - ((systolic - 140) / 20) * 20; // 65 → 45
  return Math.max(20, 45 - ((systolic - 160) / 20) * 15); // 45 → 30 → 20
}

function getDiastolicScore(diastolic: number): number {
  if (diastolic < 75) return 100;
  if (diastolic < 80) return 100 - ((diastolic - 75) / 5) * 5; // 100 → 95
  if (diastolic < 85) return 95 - ((diastolic - 80) / 5) * 15; // 95 → 80
  if (diastolic < 90) return 80 - ((diastolic - 85) / 5) * 15; // 80 → 65
  if (diastolic < 100) return 65 - ((diastolic - 90) / 10) * 20; // 65 → 45
  return Math.max(20, 45 - ((diastolic - 100) / 10) * 15); // 45 → 30 → 20
}

function getBPCategoryLabel(systolic: number, diastolic: number): string {
  if (systolic < 120 && diastolic < 80) return 'Optimal';
  if (systolic < 130 && diastolic < 85) return 'Normal';
  if (systolic < 140 && diastolic < 90) return 'Elevated';
  if (systolic < 160 && diastolic < 100) return 'Stage 1';
  return 'Stage 2';
}

/**
 * Calculate variability penalty based on coefficient of variation
 * High variability indicates less stable BP control
 */
function calculateVariabilityPenalty(systolics: number[], diastolics: number[]): number {
  if (systolics.length < 3) return 0; // Need enough data for meaningful variability

  const sysStdDev = standardDeviation(systolics);
  const diaStdDev = standardDeviation(diastolics);

  const sysMean = avg(systolics)!;
  const diaMean = avg(diastolics)!;

  // Coefficient of variation (CV) = stdDev / mean
  const sysCV = (sysStdDev / sysMean) * 100;
  const diaCV = (diaStdDev / diaMean) * 100;
  const avgCV = (sysCV + diaCV) / 2;

  // Penalty scale: CV > 12% = -15, CV 8-12% = -10, CV 5-8% = -5, CV < 5% = 0
  if (avgCV > 12) return 15;
  if (avgCV > 8) return 10;
  if (avgCV > 5) return 5;
  return 0;
}

/**
 * Calculate trend modifier by comparing recent readings to older ones
 */
function calculateBPTrendModifier(readings: BPReadingSummary[]): number {
  if (readings.length < 4) return 0; // Need enough data for trend

  // Sort by date
  const sorted = [...readings].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Split into halves
  const midpoint = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, midpoint);
  const recent = sorted.slice(midpoint);

  const olderAvgSys = older.reduce((sum, r) => sum + r.systolic, 0) / older.length;
  const recentAvgSys = recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length;

  const olderAvgDia = older.reduce((sum, r) => sum + r.diastolic, 0) / older.length;
  const recentAvgDia = recent.reduce((sum, r) => sum + r.diastolic, 0) / recent.length;

  // Combined difference (negative = improving for BP)
  const sysDiff = recentAvgSys - olderAvgSys;
  const diaDiff = recentAvgDia - olderAvgDia;
  const avgDiff = (sysDiff + diaDiff) / 2;

  // Modifier: improving by >5 = +10, improving by 2-5 = +5
  // Worsening by >5 = -10, worsening by 2-5 = -5
  if (avgDiff < -5) return 10;
  if (avgDiff < -2) return 5;
  if (avgDiff > 5) return -10;
  if (avgDiff > 2) return -5;
  return 0;
}

// ============================================================================
// SLEEP SCORE (50% of total)
// ============================================================================

interface SleepScoreResult {
  score: number;
  durationScore: number;
  restorativeScore: number;
  heartScore: number;
  consistencyBonus: number;
  avgDurationMinutes: number;
  avgRestorative: number | null;
}

/**
 * Calculate sleep score from entries
 */
export function calculateSleepHealthScore(entries: SleepEntry[]): SleepScoreResult | null {
  if (!entries || entries.length === 0) return null;

  // Duration component (40% of sleep score)
  const durationScore = calculateDurationScore(entries);

  // Restorative component (30% of sleep score)
  const restorativeScore = calculateRestorativeScore(entries);

  // Heart metrics component (30% of sleep score)
  const heartScore = calculateHeartScore(entries);

  // Consistency bonus/penalty
  const consistencyBonus = calculateConsistencyBonus(entries);

  // Calculate averages for display
  const durations = entries.map((e) => e.durationMinutes);
  const avgDurationMinutes = avgRounded(durations)!;

  const entriesWithRestorative = entries.filter(
    (e) => e.deepSleepPct !== null || e.remSleepPct !== null
  );
  const restorativeValues = entriesWithRestorative.map(
    (e) => (e.deepSleepPct || 0) + (e.remSleepPct || 0)
  );
  const avgRestorative = avgRounded(restorativeValues);

  // Weighted combination
  const weightedScore =
    durationScore * 0.4 + restorativeScore * 0.3 + heartScore * 0.3 + consistencyBonus;

  const score = Math.max(0, Math.min(100, weightedScore));

  return {
    score: Math.round(score),
    durationScore: Math.round(durationScore),
    restorativeScore: Math.round(restorativeScore),
    heartScore: Math.round(heartScore),
    consistencyBonus: Math.round(consistencyBonus),
    avgDurationMinutes,
    avgRestorative,
  };
}

/**
 * Score based on sleep duration
 * Optimal: 7-9 hours, penalties for too short or too long
 */
function calculateDurationScore(entries: SleepEntry[]): number {
  const durations = entries.map((e) => e.durationMinutes);
  const avgMinutes = avg(durations)!;
  const avgHours = avgMinutes / 60;

  // Scoring curve
  if (avgHours >= 7 && avgHours <= 9) return 100;
  if (avgHours >= 6.5 && avgHours < 7) return 85;
  if (avgHours > 9 && avgHours <= 9.5) return 85;
  if (avgHours >= 6 && avgHours < 6.5) return 70;
  if (avgHours > 9.5 && avgHours <= 10) return 70;
  if (avgHours >= 5.5 && avgHours < 6) return 55;
  if (avgHours > 10 && avgHours <= 10.5) return 55;
  if (avgHours >= 5 && avgHours < 5.5) return 40;
  if (avgHours > 10.5 && avgHours <= 11) return 40;
  return 25; // < 5h or > 11h
}

/**
 * Score based on restorative sleep percentage (deep + REM)
 */
function calculateRestorativeScore(entries: SleepEntry[]): number {
  const entriesWithData = entries.filter((e) => e.deepSleepPct !== null || e.remSleepPct !== null);

  if (entriesWithData.length === 0) return 70; // Neutral score if no data

  const restorativeValues = entriesWithData.map(
    (e) => (e.deepSleepPct || 0) + (e.remSleepPct || 0)
  );
  const avgRestorative = avg(restorativeValues)!;

  if (avgRestorative >= 45) return 100;
  if (avgRestorative >= 40) return 90;
  if (avgRestorative >= 35) return 80;
  if (avgRestorative >= 30) return 70;
  if (avgRestorative >= 25) return 55;
  if (avgRestorative >= 20) return 40;
  return 25;
}

/**
 * Score based on heart metrics (RHR and HRV)
 */
function calculateHeartScore(entries: SleepEntry[]): number {
  const scores: number[] = [];

  // RHR score (lower is better for resting HR)
  const entriesWithRhr = entries.filter((e) => e.restingHr !== null);
  if (entriesWithRhr.length > 0) {
    const rhrValues = entriesWithRhr.map((e) => e.restingHr!);
    const avgRhr = avg(rhrValues)!;

    // RHR scoring: < 50 = excellent, 50-60 = good, 60-70 = average, > 70 = needs attention
    let rhrScore: number;
    if (avgRhr < 50) rhrScore = 100;
    else if (avgRhr < 55) rhrScore = 90;
    else if (avgRhr < 60) rhrScore = 80;
    else if (avgRhr < 65) rhrScore = 70;
    else if (avgRhr < 70) rhrScore = 60;
    else rhrScore = 45;

    scores.push(rhrScore);
  }

  // HRV score (higher is better)
  const entriesWithHrv = entries.filter((e) => e.hrvHigh !== null);
  if (entriesWithHrv.length > 0) {
    const hrvHighValues = entriesWithHrv.map((e) => e.hrvHigh!);
    const avgHrvHigh = avg(hrvHighValues)!;

    // HRV scoring (hrvHigh): > 80 = excellent, 60-80 = good, 40-60 = average, < 40 = needs attention
    let hrvScore: number;
    if (avgHrvHigh >= 80) hrvScore = 100;
    else if (avgHrvHigh >= 65) hrvScore = 85;
    else if (avgHrvHigh >= 50) hrvScore = 70;
    else if (avgHrvHigh >= 40) hrvScore = 55;
    else hrvScore = 40;

    scores.push(hrvScore);
  }

  if (scores.length === 0) return 70; // Neutral if no data

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Bonus/penalty based on sleep consistency
 */
function calculateConsistencyBonus(entries: SleepEntry[]): number {
  if (entries.length < 3) return 0;

  const durations = entries.map((e) => e.durationMinutes);
  const stdDev = standardDeviation(durations);

  // Consistency bonus: low stdDev = good
  // stdDev < 30min = +5, 30-60min = 0, > 60min = -5
  if (stdDev < 30) return 5;
  if (stdDev > 60) return -5;
  return 0;
}

// ============================================================================
// COMPOSITE HEALTH SCORE
// ============================================================================

export interface HealthScoreResult {
  overall: number;
  bpScore: BPScoreResult | null;
  sleepScore: SleepScoreResult | null;
  primaryDriver: string;
  primaryDetractor: string;
  actionItem: string;
}

/**
 * Calculate composite health score from BP and Sleep data
 * @param bpReadings BP readings for the day
 * @param sleepEntries Sleep entries for the day (typically 0 or 1)
 * @param allSleepEntries All sleep entries for personalized scoring baseline
 */
export function calculateHealthScore(
  bpReadings: BPReadingSummary[],
  sleepEntries: SleepEntry[],
  allSleepEntries?: SleepEntry[]
): HealthScoreResult {
  const bpScore = calculateBPScore(bpReadings);

  // Use personalized scoring if all entries provided, otherwise fall back to population-based
  let sleepScore: SleepScoreResult | null = null;
  if (sleepEntries.length > 0 && allSleepEntries && allSleepEntries.length >= 3) {
    const personalizedScore = getDailySleepScore(sleepEntries[0].date, allSleepEntries);
    if (personalizedScore && personalizedScore.overall !== null) {
      // Convert personalized score to SleepScoreResult format for compatibility
      sleepScore = {
        score: personalizedScore.overall,
        durationScore: personalizedScore.duration ?? 0,
        restorativeScore: personalizedScore.sleepQuality ?? 0,
        heartScore: personalizedScore.heartHealth ?? 0,
        consistencyBonus: 0,
        avgDurationMinutes: sleepEntries[0].durationMinutes,
        avgRestorative:
          sleepEntries[0].deepSleepPct !== null || sleepEntries[0].remSleepPct !== null
            ? (sleepEntries[0].deepSleepPct || 0) + (sleepEntries[0].remSleepPct || 0)
            : null,
      };
    }
  }

  // Fall back to population-based scoring if personalized not available
  if (!sleepScore && sleepEntries.length > 0) {
    sleepScore = calculateSleepHealthScore(sleepEntries);
  }

  // Handle missing data - redistribute weights
  let overall: number;
  if (bpScore && sleepScore) {
    overall = bpScore.score * 0.5 + sleepScore.score * 0.5;

    // Critical floor: if either is very low, cap overall
    if (bpScore.score < 35 || sleepScore.score < 35) {
      overall = Math.min(overall, 50);
    }
  } else if (bpScore) {
    overall = bpScore.score;
  } else if (sleepScore) {
    overall = sleepScore.score;
  } else {
    overall = 0;
  }

  // Generate insights
  const { primaryDriver, primaryDetractor, actionItem } = generateInsights(bpScore, sleepScore);

  return {
    overall: Math.round(overall),
    bpScore,
    sleepScore,
    primaryDriver,
    primaryDetractor,
    actionItem,
  };
}

/**
 * Generate human-readable insights from scores
 */
function generateInsights(
  bpScore: BPScoreResult | null,
  sleepScore: SleepScoreResult | null
): { primaryDriver: string; primaryDetractor: string; actionItem: string } {
  const factors: { label: string; score: number; type: 'bp' | 'sleep' }[] = [];

  if (bpScore) {
    factors.push({ label: 'Blood pressure', score: bpScore.score, type: 'bp' });
  }
  if (sleepScore) {
    factors.push({ label: 'Sleep quality', score: sleepScore.score, type: 'sleep' });
  }

  if (factors.length === 0) {
    return {
      primaryDriver: 'No data available',
      primaryDetractor: 'Add some readings to see insights',
      actionItem: 'Start by logging a BP reading or sleep entry',
    };
  }

  // Sort by score
  const sorted = [...factors].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Primary driver
  let primaryDriver: string;
  if (best.score >= 80) {
    primaryDriver = `${best.label} is excellent`;
  } else if (best.score >= 65) {
    primaryDriver = `${best.label} is your strongest area`;
  } else {
    primaryDriver = `${best.label} is relatively stable`;
  }

  // Primary detractor
  let primaryDetractor: string;
  if (worst.score < 50) {
    primaryDetractor = `${worst.label} needs attention`;
  } else if (worst.score < 70) {
    primaryDetractor = `${worst.label} could be improved`;
  } else {
    primaryDetractor = 'All areas are performing well';
  }

  // Action item based on worst area
  let actionItem: string;
  if (worst.type === 'bp' && bpScore) {
    if (bpScore.variabilityPenalty > 10) {
      actionItem = 'Focus on BP consistency - take readings at the same time each day';
    } else if (bpScore.baseScore < 70) {
      actionItem = 'Consider lifestyle changes to lower BP: reduce sodium, increase activity';
    } else if (bpScore.trendModifier < 0) {
      actionItem = 'BP trending up - monitor closely and consider stress reduction';
    } else {
      actionItem = 'Maintain current habits to keep BP in healthy range';
    }
  } else if (worst.type === 'sleep' && sleepScore) {
    if (sleepScore.durationScore < 60) {
      actionItem = 'Prioritize more sleep - aim for 7-9 hours per night';
    } else if (sleepScore.restorativeScore < 60) {
      actionItem = 'Improve sleep quality: limit caffeine, maintain consistent bedtime';
    } else if (sleepScore.consistencyBonus < 0) {
      actionItem = 'Work on sleep consistency - keep a regular sleep schedule';
    } else {
      actionItem = 'Maintain current sleep habits';
    }
  } else {
    actionItem = 'Keep tracking to get personalized insights';
  }

  return { primaryDriver, primaryDetractor, actionItem };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get score color class based on value
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 65) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get score label based on value
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Needs Attention';
  return 'Poor';
}
