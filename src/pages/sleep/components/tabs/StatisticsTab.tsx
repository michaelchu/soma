import { useMemo } from 'react';
import { Moon, Minus } from 'lucide-react';
import { formatDate, getDateRange } from '@/lib/dateUtils';
import {
  formatDuration,
  calculateDetailedStats,
  getPreviousPeriodEntries,
  type DetailedSleepStats,
} from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface StatisticsTabProps {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
  dateRange: string;
}

// Determine color for change indicator
function getChangeColor(
  current: number | null,
  previous: number | null,
  type: 'higherIsBetter' | 'lowerIsBetter'
): 'improving' | 'worsening' | 'neutral' {
  if (current === null || previous === null) return 'neutral';

  const diff = current - previous;
  if (Math.abs(diff) < 1) return 'neutral'; // No significant change

  if (type === 'higherIsBetter') {
    return diff > 0 ? 'improving' : 'worsening';
  } else {
    return diff < 0 ? 'improving' : 'worsening';
  }
}

function ChangeIndicator({
  current,
  previous,
  type,
  disabled = false,
  formatValue,
}: {
  current: number | null;
  previous: number | null;
  type: 'higherIsBetter' | 'lowerIsBetter';
  disabled?: boolean;
  formatValue?: (val: number) => string;
}) {
  if (disabled || current === null || previous === null) {
    return <span className="text-muted-foreground flex justify-center">—</span>;
  }

  const diff = current - previous;
  const truncatedDiff = Math.round(diff);

  if (truncatedDiff === 0) {
    return (
      <span className="flex items-center justify-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0</span>
      </span>
    );
  }

  const changeType = getChangeColor(current, previous, type);

  const colorClass =
    changeType === 'improving'
      ? 'text-green-600 dark:text-green-400'
      : changeType === 'worsening'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  const sign = truncatedDiff > 0 ? '+' : '';
  const displayDiff = formatValue ? formatValue(Math.abs(truncatedDiff)) : truncatedDiff;
  const displaySign = truncatedDiff > 0 ? '+' : truncatedDiff < 0 ? '-' : '';

  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap ${colorClass}`}>
      <span className="font-medium">
        {formatValue ? displaySign : sign}
        {displayDiff}
      </span>
    </span>
  );
}

interface StatRowConfig {
  label: string;
  key: keyof DetailedSleepStats;
  type: 'higherIsBetter' | 'lowerIsBetter';
  unit?: string;
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
      label: 'Duration',
      key: 'duration',
      type: 'higherIsBetter',
      formatValue: (val) => formatDuration(val),
      formatDisplay: (val) => formatDuration(val),
    },
    {
      label: 'Restorative',
      key: 'restorative',
      type: 'higherIsBetter',
      unit: '%',
    },
    {
      label: 'Deep Sleep',
      key: 'deepSleepPct',
      type: 'higherIsBetter',
      unit: '%',
    },
    {
      label: 'REM Sleep',
      key: 'remSleepPct',
      type: 'higherIsBetter',
      unit: '%',
    },
    {
      label: 'Resting HR',
      key: 'restingHr',
      type: 'lowerIsBetter',
      unit: ' bpm',
    },
    {
      label: 'HRV Low',
      key: 'hrvLow',
      type: 'higherIsBetter',
      unit: ' ms',
    },
    {
      label: 'HRV High',
      key: 'hrvHigh',
      type: 'higherIsBetter',
      unit: ' ms',
    },
    {
      label: 'HR Drop',
      key: 'hrDrop',
      type: 'lowerIsBetter',
      unit: ' min',
    },
  ];

  const formatCell = (val: number | null, row: StatRowConfig): string => {
    if (val === null) return '—';
    if (row.formatDisplay) return row.formatDisplay(val);
    return `${Math.round(val)}${row.unit || ''}`;
  };

  return (
    <div>
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
                    type={row.type}
                    disabled={dateRange === 'all'}
                    formatValue={row.formatValue}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

  return (
    <div className="space-y-6">
      {/* Average Duration Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Average Sleep Duration</p>
          <p className="text-3xl font-bold">{formatDuration(currentStats.duration.avg)}</p>
        </div>

        {hasPreviousData && dateRange !== 'all' && (
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground mb-1">Previous Period</p>
            <p className="text-xl font-semibold text-muted-foreground">
              {formatDuration(previousStats.duration.avg)}
            </p>
          </div>
        )}

        {!hasPreviousData && dateRange !== 'all' && (
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">Previous Period</p>
            <p className="text-sm text-muted-foreground italic">No data</p>
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
                <span className="font-medium">Sleep Duration</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">7–9 hours</td>
            </tr>
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
            <tr className="border-b last:border-0">
              <td className="py-3 pr-3">
                <span className="font-medium">Resting HR</span>
              </td>
              <td className="py-3 pl-3 text-right font-mono">
                <div>40–60 bpm</div>
                <div className="text-muted-foreground text-xs">(athletes: 40–50)</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
