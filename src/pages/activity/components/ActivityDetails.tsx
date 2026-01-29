import { useState, useRef, useCallback, useEffect } from 'react';
import { Clock, Flame, StickyNote } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import {
  calculateDailyActivityScore,
  formatDuration,
  getIntensityLabel,
  getIntensityColor,
  getTimeOfDayLabel,
} from '../utils/activityHelpers';
import type { Activity } from '@/types/activity';

interface ActivityDetailsProps {
  activities: Activity[];
  allActivities: Activity[];
  onEditActivity: (activity: Activity) => void;
  selectedDate: string | null;
}

// Group activities by date for timeline display
function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const grouped = new Map<string, Activity[]>();

  // Sort by date descending (most recent first)
  const sorted = [...activities].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const activity of sorted) {
    const existing = grouped.get(activity.date) || [];
    grouped.set(activity.date, [...existing, activity]);
  }

  return grouped;
}

const LONG_PRESS_DURATION = 500; // ms

function ActivityItem({ activity, onLongPress }: { activity: Activity; onLongPress: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const handlePressStart = useCallback(() => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressing(false);
    }, LONG_PRESS_DURATION);
  }, [onLongPress]);

  const handlePressEnd = useCallback(() => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <div
      className={`space-y-1 select-none transition-opacity ${isPressing ? 'opacity-60' : ''}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Time and Duration */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{getTimeOfDayLabel(activity.timeOfDay)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(activity.durationMinutes)}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={`flex items-center gap-1 ${getIntensityColor(activity.intensity)}`}>
          <Flame className="h-3 w-3" />
          {getIntensityLabel(activity.intensity)}
        </span>
      </div>

      {/* Notes */}
      {activity.notes && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap">{activity.notes}</span>
        </div>
      )}
    </div>
  );
}

export function ActivityDetails({
  activities,
  allActivities,
  onEditActivity,
  selectedDate,
}: ActivityDetailsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected date when it changes
  useEffect(() => {
    if (!selectedDate) return;

    const dateElement = dateRefs.current.get(selectedDate);
    if (dateElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = dateElement.getBoundingClientRect();

      // Check if element is outside visible area
      const isAbove = elementRect.top < containerRect.top;
      const isBelow = elementRect.bottom > containerRect.bottom;

      if (isAbove || isBelow) {
        dateElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedDate]);

  if (activities.length === 0) return null;

  const groupedActivities = groupByDate(activities);
  const dates = Array.from(groupedActivities.keys());

  return (
    <div ref={scrollContainerRef} className="mt-6 max-h-[50vh] overflow-y-auto scrollbar-hide">
      {/* Timeline */}
      <div className="relative">
        {dates.map((date, dateIndex) => {
          const dayActivities = groupedActivities.get(date) || [];
          const dayScore = calculateDailyActivityScore(dayActivities, allActivities);
          const totalDuration = dayActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
          const isSelected = date === selectedDate;

          return (
            <div
              key={date}
              ref={(el) => {
                if (el) dateRefs.current.set(date, el);
              }}
              className="relative"
            >
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-3 h-3 rounded-full transition-colors ${
                    isSelected ? 'bg-foreground' : 'bg-muted-foreground/50'
                  }`}
                />
                <div className="flex-1">
                  <span className={`font-semibold ${isSelected ? '' : 'text-muted-foreground'}`}>
                    {formatDate(date, { includeWeekday: true })}
                  </span>
                  <span className="text-sm text-muted-foreground ml-3">
                    {dayScore} pts · {formatDuration(totalDuration)}
                  </span>
                </div>
              </div>

              {/* Activities for this date */}
              <div className="ml-1.5 border-l border-border pl-5 pb-4">
                {dayActivities.map((activity, activityIndex) => (
                  <div
                    key={activity.id}
                    className={activityIndex < dayActivities.length - 1 ? 'mb-4' : ''}
                  >
                    <ActivityItem
                      activity={activity}
                      onLongPress={() => onEditActivity(activity)}
                    />
                  </div>
                ))}
              </div>

              {/* Connecting line to next date */}
              {dateIndex < dates.length - 1 && (
                <div className="absolute left-1.5 top-3 bottom-0 w-px bg-border -z-10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
