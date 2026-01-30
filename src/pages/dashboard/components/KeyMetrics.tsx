import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

interface Trend {
  diff: number;
  improving: boolean;
}

interface Metric {
  label: string;
  value: string;
  unit?: string;
  trend: Trend | null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function KeyMetrics() {
  const { healthScore, bpReadings, sleepEntries } = useDashboard();

  // Calculate trends
  const getBpTrend = (): Trend | null => {
    if (bpReadings.length < 4) return null;
    const mid = Math.floor(bpReadings.length / 2);
    const older = bpReadings.slice(mid);
    const recent = bpReadings.slice(0, mid);

    const olderAvg = older.reduce((sum, r) => sum + r.systolic, 0) / older.length;
    const recentAvg = recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff < 0 };
  };

  const getSleepTrend = (): Trend | null => {
    if (sleepEntries.length < 4) return null;
    const sorted = [...sleepEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = older.reduce((sum, e) => sum + e.durationMinutes, 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + e.durationMinutes, 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff > 0 };
  };

  const getRhrTrend = (): Trend | null => {
    const withRhr = sleepEntries.filter((e) => e.restingHr);
    if (withRhr.length < 4) return null;
    const sorted = [...withRhr].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    const olderAvg = older.reduce((sum, e) => sum + (e.restingHr || 0), 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + (e.restingHr || 0), 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff < 0 }; // Lower RHR is better
  };

  const getHrvTrend = (): Trend | null => {
    const withHrv = sleepEntries.filter((e) => e.hrvHigh);
    if (withHrv.length < 4) return null;
    const sorted = [...withHrv].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid);
    const recent = sorted.slice(mid);

    // Use hrvHigh for trend comparison
    const olderAvg = older.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / older.length;
    const recentAvg = recent.reduce((sum, e) => sum + (e.hrvHigh || 0), 0) / recent.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
    return { diff: Math.round(diff), improving: diff > 0 }; // Higher HRV is better
  };

  const bpTrend = getBpTrend();
  const sleepTrend = getSleepTrend();
  const rhrTrend = getRhrTrend();
  const hrvTrend = getHrvTrend();

  const metrics: Metric[] = [
    {
      label: 'BP',
      value: healthScore?.bpScore
        ? `${healthScore.bpScore.avgSystolic}/${healthScore.bpScore.avgDiastolic}`
        : '—',
      trend: bpTrend,
    },
    {
      label: 'Sleep',
      value: healthScore?.sleepScore
        ? formatDuration(healthScore.sleepScore.avgDurationMinutes)
        : '—',
      trend: sleepTrend,
    },
    {
      label: 'RHR',
      value:
        sleepEntries.filter((e) => e.restingHr).length > 0
          ? `${Math.round(
              sleepEntries
                .filter((e) => e.restingHr)
                .reduce((sum, e) => sum + (e.restingHr || 0), 0) /
                sleepEntries.filter((e) => e.restingHr).length
            )}`
          : '—',
      unit: 'bpm',
      trend: rhrTrend,
    },
    {
      label: 'HRV',
      value:
        sleepEntries.filter((e) => e.hrvHigh).length > 0
          ? `${Math.round(
              sleepEntries.filter((e) => e.hrvLow).reduce((sum, e) => sum + (e.hrvLow || 0), 0) /
                sleepEntries.filter((e) => e.hrvLow).length
            )}-${Math.round(
              sleepEntries.filter((e) => e.hrvHigh).reduce((sum, e) => sum + (e.hrvHigh || 0), 0) /
                sleepEntries.filter((e) => e.hrvHigh).length
            )}`
          : '—',
      unit: 'ms',
      trend: hrvTrend,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p className="text-lg font-semibold whitespace-nowrap">
            {metric.value}
            {metric.unit && (
              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                {metric.unit}
              </span>
            )}
          </p>
          {metric.trend && (
            <div
              className={`flex items-center justify-center gap-0.5 text-xs ${
                metric.trend.improving
                  ? 'text-green-600 dark:text-green-400'
                  : metric.trend.diff !== 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
              }`}
            >
              {metric.trend.diff > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : metric.trend.diff < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{Math.abs(metric.trend.diff)}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
