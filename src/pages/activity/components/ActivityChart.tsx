import { useRef, useMemo, useCallback, useLayoutEffect, useEffect } from 'react';
import { toLocalDateString } from '@/lib/dateUtils';
import { groupActivitiesByDay, type DayActivities } from '../utils/activityHelpers';
import type { Activity } from '@/types/activity';

interface ActivityChartProps {
  activities: Activity[];
  allActivities: Activity[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  dateRange: string;
}

type ChartItem =
  | { type: 'activity'; date: string; dayData: DayActivities }
  | { type: 'placeholder'; date: string };

const BAR_WIDTH = 36;
const BAR_GAP = 4;
const BAR_TOTAL_WIDTH = BAR_WIDTH + BAR_GAP;
const MAX_BAR_HEIGHT = 120;
const MIN_BAR_HEIGHT = 40;

function DailyScoreBar({
  day,
  isSelected,
  maxScore,
  minScore,
}: {
  day: DayActivities;
  isSelected: boolean;
  maxScore: number;
  minScore: number;
}) {
  // Calculate bar height relative to score range
  const range = maxScore - minScore || 1;
  const normalizedHeight =
    ((day.totalScore - minScore) / range) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) + MIN_BAR_HEIGHT;

  // Get day of week abbreviation
  const date = new Date(day.date + 'T00:00:00');
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  // Show activity count if multiple
  const activityCount = day.activities.length;

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH }}
    >
      {/* Bar with score inside */}
      <div
        className={`w-full rounded-t-lg transition-all duration-200 flex flex-col items-center justify-start pt-2 ${
          isSelected ? 'bg-foreground' : 'bg-muted-foreground/40'
        }`}
        style={{ height: normalizedHeight }}
      >
        <span
          className={`text-xs font-bold transition-colors ${
            isSelected ? 'text-background' : 'text-foreground/90'
          }`}
        >
          {day.totalScore}
        </span>
        {activityCount > 1 && (
          <span
            className={`text-[10px] transition-colors ${
              isSelected ? 'text-background/70' : 'text-foreground/60'
            }`}
          >
            ×{activityCount}
          </span>
        )}
      </div>

      {/* Day label */}
      <span
        className={`text-xs mt-2 transition-colors ${
          isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
        }`}
      >
        {dayName}
      </span>
    </div>
  );
}

function PlaceholderBar({ date }: { date: string }) {
  const dateObj = new Date(date + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH }}
    >
      {/* Thin baseline where bar would start */}
      <div className="w-full h-[2px] rounded-full bg-muted-foreground/20" />

      {/* Day label */}
      <span className="text-xs mt-2 text-muted-foreground/50">{dayName}</span>
    </div>
  );
}

export function ActivityChart({
  activities,
  allActivities,
  selectedDate,
  onSelectDate,
  dateRange,
}: ActivityChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group activities by day
  const dailyData = useMemo(
    () => groupActivitiesByDay(activities, allActivities),
    [activities, allActivities]
  );

  // Create a map of daily data by date for quick lookup
  const dailyDataByDate = useMemo(() => {
    const map = new Map<string, DayActivities>();
    for (const day of dailyData) {
      map.set(day.date, day);
    }
    return map;
  }, [dailyData]);

  // Generate all dates in the range
  const allDatesInRange = useMemo(() => {
    const days = dateRange === 'all' ? null : parseInt(dateRange, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    if (days === null) {
      // For 'all', use the earliest activity date or today
      if (dailyData.length > 0) {
        startDate = new Date(dailyData[0].date);
      } else {
        startDate = today;
      }
    } else {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);
    }

    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = toLocalDateString(current);
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dailyData, dateRange]);

  // Build chart items combining activities and placeholders
  const chartItems = useMemo((): ChartItem[] => {
    return allDatesInRange.map((date) => {
      const dayData = dailyDataByDate.get(date);
      if (dayData) {
        return { type: 'activity' as const, date, dayData };
      }
      return { type: 'placeholder' as const, date };
    });
  }, [allDatesInRange, dailyDataByDate]);

  // Get only days with activities for min/max calculation
  const daysWithActivities = useMemo(() => {
    return chartItems.filter(
      (item): item is ChartItem & { type: 'activity' } => item.type === 'activity'
    );
  }, [chartItems]);

  // Get min/max scores for bar height scaling
  const { minScore, maxScore } = useMemo(() => {
    const scores = daysWithActivities.map((d) => d.dayData.totalScore);
    if (scores.length === 0) return { minScore: 0, maxScore: 100 };
    return {
      minScore: Math.max(0, Math.min(...scores) - 20),
      maxScore: Math.max(...scores) + 20,
    };
  }, [daysWithActivities]);

  // The effective selected date - use latest activity date if none selected
  const effectiveSelectedDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    if (daysWithActivities.length > 0) {
      return daysWithActivities[daysWithActivities.length - 1].date;
    }
    return null;
  }, [selectedDate, daysWithActivities]);

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const targetScroll = index * BAR_TOTAL_WIDTH - containerWidth / 2 + paddingLeft + BAR_WIDTH / 2;

    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: 'smooth',
    });
  }, []);

  // Handle scroll to auto-select centered bar
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || chartItems.length === 0) return;

    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const centerOffset = scrollLeft + containerWidth / 2;

    // Account for left padding
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const adjustedOffset = centerOffset - paddingLeft;

    // Calculate which bar is centered
    const centeredIndex = Math.round(adjustedOffset / BAR_TOTAL_WIDTH);
    const clampedIndex = Math.max(0, Math.min(centeredIndex, chartItems.length - 1));

    const item = chartItems[clampedIndex];
    if (item && item.type === 'activity') {
      onSelectDate(item.date);
    }
  }, [chartItems, onSelectDate]);

  // Initial scroll to the latest entry (rightmost activity)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || chartItems.length === 0) return;

    // Find the last activity index
    let lastActivityIndex = chartItems.length - 1;
    for (let i = chartItems.length - 1; i >= 0; i--) {
      if (chartItems[i].type === 'activity') {
        lastActivityIndex = i;
        break;
      }
    }

    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const targetScroll =
      lastActivityIndex * BAR_TOTAL_WIDTH - containerWidth / 2 + paddingLeft + BAR_WIDTH / 2;

    container.scrollLeft = Math.max(0, targetScroll);
  }, [chartItems.length]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground">No activities in this period</p>
      </div>
    );
  }

  return (
    <div className="relative -mx-5 sm:-mx-6 px-5 sm:px-6">
      <div
        ref={scrollContainerRef}
        className="flex items-end overflow-x-auto scrollbar-hide py-4"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Left padding to allow first item to center */}
        <div
          style={{
            minWidth: `calc(50% - ${BAR_WIDTH / 2}px)`,
            flexShrink: 0,
          }}
        />

        {chartItems.map((item, index) => (
          <div
            key={item.date}
            className={`flex-shrink-0 ${item.type === 'activity' ? 'cursor-pointer' : ''}`}
            style={{
              scrollSnapAlign: 'center',
              marginRight: index < chartItems.length - 1 ? BAR_GAP : 0,
            }}
            onClick={() => {
              if (item.type === 'activity') {
                onSelectDate(item.date);
                scrollToIndex(index);
              }
            }}
          >
            {item.type === 'activity' ? (
              <DailyScoreBar
                day={item.dayData}
                isSelected={item.date === effectiveSelectedDate}
                maxScore={maxScore}
                minScore={minScore}
              />
            ) : (
              <PlaceholderBar date={item.date} />
            )}
          </div>
        ))}

        {/* Right padding to allow last item to center */}
        <div
          style={{
            minWidth: `calc(50% - ${BAR_WIDTH / 2}px)`,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Fade overlays for edge blending */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
