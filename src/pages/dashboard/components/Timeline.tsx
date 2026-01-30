import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import {
  getActivityTypeLabel,
  formatDuration as formatActivityDuration,
} from '@/pages/activity/utils/activityHelpers';
import type { Activity as ActivityType } from '@/types/activity';

export function Timeline() {
  const { timeline } = useDashboard();
  const navigate = useNavigate();

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent activity</p>
      </div>
    );
  }

  // Group by date
  const grouped: { [date: string]: typeof timeline } = {};
  timeline.forEach((entry) => {
    const dateKey = entry.date.toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });

  const formatRelativeDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return formatDate(date.toISOString().slice(0, 10), { includeWeekday: true });
  };

  const handleEntryClick = (entry: (typeof timeline)[0]) => {
    if (entry.type === 'bp') {
      navigate('/blood-pressure');
    } else if (entry.type === 'sleep') {
      navigate('/sleep');
    } else if (entry.type === 'activity') {
      navigate('/activity');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Recent Activity
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {Object.entries(grouped).map(([dateKey, entries]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-[15px] h-[15px] rounded-full bg-foreground border-2 border-background relative z-0" />
                <span className="text-sm font-medium text-foreground">
                  {formatRelativeDate(new Date(dateKey))}
                </span>
              </div>

              {/* Entries for this date */}
              <div className="ml-7 space-y-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleEntryClick(entry)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {entry.type === 'bp' ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">💓</span>
                          <span className="text-sm">
                            BP: {(entry.data as { systolic: number; diastolic: number }).systolic}/
                            {(entry.data as { systolic: number; diastolic: number }).diastolic}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            (entry.data as { datetime: string }).datetime
                          ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : entry.type === 'sleep' ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-500">😴</span>
                          <span className="text-sm">
                            Sleep:{' '}
                            {Math.floor(
                              (entry.data as { durationMinutes: number }).durationMinutes / 60
                            )}
                            h {(entry.data as { durationMinutes: number }).durationMinutes % 60}m
                          </span>
                        </div>
                        {(entry.data as { sleepStart: string | null }).sleepStart && (
                          <span className="text-xs text-muted-foreground">
                            {formatTimeString((entry.data as { sleepStart: string }).sleepStart)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">🏃</span>
                          <span className="text-sm">
                            {getActivityTypeLabel((entry.data as ActivityType).activityType)}:{' '}
                            {formatActivityDuration((entry.data as ActivityType).durationMinutes)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(entry.data as ActivityType).timeOfDay.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
