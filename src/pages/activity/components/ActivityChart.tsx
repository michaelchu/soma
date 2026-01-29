import { useRef, useMemo, useCallback, useLayoutEffect, useEffect } from 'react';
import { groupActivitiesByDay, type DayActivities } from '../utils/activityHelpers';
import type { Activity } from '@/types/activity';

interface ActivityChartProps {
  activities: Activity[];
  allActivities: Activity[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

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

export function ActivityChart({
  activities,
  allActivities,
  selectedDate,
  onSelectDate,
}: ActivityChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group activities by day
  const dailyData = useMemo(
    () => groupActivitiesByDay(activities, allActivities),
    [activities, allActivities]
  );

  // Get min/max scores for bar height scaling
  const { minScore, maxScore } = useMemo(() => {
    const scores = dailyData.map((d) => d.totalScore);
    if (scores.length === 0) return { minScore: 0, maxScore: 100 };
    return {
      minScore: Math.max(0, Math.min(...scores) - 20),
      maxScore: Math.max(...scores) + 20,
    };
  }, [dailyData]);

  // The effective selected date - use latest if none selected
  const effectiveSelectedDate =
    selectedDate || (dailyData.length > 0 ? dailyData[dailyData.length - 1].date : null);

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
    if (!container || dailyData.length === 0) return;

    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const centerOffset = scrollLeft + containerWidth / 2;

    // Account for left padding
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const adjustedOffset = centerOffset - paddingLeft;

    // Calculate which bar is centered
    const centeredIndex = Math.round(adjustedOffset / BAR_TOTAL_WIDTH);
    const clampedIndex = Math.max(0, Math.min(centeredIndex, dailyData.length - 1));

    if (dailyData[clampedIndex]) {
      onSelectDate(dailyData[clampedIndex].date);
    }
  }, [dailyData, onSelectDate]);

  // Initial scroll to the latest entry (rightmost)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || dailyData.length === 0) return;

    // Scroll to the latest entry (last in sorted array)
    const lastIndex = dailyData.length - 1;
    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const targetScroll =
      lastIndex * BAR_TOTAL_WIDTH - containerWidth / 2 + paddingLeft + BAR_WIDTH / 2;

    container.scrollLeft = Math.max(0, targetScroll);
  }, [dailyData.length]);

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

        {dailyData.map((day, index) => (
          <div
            key={day.date}
            className="flex-shrink-0 cursor-pointer"
            style={{
              scrollSnapAlign: 'center',
              marginRight: index < dailyData.length - 1 ? BAR_GAP : 0,
            }}
            onClick={() => {
              onSelectDate(day.date);
              scrollToIndex(index);
            }}
          >
            <DailyScoreBar
              day={day}
              isSelected={day.date === effectiveSelectedDate}
              maxScore={maxScore}
              minScore={minScore}
            />
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
