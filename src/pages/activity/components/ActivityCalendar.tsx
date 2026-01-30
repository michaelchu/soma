import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Activity, ActivityType } from '@/types/activity';
import { ActivityIcon } from './ActivityIcons';
import {
  calculateStreak,
  buildMonthWeekData,
  getCalendarDays,
  formatDateKey,
  isSameDay,
  isInMonth,
  type WeekData,
} from '../utils/streakCalculator';

// Layout constants for streak bar calculations
const ROW_HEIGHT = 48; // h-12 in pixels
const ROW_GAP = 4; // gap-1 in pixels
const ROW_TOTAL = ROW_HEIGHT + ROW_GAP; // 52px per row
const ICON_SIZE = 24; // h-6 in pixels
const ICON_OFFSET = (ROW_HEIGHT - ICON_SIZE) / 2; // 12px - centers icon in row

interface ActivityCalendarProps {
  activities: Activity[];
  onEditActivity: (activity: Activity) => void;
}

// Calendar day cell component
function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  dayActivities,
  onClick,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayActivities: Activity[];
  onClick?: () => void;
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
        ${hasActivity ? 'cursor-pointer' : ''}
      `}
      onClick={hasActivity ? onClick : undefined}
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
  isCurrentWeek,
  streakCount,
  isViewingCurrentMonth,
}: {
  hasActivity: boolean;
  isInStreak: boolean;
  isCurrentWeek: boolean;
  streakCount: number;
  isViewingCurrentMonth: boolean;
}) {
  const showStreakCount = isCurrentWeek && isInStreak && streakCount > 0 && isViewingCurrentMonth;
  const showCheckmark = (hasActivity || isInStreak) && !showStreakCount;

  const circleClassName = isInStreak
    ? 'bg-orange-500'
    : hasActivity
      ? 'bg-muted-foreground'
      : 'border-2 border-muted-foreground/30';

  return (
    <div className="h-12 w-10 flex items-center justify-center relative z-10">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${circleClassName}`}>
        {showStreakCount && <span className="text-white font-bold text-xs">{streakCount}</span>}
        {showCheckmark && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
    </div>
  );
}

// Streak bar with background highlight
function StreakBar({
  weekData,
  streak,
  isViewingCurrentMonth,
}: {
  weekData: WeekData[];
  streak: number;
  isViewingCurrentMonth: boolean;
}) {
  // Find which weeks are in the current streak (counting from the end/bottom)
  // Streak weeks are consecutive weeks with activity from the most recent
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

  // Current week is the last one
  const currentWeekIndex = weekData.length - 1;

  // Only include current week in the highlight when viewing current month
  // (since the streak count number only shows on the current month)
  if (streak > 0 && isViewingCurrentMonth) {
    streakWeekIndices.add(currentWeekIndex);
  }

  // Find the first and last streak week indices for the background
  const streakIndices = Array.from(streakWeekIndices).sort((a, b) => a - b);
  const firstStreakIndex = streakIndices.length > 0 ? streakIndices[0] : -1;
  const lastStreakIndex = streakIndices.length > 0 ? streakIndices[streakIndices.length - 1] : -1;

  return (
    <div className="flex flex-col items-center relative">
      {/* Spacer for day headers */}
      <div className="h-8 mb-1" />

      {/* Week indicators with streak background */}
      <div className="relative flex-1">
        {/* Streak background - light orange rounded pill (only show on current month) */}
        {streak > 0 && firstStreakIndex >= 0 && isViewingCurrentMonth && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-8 bg-orange-500/20 rounded-full"
            style={{
              top: `${firstStreakIndex * ROW_TOTAL + ICON_OFFSET}px`,
              height: `${(lastStreakIndex - firstStreakIndex) * ROW_TOTAL + ICON_SIZE + ROW_HEIGHT}px`,
            }}
          />
        )}

        {/* Week indicators */}
        <div className="flex flex-col gap-1 relative">
          {weekData.map((week: WeekData, index: number) => (
            <WeekStreakIndicator
              key={index}
              hasActivity={week.hasActivity}
              isInStreak={streakWeekIndices.has(index)}
              isCurrentWeek={index === currentWeekIndex}
              streakCount={streak}
              isViewingCurrentMonth={isViewingCurrentMonth}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityCalendar({ activities, onEditActivity }: ActivityCalendarProps) {
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
    const totalActivities = weekData.reduce((sum, w) => sum + w.activities.length, 0);
    return { activeWeeks, totalActivities };
  }, [weekData]);

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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Handle day click - open edit modal for first activity
  const handleDayClick = (dayActivities: Activity[]) => {
    if (dayActivities.length > 0) {
      onEditActivity(dayActivities[0]);
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
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextMonth} className="h-8 w-8">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats row - shows streak for current month, active weeks for other months */}
      <div className="flex gap-8">
        <div>
          <p className="text-sm text-muted-foreground">
            {isViewingCurrentMonth ? 'Your Streak' : 'Active Weeks'}
          </p>
          <p className="text-2xl font-bold">
            {isViewingCurrentMonth
              ? `${streakData.currentStreak} ${streakData.currentStreak === 1 ? 'Week' : 'Weeks'}`
              : `${monthStats.activeWeeks} ${monthStats.activeWeeks === 1 ? 'Week' : 'Weeks'}`}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {isViewingCurrentMonth ? 'Streak Activities' : 'Total Activities'}
          </p>
          <p className="text-2xl font-bold">
            {isViewingCurrentMonth ? streakData.streakActivities : monthStats.totalActivities}
          </p>
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
                      onClick={() => handleDayClick(dayActivities)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Streak bar */}
        <StreakBar
          weekData={weekData}
          streak={streakData.currentStreak}
          isViewingCurrentMonth={isViewingCurrentMonth}
        />
      </div>
    </div>
  );
}
