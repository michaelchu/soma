import { useMemo } from 'react';
import { Moon } from 'lucide-react';
import { formatDate, getDateRange } from '@/lib/dateUtils';
import {
  formatDuration,
  calculateDetailedStats,
  getPreviousPeriodEntries,
  type DetailedSleepStats,
} from '../../utils/sleepHelpers';
import { ChangeIndicator, type ChangeConfig } from '@/components/shared/ChangeIndicator';
import type { SleepEntry } from '@/lib/db/sleep';

interface StatisticsTabProps {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
  dateRange: string;
}

interface StatRowConfig {
  label: string;
  key: keyof DetailedSleepStats;
  config: ChangeConfig;
  formatValue?: (val: number) => string;
  formatDisplay?: (val: number) => string;
}

function StatsTable({
  currentStats,
  previousStats,
  dateRange,
}: {
  currentStats: DetailedSleepStats | null;
  previousStats: DetailedSleepStats | null;
  dateRange: string;
}) {
  const rows: StatRowConfig[] = [
    {
      label: 'Deep Sleep',
      key: 'deepSleepPct',
      config: { type: 'higherIsBetter' },
    },
    {
      label: 'Restorative',
      key: 'restorative',
      config: { type: 'higherIsBetter' },
    },
    {
      label: 'Resting HR',
      key: 'restingHr',
      config: { type: 'lowerIsBetter' },
    },
    {
      label: 'REM Sleep',
      key: 'remSleepPct',
      config: { type: 'higherIsBetter' },
    },
    {
      label: 'HR Drop',
      key: 'hrDrop',
      config: { type: 'lowerIsBetter' },
    },
  ];

  const formatCell = (val: number | null, row: StatRowConfig): string => {
    if (val === null) return '—';
    if (row.formatDisplay) return row.formatDisplay(val);
    return String(Math.round(val));
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Metric</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Min</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Max</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Avg</th>
          <th className="text-center py-2 pl-2 font-medium text-muted-foreground">vs Prev</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const current = currentStats?.[row.key] as
            | { min: number | null; max: number | null; avg: number | null }
            | undefined;
          const previous = previousStats?.[row.key] as
            | { min: number | null; max: number | null; avg: number | null }
            | undefined;

          // Skip row if no data
          if (!current || current.avg === null) {
            return null;
          }

          return (
            <tr key={row.key} className="border-b last:border-0">
              <td className="py-3 pr-3">
                <span className="font-medium">{row.label}</span>
              </td>
              <td className="py-3 px-2 text-center font-mono text-xs">
                {formatCell(current.min, row)}
              </td>
              <td className="py-3 px-2 text-center font-mono text-xs">
                {formatCell(current.max, row)}
              </td>
              <td className="py-3 px-2 text-center font-mono font-semibold">
                {formatCell(current.avg, row)}
              </td>
              <td className="py-3 pl-2 text-center text-xs">
                <ChangeIndicator
                  current={current.avg}
                  previous={previous?.avg ?? null}
                  config={row.config}
                  disabled={dateRange === 'all'}
                  formatValue={row.formatValue}
                  useIntegerRounding
                  showZeroIcon
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function StatisticsTab({ entries, allEntries, dateRange }: StatisticsTabProps) {
  // Calculate current period stats
  const currentStats = useMemo(() => calculateDetailedStats(entries), [entries]);

  // Calculate previous period stats
  const previousEntries = useMemo(
    () => getPreviousPeriodEntries(allEntries, dateRange),
    [allEntries, dateRange]
  );
  const previousStats = useMemo(() => calculateDetailedStats(previousEntries), [previousEntries]);

  // Get actual date range from entries (entries are sorted newest first)
  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'all') {
      if (entries.length === 0) return 'All Time';
      const oldest = entries[entries.length - 1];
      const newest = entries[0];
      return `${formatDate(oldest.date)} – ${formatDate(newest.date)}`;
    }

    const { start, end } = getDateRange(dateRange);
    if (!start) return 'All Time';

    return `${formatDate(start)} – ${formatDate(end)}`;
  }, [dateRange, entries]);

  if (!currentStats) {
    return (
      <div className="text-center py-12">
        <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No data for statistics</p>
      </div>
    );
  }

  const hasPreviousData = previousStats !== null;

  // Check if we have HRV data
  const hasHrvData = currentStats.hrvLow?.avg != null && currentStats.hrvHigh?.avg != null;
  const hasPreviousHrv =
    previousStats != null &&
    previousStats.hrvLow?.avg != null &&
    previousStats.hrvHigh?.avg != null;

  return (
    <div className="space-y-6">
      {/* Key Metrics Header */}
      <div className="grid grid-cols-2 gap-4">
        {/* Average Duration */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
          <p className="text-2xl font-bold">{formatDuration(currentStats.duration.avg)}</p>
          {hasPreviousData && dateRange !== 'all' && (
            <p className="text-sm text-muted-foreground">
              prev: {formatDuration(previousStats.duration.avg)}
            </p>
          )}
        </div>

        {/* HRV */}
        {hasHrvData && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Avg HRV</p>
            <p className="text-2xl font-bold">
              {Math.round(currentStats.hrvLow!.avg!)}–{Math.round(currentStats.hrvHigh!.avg!)}
              <span className="text-base font-normal text-muted-foreground ml-1">ms</span>
            </p>
            {hasPreviousHrv && dateRange !== 'all' && (
              <p className="text-sm text-muted-foreground">
                prev: {Math.round(previousStats!.hrvLow!.avg!)}–
                {Math.round(previousStats!.hrvHigh!.avg!)}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          {currentStats.count} {currentStats.count === 1 ? 'entry' : 'entries'} ({dateRangeLabel})
        </p>
        <hr className="border-border" />
      </div>

      {/* Stats Table */}
      <div>
        <h3 className="text-base font-semibold mb-3">Detailed Statistics</h3>
        <StatsTable
          currentStats={currentStats}
          previousStats={previousStats}
          dateRange={dateRange}
        />
        {!hasPreviousData && dateRange !== 'all' && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            No previous period data available for comparison
          </p>
        )}
        {dateRange === 'all' && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Select a date range to see comparison with previous period
          </p>
        )}
      </div>

      <hr className="border-border" />

      {/* Reference Ranges */}
      <div>
        <h3 className="text-base font-semibold mb-3">Reference Ranges</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Metric</th>
              <th className="text-right py-2 pl-3 font-medium text-muted-foreground">
                Optimal Range
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 pr-3">
                <span className="font-medium">Deep Sleep</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">15–25%</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-3">
                <span className="font-medium">REM Sleep</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">20–25%</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-3">
                <span className="font-medium">Restorative (Deep+REM)</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">40–50%</td>
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-3">
                <span className="font-medium">Resting HR</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">
                <div>40–60 bpm</div>
                <div className="text-muted-foreground text-xs">(athletes: 40–50)</div>
              </td>
            </tr>
            <tr className="border-b last:border-0">
              <td className="py-3 pr-3">
                <span className="font-medium">HR Drop</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">
                <div>120–240 min</div>
                <div className="text-muted-foreground text-xs">(first half of sleep)</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
