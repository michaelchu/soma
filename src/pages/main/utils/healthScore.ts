/**
 * Health Score Algorithm
 *
 * Calculates a composite health score (0-100) based on three pillars:
 * - Blood Pressure (30% base weight)
 * - Sleep (35% base weight)
 * - Activity (35% base weight)
 *
 * Features:
 * - Score projection for missing BP/sleep days via linear regression + staleness decay
 * - Dynamic weight redistribution when pillars are missing
 * - Cross-metric interaction bonuses/penalties
 * - Critical floor enforcement
 */

import type { SleepEntry } from '@/lib/db/sleep';
import type { Activity } from '@/types/activity';
import type { BPReadingSummary } from '@/types/bloodPressure';
import { avg, avgRounded, linearRegression, standardDeviation } from '@/lib/statsUtils';
import { getDailySleepScore } from '@/pages/sleep/utils/sleepHelpers';
import {
  calculateTrainingLoad,
  getTrainingLoadLevel,
  calculateConsistencyMultiplier,
} from '@/pages/activity/utils/activityHelpers';
import { toLocalDateString } from '@/lib/dateUtils';

const NEUTRAL_SCORE = 65;

const BASE_WEIGHTS = {
  bp: 0.3,
  sleep: 0.35,
  activity: 0.35,
} as const;

// ============================================================================
// BLOOD PRESSURE SCORE (base weight 0.30)
// ============================================================================

export interface BPScoreResult {
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
// SLEEP SCORE (base weight 0.35)
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

  if (stdDev < 30) return 5;
  if (stdDev > 60) return -5;
  return 0;
}

// ============================================================================
// ACTIVITY PILLAR SCORE (base weight 0.35)
// ============================================================================

export interface ActivityScoreResult {
  score: number;
  trainingLoadScore: number;
  effortScore: number;
  consistencyScore: number;
}

/**
 * Calculate activity pillar score (0-100) from three sub-components:
 * 1. Training Load Status (50%) — normalized from training load level
 * 2. Daily Effort Appropriateness (30%) — is today's effort level appropriate?
 * 3. Consistency (20%) — normalized from consistency multiplier
 *
 * Returns null if user has zero activity history.
 */
export function calculateActivityPillarScore(
  targetDate: string,
  allActivities: Activity[]
): ActivityScoreResult | null {
  if (allActivities.length === 0) return null;

  const trainingLoad = calculateTrainingLoad(targetDate, allActivities);
  const trainingLoadLevel = getTrainingLoadLevel(trainingLoad.score);

  // 1. Training Load Status (50%)
  const trainingLoadScore = normalizeTrainingLoad(trainingLoad.score, trainingLoadLevel.level);

  // 2. Daily Effort Appropriateness (30%)
  const effortScore = calculateEffortAppropriateness(
    targetDate,
    allActivities,
    trainingLoadLevel.level,
    trainingLoad.daysSinceActivity
  );

  // 3. Consistency (20%)
  const consistencyMultiplier = calculateConsistencyMultiplier(
    allActivities,
    new Date(targetDate + 'T00:00:00')
  );
  const consistencyScore = normalizeConsistency(consistencyMultiplier);

  const score = Math.round(trainingLoadScore * 0.5 + effortScore * 0.3 + consistencyScore * 0.2);

  return {
    score: Math.max(0, Math.min(100, score)),
    trainingLoadScore: Math.round(trainingLoadScore),
    effortScore: Math.round(effortScore),
    consistencyScore: Math.round(consistencyScore),
  };
}

/**
 * Normalize training load score to 0-100.
 * "Building" and "maintaining" score highest; "detraining" and "overreaching" score lower.
 */
function normalizeTrainingLoad(
  score: number,
  level: 'detraining' | 'maintaining' | 'building' | 'peak' | 'overreaching'
): number {
  switch (level) {
    case 'building':
      return 90; // Active and progressing
    case 'peak':
      return 85; // High fitness, but near limit
    case 'maintaining':
      return 75; // Consistent, stable fitness
    case 'detraining':
      // Scale from 20 (score=0) to 60 (score=14)
      return 20 + (Math.min(score, 14) / 14) * 40;
    case 'overreaching':
      // Scale from 60 (score=120) down to 40 (score=200+)
      return Math.max(40, 60 - ((score - 120) / 80) * 20);
  }
}

/**
 * Score whether today's effort is appropriate given training state.
 * Rest is good when at peak/overreaching; activity is needed when detraining.
 */
function calculateEffortAppropriateness(
  targetDate: string,
  allActivities: Activity[],
  trainingLevel: 'detraining' | 'maintaining' | 'building' | 'peak' | 'overreaching',
  daysSinceActivity: number
): number {
  const dayActivities = allActivities.filter((a) => a.date === targetDate);
  const isActiveDay = dayActivities.length > 0;
  const isRestDay = !isActiveDay;

  if (isRestDay) {
    switch (trainingLevel) {
      case 'overreaching':
        return 90; // Rest when overreaching is smart
      case 'peak':
        return 80; // Rest at peak is reasonable
      case 'building':
        return daysSinceActivity <= 1 ? 70 : 50; // Brief rest OK, extended rest less so
      case 'maintaining':
        return daysSinceActivity <= 2 ? 65 : 45;
      case 'detraining':
        return 30; // Need to get moving
    }
  }

  // Active day
  switch (trainingLevel) {
    case 'overreaching':
      return 40; // Should be resting
    case 'peak':
      return 65; // Light activity OK, but careful
    case 'building':
      return 85; // Good to keep building
    case 'maintaining':
      return 80; // Activity to maintain
    case 'detraining':
      return 90; // Great to get back at it
  }
}

/**
 * Normalize consistency multiplier (0.8–1.1) to 0-100 score.
 */
function normalizeConsistency(multiplier: number): number {
  // 0.8 → 30, 0.9 → 55, 1.0 → 75, 1.1 → 95
  return Math.round(((multiplier - 0.8) / 0.3) * 65 + 30);
}

// ============================================================================
// SCORE PROJECTION (for missing BP/sleep days)
// ============================================================================

interface DailyScore {
  date: string;
  score: number;
}

/**
 * Project a score for a missing day using linear regression on recent data + staleness decay.
 *
 * 1. Collect actual scores from the last 30 days
 * 2. Fit linear regression to get trend
 * 3. Project score and apply staleness decay
 * 4. Clamp to 0-100
 *
 * Returns null if fewer than 3 data points exist in the last 30 days.
 */
export function projectScore(targetDate: string, recentScores: DailyScore[]): number | null {
  if (recentScores.length < 3) return null;

  const targetTime = new Date(targetDate + 'T00:00:00').getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Filter to last 30 days
  const recent = recentScores.filter((s) => {
    const scoreTime = new Date(s.date + 'T00:00:00').getTime();
    return targetTime - scoreTime <= thirtyDaysMs && scoreTime < targetTime;
  });

  if (recent.length < 3) return null;

  // Sort by date ascending
  const sorted = [...recent].sort(
    (a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime()
  );

  // Convert to regression points (x = days from earliest, y = score)
  const earliestTime = new Date(sorted[0].date + 'T00:00:00').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const points = sorted.map((s) => ({
    x: (new Date(s.date + 'T00:00:00').getTime() - earliestTime) / dayMs,
    y: s.score,
  }));

  const regression = linearRegression(points);
  if (!regression) return null;

  // Project score for target date
  const targetX = (targetTime - earliestTime) / dayMs;
  const projectedScore = regression.predict(targetX);

  // Calculate mean of recent scores for blending
  const meanScore = sorted.reduce((sum, s) => sum + s.score, 0) / sorted.length;

  // Days since last actual reading
  const lastScoreTime = new Date(sorted[sorted.length - 1].date + 'T00:00:00').getTime();
  const daysSinceLast = Math.round((targetTime - lastScoreTime) / dayMs);

  // Apply staleness decay
  let finalScore: number;
  if (daysSinceLast <= 3) {
    finalScore = projectedScore;
  } else if (daysSinceLast <= 7) {
    finalScore = projectedScore * 0.75 + meanScore * 0.25;
  } else if (daysSinceLast <= 14) {
    finalScore = projectedScore * 0.5 + meanScore * 0.5;
  } else {
    finalScore = meanScore;
  }

  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

// ============================================================================
// DYNAMIC WEIGHTING
// ============================================================================

interface PillarData {
  bp: number | null;
  sleep: number | null;
  activity: number | null;
}

interface WeightedResult {
  weightedScore: number;
  confidenceFactor: number;
  effectiveWeights: { bp: number; sleep: number; activity: number };
}

/**
 * Calculate dynamically weighted composite score.
 * Redistributes weights proportionally when pillars are missing,
 * with a confidence factor that blends toward neutral.
 */
export function calculateDynamicWeights(pillars: PillarData): WeightedResult {
  const available: { key: keyof typeof BASE_WEIGHTS; score: number }[] = [];

  if (pillars.bp !== null) available.push({ key: 'bp', score: pillars.bp });
  if (pillars.sleep !== null) available.push({ key: 'sleep', score: pillars.sleep });
  if (pillars.activity !== null) available.push({ key: 'activity', score: pillars.activity });

  if (available.length === 0) {
    return {
      weightedScore: 0,
      confidenceFactor: 0,
      effectiveWeights: { bp: 0, sleep: 0, activity: 0 },
    };
  }

  // Confidence factor based on how many pillars have data
  let confidenceFactor: number;
  if (available.length === 3) confidenceFactor = 1.0;
  else if (available.length === 2) confidenceFactor = 0.95;
  else confidenceFactor = 0.85;

  // Redistribute weights proportionally
  const totalBaseWeight = available.reduce((sum, p) => sum + BASE_WEIGHTS[p.key], 0);
  const effectiveWeights = { bp: 0, sleep: 0, activity: 0 };

  let pillarScore = 0;
  for (const p of available) {
    const redistributedWeight = BASE_WEIGHTS[p.key] / totalBaseWeight;
    effectiveWeights[p.key] = redistributedWeight;
    pillarScore += p.score * redistributedWeight;
  }

  // Blend toward neutral based on confidence
  const weightedScore = pillarScore * confidenceFactor + NEUTRAL_SCORE * (1 - confidenceFactor);

  return { weightedScore, confidenceFactor, effectiveWeights };
}

// ============================================================================
// CROSS-METRIC INTERACTIONS
// ============================================================================

export interface CrossMetricAdjustment {
  adjustment: number;
  reasons: string[];
}

/**
 * Calculate cross-metric interaction adjustments (±10 points max).
 * Applied after weighted combination to reward synergies and penalize compounding risks.
 */
export function calculateCrossMetricAdjustments(pillars: PillarData): CrossMetricAdjustment {
  let totalAdjustment = 0;
  const reasons: string[] = [];

  const { bp, sleep, activity } = pillars;

  // Poor sleep + elevated BP → -5 (compounding risk)
  if (sleep !== null && bp !== null && sleep < 50 && bp < 50) {
    totalAdjustment -= 5;
    reasons.push('Poor sleep and elevated BP are compounding health risks');
  }

  // Excellent sleep + excellent BP → +3 (synergy)
  if (sleep !== null && bp !== null && sleep >= 80 && bp >= 80) {
    totalAdjustment += 3;
    reasons.push('Excellent sleep and BP create a positive health synergy');
  }

  // High activity + poor sleep → -3 (overtraining without recovery)
  if (activity !== null && sleep !== null && activity >= 70 && sleep < 40) {
    totalAdjustment -= 3;
    reasons.push('High activity with poor sleep risks overtraining');
  }

  // Good activity + good sleep → +2 (exercise-recovery balance)
  if (activity !== null && sleep !== null && activity >= 75 && sleep >= 75) {
    totalAdjustment += 2;
    reasons.push('Good exercise-recovery balance');
  }

  // Good activity + good BP → +2 (cardiovascular benefit)
  if (activity !== null && bp !== null && activity >= 70 && bp >= 75) {
    totalAdjustment += 2;
    reasons.push('Activity is supporting cardiovascular health');
  }

  // All three below 45 → -5 (systemic concern)
  if (
    bp !== null &&
    sleep !== null &&
    activity !== null &&
    bp < 45 &&
    sleep < 45 &&
    activity < 45
  ) {
    totalAdjustment -= 5;
    reasons.push('All health metrics need attention');
  }

  // Cap total adjustment to -10 / +7
  const adjustment = Math.max(-10, Math.min(7, totalAdjustment));

  return { adjustment, reasons };
}

// ============================================================================
// CRITICAL FLOOR
// ============================================================================

/**
 * Apply critical floor: if any pillar is very low, cap the overall score.
 */
function applyCriticalFloor(pillars: PillarData): number {
  const scores = [pillars.bp, pillars.sleep, pillars.activity].filter(
    (s): s is number => s !== null
  );
  if (scores.length === 0) return 100;

  const minScore = Math.min(...scores);

  if (minScore < 30) return 45;
  if (minScore < 40) return 55;
  return 100; // No floor applied
}

// ============================================================================
// COMPOSITE HEALTH SCORE
// ============================================================================

export interface HealthScoreResult {
  overall: number;
  bpScore: BPScoreResult | null;
  sleepScore: SleepScoreResult | null;
  activityScore: ActivityScoreResult | null;
  crossMetric: CrossMetricAdjustment;
  confidenceFactor: number;
  primaryDriver: string;
  primaryDetractor: string;
  actionItem: string;
}

/**
 * Calculate composite health score from BP, Sleep, and Activity data.
 *
 * @param bpReadings All BP readings (for direct score + projection)
 * @param sleepEntries All sleep entries (for direct score + projection)
 * @param allActivities All activities (for activity pillar)
 * @param targetDate The date to score (defaults to today)
 */
export function calculateHealthScore(
  bpReadings: BPReadingSummary[],
  sleepEntries: SleepEntry[],
  allActivities: Activity[] = [],
  targetDate?: string
): HealthScoreResult {
  const date = targetDate || toLocalDateString(new Date());

  // --- BP pillar ---
  const dayBpReadings = bpReadings.filter((r) => r.date === date);
  let bpResult = calculateBPScore(dayBpReadings);
  let bpPillarScore: number | null = bpResult?.score ?? null;

  // If no BP data for this day, try projection
  if (bpPillarScore === null) {
    const bpDailyScores = buildDailyBPScores(bpReadings);
    bpPillarScore = projectScore(date, bpDailyScores);
  }

  // --- Sleep pillar ---
  const daySleepEntries = sleepEntries.filter((e) => e.date === date);
  let sleepResult: SleepScoreResult | null = null;

  if (daySleepEntries.length > 0 && sleepEntries.length >= 3) {
    const personalizedScore = getDailySleepScore(daySleepEntries[0].date, sleepEntries);
    if (personalizedScore && personalizedScore.overall !== null) {
      sleepResult = {
        score: personalizedScore.overall,
        durationScore: personalizedScore.duration ?? 0,
        restorativeScore: personalizedScore.sleepQuality ?? 0,
        heartScore: personalizedScore.heartHealth ?? 0,
        consistencyBonus: 0,
        avgDurationMinutes: daySleepEntries[0].durationMinutes,
        avgRestorative:
          daySleepEntries[0].deepSleepPct !== null || daySleepEntries[0].remSleepPct !== null
            ? (daySleepEntries[0].deepSleepPct || 0) + (daySleepEntries[0].remSleepPct || 0)
            : null,
      };
    }
  }

  if (!sleepResult && daySleepEntries.length > 0) {
    sleepResult = calculateSleepHealthScore(daySleepEntries);
  }

  let sleepPillarScore: number | null = sleepResult?.score ?? null;

  // If no sleep data for this day, try projection
  if (sleepPillarScore === null) {
    const sleepDailyScores = buildDailySleepScores(sleepEntries);
    sleepPillarScore = projectScore(date, sleepDailyScores);
  }

  // --- Activity pillar ---
  const activityResult = calculateActivityPillarScore(date, allActivities);
  const activityPillarScore = activityResult?.score ?? null;

  // --- Composite calculation ---
  const pillars: PillarData = {
    bp: bpPillarScore,
    sleep: sleepPillarScore,
    activity: activityPillarScore,
  };

  const { weightedScore, confidenceFactor } = calculateDynamicWeights(pillars);
  const crossMetric = calculateCrossMetricAdjustments(pillars);
  const criticalFloor = applyCriticalFloor(pillars);

  const afterInteractions = weightedScore + crossMetric.adjustment;
  const overall = Math.max(0, Math.min(100, Math.min(afterInteractions, criticalFloor)));

  // Generate insights
  const { primaryDriver, primaryDetractor, actionItem } = generateInsights(
    bpResult,
    sleepResult,
    activityResult,
    crossMetric
  );

  return {
    overall: Math.round(overall),
    bpScore: bpResult,
    sleepScore: sleepResult,
    activityScore: activityResult,
    crossMetric,
    confidenceFactor,
    primaryDriver,
    primaryDetractor,
    actionItem,
  };
}

// ============================================================================
// DAILY SCORE BUILDERS (for projection)
// ============================================================================

/**
 * Build daily BP scores from all readings (one score per day that has data)
 */
function buildDailyBPScores(readings: BPReadingSummary[]): DailyScore[] {
  const byDate = new Map<string, BPReadingSummary[]>();
  for (const r of readings) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }

  const scores: DailyScore[] = [];
  for (const [date, dayReadings] of byDate) {
    const result = calculateBPScore(dayReadings);
    if (result) scores.push({ date, score: result.score });
  }
  return scores;
}

/**
 * Build daily sleep scores from all entries (one score per day that has data)
 */
function buildDailySleepScores(entries: SleepEntry[]): DailyScore[] {
  const scores: DailyScore[] = [];
  for (const entry of entries) {
    const personalizedScore = getDailySleepScore(entry.date, entries);
    if (personalizedScore && personalizedScore.overall !== null) {
      scores.push({ date: entry.date, score: personalizedScore.overall });
    } else {
      const fallback = calculateSleepHealthScore([entry]);
      if (fallback) scores.push({ date: entry.date, score: fallback.score });
    }
  }
  return scores;
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

/**
 * Generate human-readable insights from scores
 */
function generateInsights(
  bpScore: BPScoreResult | null,
  sleepScore: SleepScoreResult | null,
  activityScore: ActivityScoreResult | null,
  crossMetric: CrossMetricAdjustment
): { primaryDriver: string; primaryDetractor: string; actionItem: string } {
  const factors: { label: string; score: number; type: 'bp' | 'sleep' | 'activity' }[] = [];

  if (bpScore) {
    factors.push({ label: 'Blood pressure', score: bpScore.score, type: 'bp' });
  }
  if (sleepScore) {
    factors.push({ label: 'Sleep quality', score: sleepScore.score, type: 'sleep' });
  }
  if (activityScore) {
    factors.push({ label: 'Activity', score: activityScore.score, type: 'activity' });
  }

  if (factors.length === 0) {
    return {
      primaryDriver: 'No data available',
      primaryDetractor: 'Add some readings to see insights',
      actionItem: 'Start by logging a BP reading, sleep entry, or activity',
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

  // Primary detractor — cross-metric reasons take priority if present
  let primaryDetractor: string;
  if (crossMetric.reasons.length > 0 && crossMetric.adjustment < 0) {
    primaryDetractor = crossMetric.reasons[0];
  } else if (worst.score < 50) {
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
  } else if (worst.type === 'activity' && activityScore) {
    if (activityScore.consistencyScore < 50) {
      actionItem = 'Build a regular exercise routine - aim for 3-4 sessions per week';
    } else if (activityScore.trainingLoadScore < 50) {
      actionItem = 'Gradually increase training intensity to build fitness';
    } else if (activityScore.effortScore < 50) {
      actionItem = 'Balance your training with adequate rest days';
    } else {
      actionItem = 'Maintain current activity levels';
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
