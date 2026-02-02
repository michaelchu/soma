import { Heart } from 'lucide-react';
import type { Activity } from '@/types/activity';
import { ActivityIcon } from './ActivityIcons';
import { formatDate } from '@/lib/dateUtils';
import {
  formatDuration,
  getActivityTypeLabel,
  getTimeOfDayLabel,
  calculateEffortScore,
  getEffortBadgeColor,
  hasHrZoneData,
} from '../utils/activityHelpers';

interface ActivityListProps {
  activities: Activity[];
  allActivities: Activity[];
  currentMonth: number;
  currentYear: number;
  onActivityClick: (activity: Activity) => void;
}

export function ActivityList({
  activities,
  allActivities: _allActivities,
  currentMonth,
  currentYear,
  onActivityClick,
}: ActivityListProps) {
  // Filter activities for the current month
  // Parse date string directly to avoid timezone issues (format: YYYY-MM-DD)
  const monthActivities = activities
    .filter((activity) => {
      const [year, month] = activity.date.split('-').map(Number);
      return year === currentYear && month === currentMonth + 1; // month is 1-indexed in date string
    })
    .sort((a, b) => {
      // Sort by date descending, then by time of day
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // Time order: morning < afternoon < evening < late_evening
      const timeOrder = { morning: 0, afternoon: 1, evening: 2, late_evening: 3 };
      return (timeOrder[a.timeOfDay] || 0) - (timeOrder[b.timeOfDay] || 0);
    });

  if (monthActivities.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No activities this month</div>;
  }

  return (
    <div className="space-y-2 pb-4">
      <h3 className="text-lg font-semibold">Activities</h3>
      <div className="space-y-2">
        {monthActivities.map((activity) => {
          const effortScore = calculateEffortScore(activity);
          const hasHrData = hasHrZoneData(activity);
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onActivityClick(activity)}
            >
              {/* Activity icon */}
              <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                <ActivityIcon type={activity.activityType} size={22} className="text-background" />
              </div>

              {/* Activity details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {getActivityTypeLabel(activity.activityType)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${getEffortBadgeColor(effortScore)}`}
                  >
                    {hasHrData && <Heart className="h-3 w-3" />}
                    {effortScore}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatDate(activity.date, { includeWeekday: true })}</span>
                  <span>•</span>
                  <span>{getTimeOfDayLabel(activity.timeOfDay)}</span>
                  <span>•</span>
                  <span>{formatDuration(activity.durationMinutes)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
