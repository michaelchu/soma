import type { Activity, ActivityType, ActivityTimeOfDay } from '@/types/activity';
import { formatDurationLong } from '@/lib/dateUtils';

// Re-export formatDuration for backwards compatibility (activity uses "45 min" format)
export const formatDuration = formatDurationLong;

// ============================================================================
// Effort Score Calculation (Strava-like Relative Effort)
// ============================================================================

/**
 * Zone multipliers for TRIMP-like effort calculation.
 * Higher zones contribute exponentially more to effort score.
 * These values are calibrated to produce Strava-like scores.
 */
const ZONE_MULTIPLIERS = {
  zone1: 1.0, // Warm Up (100-119 bpm)
  zone2: 1.8, // Easy (120-139 bpm)
  zone3: 2.8, // Aerobic (140-159 bpm)
  zone4: 4.0, // Threshold (160-179 bpm)
  zone5: 5.5, // Maximum (>179 bpm)
} as const;

/**
 * Activity type multipliers to account for different metabolic demands.
 * Used when HR zones are not available.
 */
const ACTIVITY_TYPE_MULTIPLIERS: Record<ActivityType, number> = {
  walking: 0.8,
  badminton: 1.2,
  pickleball: 1.1,
  other: 1.0,
};

/**
 * Map intensity (1-5) to estimated zone distribution percentages.
 * Used to estimate effort when HR zones are not provided.
 */
const INTENSITY_TO_ZONE_DISTRIBUTION: Record<number, number[]> = {
  // [z1%, z2%, z3%, z4%, z5%]
  1: [80, 20, 0, 0, 0], // Very light - mostly zone 1
  2: [40, 50, 10, 0, 0], // Light - mostly zones 1-2
  3: [10, 40, 40, 10, 0], // Moderate - mostly zones 2-3
  4: [5, 15, 35, 35, 10], // Hard - significant zone 4
  5: [0, 5, 20, 40, 35], // All out - heavy zone 4-5
};

/**
 * Check if an activity has any HR zone data
 */
export function hasHrZoneData(activity: Activity): boolean {
  return !!(
    activity.zone1Minutes ||
    activity.zone2Minutes ||
    activity.zone3Minutes ||
    activity.zone4Minutes ||
    activity.zone5Minutes
  );
}

/**
 * Calculate effort score from actual HR zone data (TRIMP-like).
 * Returns a score where ~100 is a moderate 60-min workout.
 */
function calculateEffortFromZones(
  zone1: number,
  zone2: number,
  zone3: number,
  zone4: number,
  zone5: number
): number {
  const score =
    zone1 * ZONE_MULTIPLIERS.zone1 +
    zone2 * ZONE_MULTIPLIERS.zone2 +
    zone3 * ZONE_MULTIPLIERS.zone3 +
    zone4 * ZONE_MULTIPLIERS.zone4 +
    zone5 * ZONE_MULTIPLIERS.zone5;

  return Math.round(score);
}

/**
 * Estimate effort score from intensity level and duration.
 * Used when HR zone data is not available.
 */
function estimateEffortFromIntensity(
  durationMinutes: number,
  intensity: number,
  activityType: ActivityType
): number {
  const distribution =
    INTENSITY_TO_ZONE_DISTRIBUTION[intensity] || INTENSITY_TO_ZONE_DISTRIBUTION[3];
  const activityMultiplier = ACTIVITY_TYPE_MULTIPLIERS[activityType] || 1.0;

  // Distribute duration across zones based on intensity
  const zone1 = (distribution[0] / 100) * durationMinutes;
  const zone2 = (distribution[1] / 100) * durationMinutes;
  const zone3 = (distribution[2] / 100) * durationMinutes;
  const zone4 = (distribution[3] / 100) * durationMinutes;
  const zone5 = (distribution[4] / 100) * durationMinutes;

  const baseScore = calculateEffortFromZones(zone1, zone2, zone3, zone4, zone5);
  return Math.round(baseScore * activityMultiplier);
}

/**
 * Calculate effort score for an activity.
 * Uses actual HR zone data when available, otherwise estimates from intensity.
 *
 * @param activity The activity to calculate effort for
 * @returns Effort score (typically 0-300+ range, similar to Strava)
 */
export function calculateEffortScore(activity: Activity): number {
  if (hasHrZoneData(activity)) {
    return calculateEffortFromZones(
      activity.zone1Minutes || 0,
      activity.zone2Minutes || 0,
      activity.zone3Minutes || 0,
      activity.zone4Minutes || 0,
      activity.zone5Minutes || 0
    );
  }

  return estimateEffortFromIntensity(
    activity.durationMinutes,
    activity.intensity,
    activity.activityType
  );
}

/**
 * Get effort level description based on score
 */
export function getEffortLevel(score: number): { label: string; color: string } {
  if (score < 25) return { label: 'Light', color: 'text-green-500' };
  if (score < 75) return { label: 'Moderate', color: 'text-lime-500' };
  if (score < 150) return { label: 'Challenging', color: 'text-yellow-500' };
  if (score < 250) return { label: 'Hard', color: 'text-orange-500' };
  return { label: 'Extreme', color: 'text-red-500' };
}

/**
 * Get effort badge color class based on score
 */
export function getEffortBadgeColor(score: number): string {
  if (score < 25) return 'bg-green-500/10 text-green-500';
  if (score < 75) return 'bg-lime-500/10 text-lime-500';
  if (score < 150) return 'bg-yellow-500/10 text-yellow-500';
  if (score < 250) return 'bg-orange-500/10 text-orange-500';
  return 'bg-red-500/10 text-red-500';
}

/**
 * Calculate total effort for a day's activities
 */
export function calculateDailyEffortScore(activities: Activity[]): number {
  return activities.reduce((total, activity) => total + calculateEffortScore(activity), 0);
}

/**
 * Calculate consistency multiplier based on workouts in the past 7 days
 * @param activities All activities
 * @param referenceDate The date to calculate consistency from (activity date)
 * @returns Multiplier (0.8 to 1.1)
 */
export function calculateConsistencyMultiplier(
  activities: Activity[],
  referenceDate: Date
): number {
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const workoutsInPastWeek = activities.filter((a) => {
    const activityDate = new Date(a.date);
    return activityDate >= sevenDaysAgo && activityDate < referenceDate;
  }).length;

  if (workoutsInPastWeek <= 1) return 0.8;
  if (workoutsInPastWeek === 2) return 0.9;
  if (workoutsInPastWeek === 3) return 1.0;
  return 1.1; // 4+ workouts
}

/**
 * Calculate activity score: (duration × intensity) × consistency multiplier
 * @param activity The activity to score
 * @param allActivities All activities (for consistency calculation)
 * @returns Activity score (rounded to nearest integer)
 */
export function calculateActivityScore(activity: Activity, allActivities: Activity[]): number {
  const baseScore = activity.durationMinutes * activity.intensity;
  const referenceDate = new Date(activity.date);
  const multiplier = calculateConsistencyMultiplier(allActivities, referenceDate);
  return Math.round(baseScore * multiplier);
}

/**
 * Represents aggregated activities for a single day
 */
export interface DayActivities {
  date: string;
  activities: Activity[];
  totalScore: number;
  totalDuration: number;
  avgIntensity: number;
}

/**
 * Calculate daily activity score: sum of (duration × intensity) for all activities × consistency multiplier
 * @param activities Activities for the day
 * @param allActivities All activities (for consistency calculation)
 * @returns Daily activity score (rounded to nearest integer)
 */
export function calculateDailyActivityScore(
  activities: Activity[],
  allActivities: Activity[]
): number {
  if (activities.length === 0) return 0;

  // Sum up base scores for all activities in the day
  const baseScore = activities.reduce((sum, a) => sum + a.durationMinutes * a.intensity, 0);

  // Use the date from the first activity for consistency calculation
  const referenceDate = new Date(activities[0].date);
  const multiplier = calculateConsistencyMultiplier(allActivities, referenceDate);

  return Math.round(baseScore * multiplier);
}

/**
 * Get activity score for a specific date
 * Convenience function that filters activities and returns score for the given date
 */
export function getDailyActivityScore(date: string, allActivities: Activity[]): number | null {
  const dayActivities = allActivities.filter((a) => a.date === date);
  if (dayActivities.length === 0) return null;

  return calculateDailyActivityScore(dayActivities, allActivities);
}

/**
 * Group activities by date and calculate daily aggregates
 * @param activities Activities to group
 * @param allActivities All activities (for consistency calculation)
 * @returns Array of DayActivities sorted by date ascending
 */
export function groupActivitiesByDay(
  activities: Activity[],
  allActivities: Activity[]
): DayActivities[] {
  // Group by date
  const byDate = new Map<string, Activity[]>();

  for (const activity of activities) {
    const existing = byDate.get(activity.date) || [];
    existing.push(activity);
    byDate.set(activity.date, existing);
  }

  // Convert to DayActivities array
  const result: DayActivities[] = [];

  for (const [date, dayActivities] of byDate) {
    const totalDuration = dayActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalIntensityWeighted = dayActivities.reduce(
      (sum, a) => sum + a.intensity * a.durationMinutes,
      0
    );
    const avgIntensity = totalDuration > 0 ? totalIntensityWeighted / totalDuration : 0;

    result.push({
      date,
      activities: dayActivities,
      totalScore: calculateDailyActivityScore(dayActivities, allActivities),
      totalDuration,
      avgIntensity,
    });
  }

  // Sort by date ascending
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return result;
}

/**
 * Filter activities by date range
 * @param activities All activities
 * @param range Date range key ('7', '30', '90', 'all')
 * @returns Filtered activities
 */
export function filterActivities(activities: Activity[], range: string): Activity[] {
  if (range === 'all') return activities;

  const now = new Date();
  const daysBack = parseInt(range) || 7;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - daysBack);

  return activities.filter((a) => new Date(a.date) >= cutoff);
}

/**
 * Get intensity label
 * @param intensity Intensity value (1-5)
 * @returns Label string
 */
export function getIntensityLabel(intensity: number): string {
  const labels: Record<number, string> = {
    1: 'Very light',
    2: 'Light',
    3: 'Moderate',
    4: 'Hard',
    5: 'All out',
  };
  return labels[intensity] || 'Unknown';
}

/**
 * Get intensity color class
 * @param intensity Intensity value (1-5)
 * @returns Tailwind color class
 */
export function getIntensityColor(intensity: number): string {
  const colors: Record<number, string> = {
    1: 'text-green-500',
    2: 'text-lime-500',
    3: 'text-yellow-500',
    4: 'text-orange-500',
    5: 'text-red-500',
  };
  return colors[intensity] || 'text-gray-500';
}

/**
 * Get intensity background color class
 * @param intensity Intensity value (1-5)
 * @returns Tailwind background color class
 */
export function getIntensityBgColor(intensity: number): string {
  const colors: Record<number, string> = {
    1: 'bg-green-500',
    2: 'bg-lime-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-500',
  };
  return colors[intensity] || 'bg-gray-500';
}

/**
 * Get intensity background color with opacity for chart bars
 * @param intensity Intensity value (1-5)
 * @returns Tailwind background color class with opacity
 */
export function getIntensityBarColor(intensity: number): string {
  const colors: Record<number, string> = {
    1: 'bg-green-500/80',
    2: 'bg-lime-500/80',
    3: 'bg-yellow-500/80',
    4: 'bg-orange-500/80',
    5: 'bg-red-500/80',
  };
  return colors[intensity] || 'bg-gray-500/80';
}

/**
 * Get activity type label
 * @param type Activity type
 * @returns Display label
 */
export function getActivityTypeLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    walking: 'Walking',
    badminton: 'Badminton',
    pickleball: 'Pickleball',
    other: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get activity type emoji icon
 * @param type Activity type
 * @returns Emoji for the activity
 */
export function getActivityTypeIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    walking: '🚶',
    badminton: '🏸',
    pickleball: '🏓',
    other: '🏃',
  };
  return icons[type] || '🏃';
}

/**
 * Get time of day label
 * @param timeOfDay Time of day value
 * @returns Display label
 */
export function getTimeOfDayLabel(timeOfDay: ActivityTimeOfDay): string {
  const labels: Record<ActivityTimeOfDay, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    late_evening: 'Late Evening',
  };
  return labels[timeOfDay] || timeOfDay;
}

/**
 * Format date to short day abbreviation
 * @param dateString Date string (YYYY-MM-DD)
 * @returns Day abbreviation (Mon, Tue, etc.)
 */
export function formatDayAbbrev(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format date to short format
 * @param dateString Date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Jan 15")
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
