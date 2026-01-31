import type { Activity, ActivityType, ActivityTimeOfDay } from '@/types/activity';
import { formatDurationLong } from '@/lib/dateUtils';

// Re-export formatDuration for backwards compatibility (activity uses "45 min" format)
export const formatDuration = formatDurationLong;

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
