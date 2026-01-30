import type { Activity } from '@/types/activity';

export interface WeekData {
  weekStart: Date; // Monday
  weekEnd: Date; // Sunday
  hasActivity: boolean;
  activities: Activity[];
}

export interface StreakData {
  currentStreak: number; // Consecutive weeks with activity
  streakActivities: number; // Total activities in current streak
}

/**
 * Get the Monday and Sunday bounds for a given date
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Get day of week (0 = Sunday, 1 = Monday, ...)
  const dayOfWeek = d.getDay();
  // Convert to Monday-based (0 = Monday, 6 = Sunday)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

/**
 * Check if a date falls within a week (inclusive)
 */
function isDateInWeek(dateStr: string, weekStart: Date, weekEnd: Date): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  return date >= weekStart && date <= weekEnd;
}

/**
 * Get all weeks that overlap with a given month
 * Returns weeks starting from the first week that includes any day of the month
 */
export function getMonthWeeks(year: number, month: number): WeekData[] {
  const weeks: WeekData[] = [];

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Get the Monday of the week containing the first day
  let { start: currentWeekStart } = getWeekBounds(firstDay);

  // Generate weeks until we pass the last day of the month
  while (currentWeekStart <= lastDay) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    weeks.push({
      weekStart: new Date(currentWeekStart),
      weekEnd: new Date(weekEnd),
      hasActivity: false,
      activities: [],
    });

    // Move to next week
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return weeks;
}

/**
 * Check if a week has any activities
 */
export function hasActivityInWeek(activities: Activity[], weekStart: Date, weekEnd: Date): boolean {
  return activities.some((a) => isDateInWeek(a.date, weekStart, weekEnd));
}

/**
 * Get activities within a week
 */
export function getActivitiesInWeek(
  activities: Activity[],
  weekStart: Date,
  weekEnd: Date
): Activity[] {
  return activities.filter((a) => isDateInWeek(a.date, weekStart, weekEnd));
}

/**
 * Calculate the current streak (consecutive weeks with activity)
 * Streak counts backwards from the current week
 */
export function calculateStreak(activities: Activity[], today: Date = new Date()): StreakData {
  if (activities.length === 0) {
    return { currentStreak: 0, streakActivities: 0 };
  }

  const { start: currentWeekStart, end: currentWeekEnd } = getWeekBounds(today);
  let streak = 0;
  let streakActivities = 0;

  // Start from current week and walk backwards
  let checkWeekStart = new Date(currentWeekStart);
  let checkWeekEnd = new Date(currentWeekEnd);

  // Check if current week has activity
  const currentWeekHasActivity = hasActivityInWeek(activities, checkWeekStart, checkWeekEnd);

  // Grace period: if we're early in the week (Mon/Tue) and no activity yet,
  // start counting from previous week
  const dayOfWeek = today.getDay();
  const isEarlyInWeek = dayOfWeek === 1 || dayOfWeek === 2; // Monday or Tuesday

  if (!currentWeekHasActivity && isEarlyInWeek) {
    // Move to previous week to start counting
    checkWeekStart.setDate(checkWeekStart.getDate() - 7);
    checkWeekEnd.setDate(checkWeekEnd.getDate() - 7);
  }

  // Count consecutive weeks with activity
  while (true) {
    const weekActivities = getActivitiesInWeek(activities, checkWeekStart, checkWeekEnd);
    if (weekActivities.length === 0) {
      break;
    }

    streak++;
    streakActivities += weekActivities.length;

    // Move to previous week
    checkWeekStart.setDate(checkWeekStart.getDate() - 7);
    checkWeekEnd.setDate(checkWeekEnd.getDate() - 7);
  }

  return { currentStreak: streak, streakActivities };
}

/**
 * Build week data for a specific month with activity information
 */
export function buildMonthWeekData(
  activities: Activity[],
  year: number,
  month: number
): WeekData[] {
  const weeks = getMonthWeeks(year, month);

  return weeks.map((week) => {
    const weekActivities = getActivitiesInWeek(activities, week.weekStart, week.weekEnd);
    return {
      ...week,
      hasActivity: weekActivities.length > 0,
      activities: weekActivities,
    };
  });
}

/**
 * Get all days in a month with padding for calendar display
 * Returns dates for the full calendar grid (including days from prev/next months)
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Get the Monday of the week containing the first day
  const { start: gridStart } = getWeekBounds(firstDay);

  // Get the Sunday of the week containing the last day
  const { end: gridEnd } = getWeekBounds(lastDay);

  // Generate all days in the grid
  const current = new Date(gridStart);
  while (current <= gridEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Format a date as YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is in a specific month
 */
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}
