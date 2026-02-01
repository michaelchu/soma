import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Zap, Heart, Sun, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import {
  formatDuration,
  getIntensityLabel,
  getIntensityColor,
  getActivityTypeLabel,
  getActivityTypeIcon,
  getTimeOfDayLabel,
  calculateEffortScore,
  getEffortLevel,
  hasHrZoneData,
} from '../../utils/activityHelpers';
import type { Activity } from '@/types/activity';
import { HR_ZONE_OPTIONS } from '@/types/activity';

// Format minutes as mm:ss
function formatMinutesAsTime(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface ActivityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  onEdit: (activity: Activity) => void;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  valueColor?: string;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex items-start gap-3 py-2 px-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${valueColor || ''}`}>{value}</p>
      </div>
    </div>
  );
}

// HR Zone colors - gradient from cool to hot
const ZONE_COLORS = {
  zone1: 'bg-blue-400',
  zone2: 'bg-green-400',
  zone3: 'bg-yellow-400',
  zone4: 'bg-orange-400',
  zone5: 'bg-red-500',
};

const ZONE_TEXT_COLORS = {
  zone1: 'text-blue-500',
  zone2: 'text-green-500',
  zone3: 'text-yellow-500',
  zone4: 'text-orange-500',
  zone5: 'text-red-500',
};

function HRZonesDetail({ activity }: { activity: Activity }) {
  const hasZones = hasHrZoneData(activity);
  if (!hasZones) return null;

  const zones = [
    {
      key: 'zone1',
      value: activity.zone1Minutes,
      color: ZONE_COLORS.zone1,
      textColor: ZONE_TEXT_COLORS.zone1,
      ...HR_ZONE_OPTIONS[0],
    },
    {
      key: 'zone2',
      value: activity.zone2Minutes,
      color: ZONE_COLORS.zone2,
      textColor: ZONE_TEXT_COLORS.zone2,
      ...HR_ZONE_OPTIONS[1],
    },
    {
      key: 'zone3',
      value: activity.zone3Minutes,
      color: ZONE_COLORS.zone3,
      textColor: ZONE_TEXT_COLORS.zone3,
      ...HR_ZONE_OPTIONS[2],
    },
    {
      key: 'zone4',
      value: activity.zone4Minutes,
      color: ZONE_COLORS.zone4,
      textColor: ZONE_TEXT_COLORS.zone4,
      ...HR_ZONE_OPTIONS[3],
    },
    {
      key: 'zone5',
      value: activity.zone5Minutes,
      color: ZONE_COLORS.zone5,
      textColor: ZONE_TEXT_COLORS.zone5,
      ...HR_ZONE_OPTIONS[4],
    },
  ];

  // Calculate total zone time
  const totalZoneTime = zones.reduce((sum, z) => sum + (z.value || 0), 0);

  // Calculate high intensity time (zones 4+5)
  const highIntensityTime = (activity.zone4Minutes || 0) + (activity.zone5Minutes || 0);
  const highIntensityPct =
    totalZoneTime > 0 ? Math.round((highIntensityTime / totalZoneTime) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Horizontal stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
        {zones.map((zone) => {
          if (!zone.value || zone.value === 0) return null;
          const pct = (zone.value / totalZoneTime) * 100;
          return (
            <div
              key={zone.key}
              className={`${zone.color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${zone.label}: ${zone.value} min (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Zone breakdown list */}
      <div className="space-y-2">
        {zones.map((zone) => {
          if (!zone.value || zone.value === 0) return null;
          const pct = Math.round((zone.value / totalZoneTime) * 100);
          return (
            <div key={zone.key} className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${zone.color} flex-shrink-0`} />
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{zone.label}</span>
                  <span className="text-xs text-muted-foreground">{zone.bpmRange} bpm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatMinutesAsTime(zone.value)}
                  </span>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* High intensity summary */}
      {highIntensityTime > 0 && (
        <div className="bg-orange-500/10 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-orange-600 dark:text-orange-400">
            High Intensity (Zone 4 + 5)
          </span>
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
            {formatMinutesAsTime(highIntensityTime)} ({highIntensityPct}%)
          </span>
        </div>
      )}
    </div>
  );
}

export function ActivityDetailModal({
  open,
  onOpenChange,
  activity,
  onEdit,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const effortScore = calculateEffortScore(activity);
  const effortLevel = getEffortLevel(effortScore);
  const hasHrData = hasHrZoneData(activity);

  const handleEdit = () => {
    onOpenChange(false);
    onEdit(activity);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-lg overflow-hidden p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-xl">{getActivityTypeIcon(activity.activityType)}</span>
            </div>
            <div>
              <DialogTitle className="text-lg">
                {getActivityTypeLabel(activity.activityType)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(activity.date, { includeWeekday: true })}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-5">
          <div className="space-y-5 py-4">
            {/* Effort Score Section */}
            <div className="text-center pb-4 border-b">
              <div className="inline-flex items-center gap-2 mb-2">
                {hasHrData && <Heart className="h-5 w-5 text-red-500" />}
                <span className={`text-5xl font-bold font-mono ${effortLevel.color}`}>
                  {effortScore}
                </span>
              </div>
              <p className={`text-sm font-medium ${effortLevel.color}`}>
                {effortLevel.label} Effort
              </p>
              {!hasHrData && (
                <p className="text-xs text-muted-foreground mt-1">Estimated from intensity</p>
              )}
            </div>

            {/* Activity Details */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Activity Details
              </h3>
              <div className="bg-muted/30 rounded-lg divide-y divide-border border">
                <MetricItem
                  icon={Clock}
                  label="Duration"
                  value={formatDuration(activity.durationMinutes)}
                />
                <MetricItem
                  icon={Zap}
                  label="Intensity"
                  value={getIntensityLabel(activity.intensity)}
                  valueColor={getIntensityColor(activity.intensity)}
                />
                <MetricItem
                  icon={Sun}
                  label="Time of Day"
                  value={getTimeOfDayLabel(activity.timeOfDay)}
                />
              </div>
            </div>

            {/* HR Zones */}
            {hasHrData && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Heart Rate Zones
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <HRZonesDetail activity={activity} />
                </div>
              </div>
            )}

            {/* Notes */}
            {activity.notes && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <p className="text-sm whitespace-pre-wrap">{activity.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0 border-t flex gap-3">
          <Button variant="outline" onClick={handleEdit} className="flex-1">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
