import type { Activity } from '@/types/activity';
import { ActivityIcon } from './ActivityIcons';
import {
  formatDuration,
  getActivityTypeLabel,
  getTimeOfDayLabel,
  calculateActivityScore,
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
  allActivities,
  currentMonth,
  currentYear,
  onActivityClick,
}: ActivityListProps) {
  // Filter activities for the current month
  const monthActivities = activities
    .filter((activity) => {
      const date = new Date(activity.date + 'T00:00:00');
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-2 pb-4">
      <h3 className="text-lg font-semibold">Activities</h3>
      <div className="space-y-2">
        {monthActivities.map((activity) => {
          const score = calculateActivityScore(activity, allActivities);
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
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
                  <span className="text-sm font-semibold text-orange-500 flex-shrink-0">
                    {score} pts
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatDate(activity.date)}</span>
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
