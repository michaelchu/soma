import type { ElementType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Heart, Activity, Brain, Clock, TrendingDown } from 'lucide-react';
import { calculateSleepStats, formatDuration, formatHrvRange } from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface StatisticsTabProps {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
  dateRange: string;
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  subValue,
}: {
  icon: ElementType;
  iconColor: string;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subValue && <p className="text-sm text-muted-foreground">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

export function StatisticsTab({ entries, allEntries, dateRange }: StatisticsTabProps) {
  const stats = calculateSleepStats(entries);
  const allStats = calculateSleepStats(allEntries);

  if (!stats) {
    return (
      <div className="text-center py-12">
        <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No data for statistics</p>
      </div>
    );
  }

  const rangeLabel = dateRange === 'all' ? 'all time' : `last ${dateRange} days`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Statistics from {stats.count} entries ({rangeLabel})
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Average Duration */}
        <StatCard
          icon={Moon}
          iconColor="text-violet-500"
          label="Avg Duration"
          value={formatDuration(stats.avgDuration)}
        />

        {/* Average HRV */}
        {(stats.avgHrvLow !== null || stats.avgHrvHigh !== null) && (
          <StatCard
            icon={Activity}
            iconColor="text-green-500"
            label="Avg HRV Range"
            value={formatHrvRange(stats.avgHrvLow, stats.avgHrvHigh)}
          />
        )}

        {/* Average Resting HR */}
        {stats.avgRestingHr !== null && (
          <StatCard
            icon={Heart}
            iconColor="text-red-500"
            label="Avg Resting HR"
            value={`${stats.avgRestingHr} bpm`}
            subValue={
              stats.minRestingHr !== null && stats.maxRestingHr !== null
                ? `Range: ${stats.minRestingHr}-${stats.maxRestingHr}`
                : undefined
            }
          />
        )}

        {/* Average HR Drop */}
        {stats.avgHrDrop !== null && (
          <StatCard
            icon={TrendingDown}
            iconColor="text-blue-500"
            label="Avg HR Drop Time"
            value={`${stats.avgHrDrop} min`}
          />
        )}

        {/* Average Deep Sleep */}
        {stats.avgDeepPct !== null && (
          <StatCard
            icon={Brain}
            iconColor="text-indigo-500"
            label="Avg Deep Sleep"
            value={`${stats.avgDeepPct}%`}
          />
        )}

        {/* Average REM Sleep */}
        {stats.avgRemPct !== null && (
          <StatCard
            icon={Clock}
            iconColor="text-cyan-500"
            label="Avg REM Sleep"
            value={`${stats.avgRemPct}%`}
          />
        )}
      </div>

      {/* Comparison to all-time */}
      {dateRange !== 'all' && allStats && allStats.count > stats.count && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Compared to All Time ({allStats.count} entries)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">
                  {formatDuration(stats.avgDuration)} vs {formatDuration(allStats.avgDuration)}
                </p>
              </div>
              {stats.avgRestingHr !== null && allStats.avgRestingHr !== null && (
                <div>
                  <p className="text-muted-foreground">Resting HR</p>
                  <p className="font-medium">
                    {stats.avgRestingHr} vs {allStats.avgRestingHr} bpm
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
