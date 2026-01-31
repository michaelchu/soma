import { Activity, Clock } from 'lucide-react';
import { BPStatusBadge } from './BPStatusBadge';
import { formatDateTime, getTrend } from '../../utils/bpHelpers';
import { useBloodPressureSettings } from '../../hooks/useBloodPressureSettings';

interface BPReading {
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
}

interface LatestReadingProps {
  readings: BPReading[];
}

export function LatestReading({ readings }: LatestReadingProps) {
  const { getCategory } = useBloodPressureSettings();

  if (!readings || readings.length === 0) {
    return <p className="text-muted-foreground text-center">No readings yet</p>;
  }

  const latest = readings[0]; // readings are sorted descending
  const category = getCategory(latest.systolic, latest.diastolic);
  const { date, time } = formatDateTime(latest.datetime);
  const trend = getTrend(readings);

  return (
    <div>
      <h3 className="text-base font-semibold mb-4">Latest Reading</h3>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Clock className="h-4 w-4" />
            <span>{date}</span>
            <span className="text-muted-foreground/60">at</span>
            <span>{time}</span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl sm:text-5xl font-bold text-foreground">
              {latest.systolic}
            </span>
            <span className="text-2xl sm:text-3xl text-muted-foreground">/</span>
            <span className="text-4xl sm:text-5xl font-bold text-foreground">
              {latest.diastolic}
            </span>
            <span className="text-sm text-muted-foreground ml-1">mmHg</span>
          </div>

          <div className="flex items-center gap-3">
            <BPStatusBadge category={category} />
            {latest.pulse && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>{latest.pulse} bpm</span>
              </div>
            )}
          </div>

          {trend && (
            <div className="mt-3 flex gap-4 text-sm">
              <TrendDisplay label="Systolic" trend={trend.systolic as TrendData} />
              <TrendDisplay label="Diastolic" trend={trend.diastolic as TrendData} />
            </div>
          )}

          {latest.notes && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              &ldquo;{latest.notes}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TrendData {
  diff: number;
  direction: 'up' | 'down' | 'stable';
  isImproving: boolean;
}

interface TrendDisplayProps {
  label: string;
  trend: TrendData;
}

function TrendDisplay({ label, trend }: TrendDisplayProps) {
  if (trend.diff === 0) return null;

  const arrow = trend.direction === 'up' ? '↑' : '↓';
  const colorClass = trend.isImproving
    ? 'text-green-600 dark:text-green-400'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <span className={colorClass}>
      {arrow} {Math.abs(trend.diff)} {label.toLowerCase()}
    </span>
  );
}
