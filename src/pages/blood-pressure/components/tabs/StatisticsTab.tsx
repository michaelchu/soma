import { useMemo } from 'react';
import { calculateFullStats, getPreviousPeriodReadings } from '../../utils/bpHelpers';
import { useSettings } from '@/lib/SettingsContext';
import { BP_GUIDELINES, DEFAULT_GUIDELINE } from '../../constants/bpGuidelines';
import { getDateRange } from '@/lib/dateUtils';
import { ChangeIndicator, type ChangeConfig } from '@/components/shared/ChangeIndicator';
import type { TimeOfDay } from '@/types/bloodPressure';

interface BPReading {
  date: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  systolic: number;
  diastolic: number;
  pulse?: number | null;
}

interface StatValues {
  min: number | null;
  max: number | null;
  avg: number | null;
}

interface FullStats {
  systolic: StatValues;
  diastolic: StatValues;
  pulse: StatValues;
  pp: StatValues;
  map: StatValues;
  count: number;
}

interface NormalThresholds {
  systolic: number;
  diastolic: number;
}

interface StatsTableProps {
  currentStats: FullStats | null;
  previousStats: FullStats | null;
  dateRange: string;
  normalThresholds: NormalThresholds;
}

function StatsTable({ currentStats, previousStats, dateRange, normalThresholds }: StatsTableProps) {
  const rows: Array<{
    label: string;
    key: string;
    unit: string;
    tooltip?: string;
    config: ChangeConfig;
  }> = [
    {
      label: 'Systolic',
      key: 'systolic',
      unit: 'mmHg',
      // Lower is better, but grey if both are within normal range (based on selected guideline)
      config: { type: 'lowerIsBetter', optimalMax: normalThresholds.systolic },
    },
    {
      label: 'Diastolic',
      key: 'diastolic',
      unit: 'mmHg',
      // Lower is better, but grey if both are within normal range (based on selected guideline)
      config: { type: 'lowerIsBetter', optimalMax: normalThresholds.diastolic },
    },
    {
      label: 'Pulse',
      key: 'pulse',
      unit: 'bpm',
      tooltip: 'Resting heart rate',
      // Range 60-100, midpoint 80, buffer 70-90
      config: { type: 'midpoint', midpoint: 80, bufferMin: 70, bufferMax: 90 },
    },
    {
      label: 'PP',
      key: 'pp',
      unit: 'mmHg',
      tooltip: 'Pulse Pressure (Systolic - Diastolic)',
      // Range 30-60, midpoint 45, buffer 40-50
      config: { type: 'midpoint', midpoint: 45, bufferMin: 40, bufferMax: 50 },
    },
    {
      label: 'MAP',
      key: 'map',
      unit: 'mmHg',
      tooltip: 'Mean Arterial Pressure',
      // Range 70-100, midpoint 85, buffer 80-90
      config: { type: 'midpoint', midpoint: 85, bufferMin: 80, bufferMax: 90 },
    },
  ];

  return (
    <div>
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-[72px]">
              Metric
            </th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-[48px]">
              Min
            </th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-[48px]">
              Max
            </th>
            <th className="text-center py-2 px-1 font-medium text-muted-foreground w-[48px]">
              Avg
            </th>
            <th className="text-center py-2 pl-1 font-medium text-muted-foreground">vs Prev.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const current = currentStats?.[row.key as keyof Omit<FullStats, 'count'>] as
              | StatValues
              | undefined;
            const previous = previousStats?.[row.key as keyof Omit<FullStats, 'count'>] as
              | StatValues
              | undefined;

            // Skip pulse row if no pulse data
            if (row.key === 'pulse' && current?.avg === null) {
              return null;
            }

            return (
              <tr key={row.key} className="border-b last:border-0">
                <td className="py-3 pr-2">
                  <span className="font-medium" title={row.tooltip}>
                    {row.label}
                  </span>
                </td>
                <td className="py-3 px-1 text-center font-mono">
                  {current?.min != null ? Math.round(current.min) : '—'}
                </td>
                <td className="py-3 px-1 text-center font-mono">
                  {current?.max != null ? Math.round(current.max) : '—'}
                </td>
                <td className="py-3 px-1 text-center font-mono font-semibold">
                  {current?.avg != null ? Math.round(current.avg) : '—'}
                </td>
                <td className="py-3 pl-1 text-center">
                  <ChangeIndicator
                    current={current?.avg ?? null}
                    previous={previous?.avg ?? null}
                    config={row.config}
                    disabled={dateRange === 'all'}
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

interface StatisticsTabProps {
  readings: BPReading[];
  allReadings: BPReading[];
  dateRange: string;
  timeOfDay: TimeOfDay | 'all';
}

export function StatisticsTab({ readings, allReadings, dateRange, timeOfDay }: StatisticsTabProps) {
  const { settings } = useSettings();

  // Get the normal thresholds from the selected guideline
  const normalThresholds = useMemo(() => {
    const guidelineKey = settings.bpGuideline || DEFAULT_GUIDELINE;
    const guideline = BP_GUIDELINES[guidelineKey];
    const thresholds = guideline?.thresholds || {};

    // Find the "normal" or "optimal" category thresholds
    const normalCategory = thresholds.normal || thresholds.optimal || {};

    return {
      systolic: (normalCategory.systolic?.max ?? 119) + 1, // +1 because max is inclusive
      diastolic: (normalCategory.diastolic?.max ?? 79) + 1,
    };
  }, [settings.bpGuideline]);

  // Calculate current period stats
  const currentStats = useMemo(() => calculateFullStats(readings), [readings]);

  // Calculate previous period stats
  const previousReadings = useMemo(
    () => getPreviousPeriodReadings(allReadings, dateRange, timeOfDay),
    [allReadings, dateRange, timeOfDay]
  );
  const previousStats = useMemo(() => calculateFullStats(previousReadings), [previousReadings]);

  // Format date range label
  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'all') return 'All Time';

    const { start, end } = getDateRange(dateRange);
    if (!start) return 'All Time';

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [dateRange]);

  if (!readings || readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No readings yet
      </div>
    );
  }

  const hasPreviousData = previousStats !== null;

  return (
    <div className="space-y-6 pt-4 overflow-x-hidden">
      {/* Average BP Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Average Blood Pressure</p>
          <p className="text-3xl font-bold">
            {currentStats?.systolic.avg != null ? Math.round(currentStats.systolic.avg) : '—'}/
            {currentStats?.diastolic.avg != null ? Math.round(currentStats.diastolic.avg) : '—'}
            <span className="text-lg font-normal text-muted-foreground ml-1">mmHg</span>
          </p>
        </div>

        {hasPreviousData && previousStats && (
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground mb-1">Previous Period</p>
            <p className="text-xl font-semibold text-muted-foreground">
              {previousStats.systolic.avg != null ? Math.round(previousStats.systolic.avg) : '—'}/
              {previousStats.diastolic.avg != null ? Math.round(previousStats.diastolic.avg) : '—'}
              <span className="text-sm font-normal ml-1">mmHg</span>
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

      <div className="-mt-4">
        <p className="text-xs text-muted-foreground text-center mb-4">
          {readings.length} reading{readings.length !== 1 ? 's' : ''} ({dateRangeLabel})
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
          normalThresholds={normalThresholds}
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
        <div className="overflow-x-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Metric</th>
                <th className="text-right py-2 pl-3 font-medium text-muted-foreground">
                  Normal Range
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 pr-3">
                  <span className="font-medium">Pulse (resting)</span>
                </td>
                <td className="py-3 pl-3 text-right font-mono">
                  <div>60–100 bpm</div>
                  <div className="text-muted-foreground text-xs">(40–100 for athletes)</div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 pr-3">
                  <span className="font-medium">Pulse Pressure</span>
                </td>
                <td className="py-3 pl-3 text-right font-mono">30–60 mmHg</td>
              </tr>
              <tr className="border-b last:border-0">
                <td className="py-3 pr-3">
                  <span className="font-medium">Mean Arterial Pressure</span>
                </td>
                <td className="py-3 pl-3 text-right font-mono">70–100 mmHg</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
