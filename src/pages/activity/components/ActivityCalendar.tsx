import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Activity, ActivityType } from '@/types/activity';
import { ActivityIcon } from './ActivityIcons';
import { ActivityList } from './ActivityList';
import {
  calculateStreak,
  buildMonthWeekData,
  getCalendarDays,
  formatDateKey,
  isSameDay,
  isInMonth,
  type WeekData,
} from '../utils/streakCalculator';

interface ActivityCalendarProps {
  activities: Activity[];
  onViewActivity: (activity: Activity) => void;
}

// Calendar day cell component
function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  dayActivities,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayActivities: Activity[];
}) {
  const hasActivity = dayActivities.length > 0;
  const dayNumber = date.getDate();

  // Get the primary activity type (first one)
  const primaryType: ActivityType | null = hasActivity ? dayActivities[0].activityType : null;

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center h-12
        ${!isCurrentMonth ? 'opacity-30' : ''}
      `}
    >
      {/* Day number */}
      <span
        className={`
          text-sm font-medium z-10
          ${isToday && !hasActivity ? 'text-foreground' : ''}
          ${hasActivity ? 'sr-only' : ''}
          ${!isCurrentMonth ? 'text-muted-foreground' : ''}
        `}
      >
        {dayNumber}
      </span>

      {/* Activity indicator */}
      {hasActivity && (
        <div className="absolute h-7 w-7 rounded-full flex items-center justify-center bg-foreground">
          <ActivityIcon type={primaryType!} size={18} className="text-background" />
          {/* Count badge for multiple activities */}
          {dayActivities.length > 1 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {dayActivities.length}
            </span>
          )}
        </div>
      )}

      {/* Today indicator (ring) - only show if no activity */}
      {isToday && !hasActivity && (
        <div className="absolute h-7 w-7 rounded-full border-2 border-foreground" />
      )}
    </div>
  );
}

// Week streak indicator component
function WeekStreakIndicator({
  hasActivity,
  isInStreak,
}: {
  hasActivity: boolean;
  isInStreak: boolean;
}) {
  const circleClassName = isInStreak
    ? 'bg-orange-500'
    : hasActivity
      ? 'bg-muted-foreground'
      : 'border-2 border-muted-foreground/30';

  return (
    <div className="h-12 w-10 flex items-center justify-center relative z-10">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${circleClassName}`}>
        {(hasActivity || isInStreak) && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
    </div>
  );
}

// Week activity bar
function WeekActivityBar({ weekData, streak }: { weekData: WeekData[]; streak: number }) {
  // Find which weeks are in the current streak (counting from the end/bottom)
  const streakWeekIndices = new Set<number>();

  if (streak > 0) {
    let consecutiveCount = 0;
    // Start from the last week and go backwards
    for (let i = weekData.length - 1; i >= 0 && consecutiveCount < streak; i--) {
      if (weekData[i].hasActivity) {
        streakWeekIndices.add(i);
        consecutiveCount++;
      } else if (consecutiveCount > 0) {
        // Gap found, stop counting
        break;
      }
    }
  }

  return (
    <div className="flex flex-col items-center relative">
      {/* Spacer for day headers */}
      <div className="h-8 mb-1" />

      {/* Week indicators */}
      <div className="flex flex-col gap-1">
        {weekData.map((week: WeekData, index: number) => (
          <WeekStreakIndicator
            key={index}
            hasActivity={week.hasActivity}
            isInStreak={streakWeekIndices.has(index)}
          />
        ))}
      </div>
    </div>
  );
}

export function ActivityCalendar({ activities, onViewActivity }: ActivityCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Calculate streak data
  const streakData = useMemo(() => calculateStreak(activities, today), [activities, today]);

  // Build week data for the current month
  const weekData = useMemo(
    () => buildMonthWeekData(activities, currentYear, currentMonth),
    [activities, currentYear, currentMonth]
  );

  // Calculate month-specific stats
  const monthStats = useMemo(() => {
    const activeWeeks = weekData.filter((w) => w.hasActivity).length;
    // Only count activities that are in the selected month
    const totalActivities = activities.filter((activity) => {
      const date = new Date(activity.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;
    return { activeWeeks, totalActivities };
  }, [weekData, activities, currentYear, currentMonth]);

  // Get all calendar days for the grid
  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Group activities by date for quick lookup
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    activities.forEach((activity) => {
      const existing = map.get(activity.date) || [];
      existing.push(activity);
      map.set(activity.date, existing);
    });
    return map;
  }, [activities]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    // Don't allow navigating more than 1 year back
    if (isViewingOldestMonth) return;

    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    // Don't allow navigating past current month
    if (isViewingCurrentMonth) return;

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format month name
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Check if viewing current month
  const isViewingCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  // Check if viewing the oldest allowed month (1 year ago)
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
  const isViewingOldestMonth =
    currentYear === oneYearAgo.getFullYear() && currentMonth === oneYearAgo.getMonth();

  // Day headers
  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Split calendar days into weeks (rows of 7)
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{monthName}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            disabled={isViewingOldestMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            disabled={isViewingCurrentMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-8">
        <div>
          <p className="text-xs text-muted-foreground">Your Streak</p>
          <p className="text-xl font-bold">
            {streakData.currentStreak} {streakData.currentStreak === 1 ? 'Week' : 'Weeks'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active Weeks</p>
          <p className="text-xl font-bold">
            {monthStats.activeWeeks} {monthStats.activeWeeks === 1 ? 'Week' : 'Weeks'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Activities</p>
          <p className="text-xl font-bold">{monthStats.totalActivities}</p>
        </div>
      </div>

      {/* Calendar grid with streak bar */}
      <div className="flex gap-2">
        {/* Calendar */}
        <div className="flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayHeaders.map((day, i) => (
              <div
                key={i}
                className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar weeks */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const dateKey = formatDateKey(date);
                  const dayActivities = activitiesByDate.get(dateKey) || [];
                  const isCurrentMonth = isInMonth(date, currentYear, currentMonth);
                  const isToday = isSameDay(date, today);

                  return (
                    <CalendarDay
                      key={dateKey}
                      date={date}
                      isCurrentMonth={isCurrentMonth}
                      isToday={isToday}
                      dayActivities={dayActivities}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Week activity bar */}
        <WeekActivityBar weekData={weekData} streak={streakData.currentStreak} />
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Activity list for the month */}
      <ActivityList
        activities={activities}
        allActivities={activities}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onActivityClick={onViewActivity}
      />
    </div>
  );
}
