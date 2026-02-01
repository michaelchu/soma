import { useState, useRef, useCallback, useEffect } from 'react';
import { StickyNote, Heart } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import {
  formatDuration,
  getIntensityLabel,
  getIntensityColor,
  getActivityTypeLabel,
  getActivityTypeIcon,
  calculateEffortScore,
  calculateDailyEffortScore,
  getEffortLevel,
  hasHrZoneData,
} from '../utils/activityHelpers';
import type { Activity } from '@/types/activity';
import { HR_ZONE_OPTIONS } from '@/types/activity';

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

  const cancelPress = useCallback(() => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePressStart = useCallback(() => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setIsPressing(false);
    }, LONG_PRESS_DURATION);
  }, [onLongPress]);

  const handlePressEnd = useCallback(() => {
    cancelPress();
  }, [cancelPress]);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if user starts scrolling
    cancelPress();
  }, [cancelPress]);

  const effortScore = calculateEffortScore(activity);
  const effortLevel = getEffortLevel(effortScore);
  const hasHrData = hasHrZoneData(activity);

  // Get zone values for display
  const zoneValues = [
    activity.zone1Minutes,
    activity.zone2Minutes,
    activity.zone3Minutes,
    activity.zone4Minutes,
    activity.zone5Minutes,
  ];

  return (
    <div
      className={`select-none transition-opacity p-2 rounded-lg hover:bg-muted/50 ${isPressing ? 'opacity-60' : ''}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-500">{getActivityTypeIcon(activity.activityType)}</span>
          <span className="text-sm">
            {getActivityTypeLabel(activity.activityType)}:{' '}
            {formatDuration(activity.durationMinutes)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getIntensityColor(activity.intensity)}`}>
            {getIntensityLabel(activity.intensity)}
          </span>
          <span className={`text-xs font-semibold flex items-center gap-1 ${effortLevel.color}`}>
            {hasHrData && <Heart className="h-3 w-3" />}
            {effortScore}
          </span>
        </div>
      </div>

      {/* HR Zone breakdown (if available) */}
      {hasHrData && (
        <div className="mt-2 ml-6 flex gap-1">
          {HR_ZONE_OPTIONS.map((zone, idx) => {
            const minutes = zoneValues[idx];
            if (!minutes) return null;
            return (
              <div
                key={zone.zone}
                className="text-xs px-1.5 py-0.5 rounded bg-muted"
                title={`${zone.label}: ${zone.description}`}
              >
                Z{zone.zone}: {minutes}m
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {activity.notes && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-1 ml-6">
          <StickyNote className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap">{activity.notes}</span>
        </div>
      )}
    </div>
  );
}

export function ActivityDetails({
  activities,
  allActivities: _allActivities,
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
    <div
      ref={scrollContainerRef}
      className="mt-6 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-hide"
    >
      {/* Timeline */}
      <div className="relative">
        {dates.map((date, dateIndex) => {
          const dayActivities = groupedActivities.get(date) || [];
          const dayEffort = calculateDailyEffortScore(dayActivities);
          const dayEffortLevel = getEffortLevel(dayEffort);
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
                  <span className={`text-sm ml-3 ${dayEffortLevel.color}`}>
                    {dayEffort} effort
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
