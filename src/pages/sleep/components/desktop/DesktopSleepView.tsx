import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatTimeString } from '@/lib/dateUtils';
import {
  formatHrvRange,
  getRestorativeSleepPct,
  calculateDetailedStats,
  getPreviousPeriodEntries,
  calculatePersonalBaseline,
  calculateSleepScore,
  formatDuration,
  STAGE_COLORS,
} from '../../utils/sleepHelpers';
import { StackedBarChart } from '@/components/shared/StackedBarChart';
import { SleepEntryForm } from '../modals/SleepEntryForm';
import type { SleepEntry } from '@/lib/db/sleep';

interface DesktopSleepViewProps {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
  dateRange: string;
}

function MetricCard({
  label,
  value,
  unit,
  subValue,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  subValue?: string | null;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="rounded-xl p-3 border border-white/10">
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </div>
  );
}

function SleepStagesDisplay({ entry }: { entry: SleepEntry }) {
  const hasStages =
    entry.deepSleepPct !== null ||
    entry.remSleepPct !== null ||
    entry.lightSleepPct !== null ||
    entry.awakePct !== null;

  if (!hasStages) return null;

  const stages = [
    { key: 'deep', value: entry.deepSleepPct, color: STAGE_COLORS.deep, label: 'Deep' },
    { key: 'rem', value: entry.remSleepPct, color: STAGE_COLORS.rem, label: 'REM' },
    { key: 'light', value: entry.lightSleepPct, color: STAGE_COLORS.light, label: 'Light' },
    { key: 'awake', value: entry.awakePct, color: STAGE_COLORS.awake, label: 'Awake' },
  ].filter((s) => s.value !== null);

  return (
    <div className="rounded-xl p-4 border border-white/10">
      <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Sleep Stages</h4>

      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-3">
        {stages.map((stage) => (
          <div key={stage.key} className={stage.color} style={{ width: `${stage.value}%` }} />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
            <span className="text-xs text-muted-foreground">{stage.label}</span>
            <span className="text-xs font-semibold text-foreground">{stage.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactStatsBar({
  entries,
  allEntries,
  dateRange,
  isExpanded,
  onToggleExpand,
}: {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
  dateRange: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const currentStats = useMemo(() => calculateDetailedStats(entries), [entries]);
  const previousEntries = useMemo(
    () => getPreviousPeriodEntries(allEntries, dateRange),
    [allEntries, dateRange]
  );
  const previousStats = useMemo(() => calculateDetailedStats(previousEntries), [previousEntries]);

  if (!currentStats) return null;

  const hasHrvData = currentStats.hrvLow?.avg != null && currentStats.hrvHigh?.avg != null;

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Compact Stats Summary */}
      <div className="p-4 flex items-center gap-6">
        <div className="flex items-center gap-6 flex-1">
          {/* Entries count */}
          <div className="text-center">
            <p className="text-2xl font-bold">{currentStats.count}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">entries</p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          {/* Avg Duration */}
          <div className="text-center">
            <p className="text-2xl font-bold">{formatDuration(currentStats.duration.avg)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">avg duration</p>
          </div>

          {/* Avg HRV */}
          {hasHrvData && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.hrvLow!.avg!)}–{Math.round(currentStats.hrvHigh!.avg!)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">avg HRV</p>
              </div>
            </>
          )}

          {/* Avg Restorative */}
          {currentStats.restorative?.avg != null && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.restorative.avg)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  avg restorative
                </p>
              </div>
            </>
          )}

          {/* Avg Resting HR */}
          {currentStats.restingHr?.avg != null && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(currentStats.restingHr.avg)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">bpm</span>
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  avg resting HR
                </p>
              </div>
            </>
          )}
        </div>

        {/* Expand button */}
        <div className="flex items-center">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Less</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Details</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-8">
            {/* Detailed Stats Table */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Detailed Statistics</h3>
              <DetailedStatsTable
                currentStats={currentStats}
                previousStats={previousStats}
                dateRange={dateRange}
              />
            </div>

            {/* Reference Ranges */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Reference Ranges</h3>
              <ReferenceRangesTable />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailedStatsTable({
  currentStats,
  previousStats,
  dateRange,
}: {
  currentStats: ReturnType<typeof calculateDetailedStats>;
  previousStats: ReturnType<typeof calculateDetailedStats>;
  dateRange: string;
}) {
  if (!currentStats) return null;

  const rows = [
    { label: 'Deep Sleep', key: 'deepSleepPct' as const, type: 'higherIsBetter' as const },
    { label: 'REM Sleep', key: 'remSleepPct' as const, type: 'higherIsBetter' as const },
    { label: 'Restorative', key: 'restorative' as const, type: 'higherIsBetter' as const },
    { label: 'Resting HR', key: 'restingHr' as const, type: 'lowerIsBetter' as const },
    { label: 'HR Drop', key: 'hrDrop' as const, type: 'lowerIsBetter' as const },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Metric</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Min</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Max</th>
          <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Avg</th>
          <th className="text-center py-2 pl-2 font-medium text-muted-foreground text-xs">
            vs Prev
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const current = currentStats[row.key] as
            | { min: number | null; max: number | null; avg: number | null }
            | undefined;
          const previous = previousStats?.[row.key] as
            | { min: number | null; max: number | null; avg: number | null }
            | undefined;

          if (!current || current.avg === null) return null;

          const diff =
            previous?.avg != null && dateRange !== 'all' ? current.avg - previous.avg : null;
          const changeColor =
            diff === null
              ? 'text-muted-foreground'
              : row.type === 'higherIsBetter'
                ? diff > 0
                  ? 'text-green-400'
                  : diff < 0
                    ? 'text-red-400'
                    : 'text-muted-foreground'
                : diff < 0
                  ? 'text-green-400'
                  : diff > 0
                    ? 'text-red-400'
                    : 'text-muted-foreground';

          return (
            <tr key={row.key} className="border-b border-white/10 last:border-0">
              <td className="py-2 pr-3 font-medium text-xs">{row.label}</td>
              <td className="py-2 px-2 text-center font-mono text-xs">
                {current.min != null ? Math.round(current.min) : '—'}
              </td>
              <td className="py-2 px-2 text-center font-mono text-xs">
                {current.max != null ? Math.round(current.max) : '—'}
              </td>
              <td className="py-2 px-2 text-center font-mono font-semibold text-xs">
                {Math.round(current.avg)}
              </td>
              <td className={`py-2 pl-2 text-center text-xs ${changeColor}`}>
                {diff !== null ? (diff > 0 ? '+' : '') + Math.round(diff) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReferenceRangesTable() {
  const ranges = [
    { metric: 'Deep Sleep', range: '15–25%' },
    { metric: 'REM Sleep', range: '20–25%' },
    { metric: 'Restorative', range: '40–50%' },
    { metric: 'Resting HR', range: '40–60 bpm' },
    { metric: 'HR Drop', range: '120–240 min' },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Metric</th>
          <th className="text-right py-2 pl-3 font-medium text-muted-foreground text-xs">
            Optimal
          </th>
        </tr>
      </thead>
      <tbody>
        {ranges.map((row) => (
          <tr key={row.metric} className="border-b border-white/10 last:border-0">
            <td className="py-2 pr-3 font-medium text-xs">{row.metric}</td>
            <td className="py-2 pl-3 text-right font-mono text-xs">{row.range}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DesktopSleepView({ entries, allEntries, dateRange }: DesktopSleepViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleLongPress = useCallback((entry: SleepEntry) => {
    setEditEntry(entry);
    setEditModalOpen(true);
  }, []);

  // Sort entries by date ascending (oldest first) for the chart
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  // Calculate baseline for scoring
  const baseline = useMemo(() => calculatePersonalBaseline(allEntries), [allEntries]);

  // Create a map of entries by date for quick lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<string, SleepEntry>();
    for (const entry of sortedEntries) {
      map.set(entry.date, entry);
    }
    return map;
  }, [sortedEntries]);

  // Generate all dates in the range
  const allDatesInRange = useMemo(() => {
    if (sortedEntries.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;

    if (dateRange === 'all') {
      // Use earliest entry date
      startDate = new Date(sortedEntries[0].date + 'T00:00:00');
    } else if (dateRange === '1w') {
      // Rolling 7 days
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
    } else if (dateRange === '1m') {
      // Rolling 1 month
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (dateRange === '3m') {
      // Rolling 3 months
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 3);
    } else {
      // Fallback: try parsing as days
      const days = parseInt(dateRange, 10);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);
    }

    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= today) {
      // Use local date formatting to avoid UTC conversion issues
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [sortedEntries, dateRange]);

  // Get the selected entry based on selectedIndex
  const selectedEntry = (() => {
    const selectedDate = allDatesInRange[selectedIndex];
    if (!selectedDate) return sortedEntries[sortedEntries.length - 1];

    const entry = entriesByDate.get(selectedDate);
    if (entry) return entry;

    // For placeholder, find nearest entry (prefer earlier date)
    for (let i = selectedIndex; i >= 0; i--) {
      const date = allDatesInRange[i];
      if (date && entriesByDate.has(date)) {
        return entriesByDate.get(date);
      }
    }
    for (let i = selectedIndex; i < allDatesInRange.length; i++) {
      const date = allDatesInRange[i];
      if (date && entriesByDate.has(date)) {
        return entriesByDate.get(date);
      }
    }
    return undefined;
  })();

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No sleep entries in this period
      </div>
    );
  }

  // Format values for display
  const sleepWindow =
    selectedEntry?.sleepStart && selectedEntry?.sleepEnd
      ? `${formatTimeString(selectedEntry.sleepStart)} → ${formatTimeString(selectedEntry.sleepEnd)}`
      : null;

  const totalSleepMinutes = selectedEntry?.totalSleepMinutes ?? selectedEntry?.durationMinutes;
  const totalSleepHours = totalSleepMinutes ? Math.floor(totalSleepMinutes / 60) : null;
  const totalSleepMins = totalSleepMinutes ? totalSleepMinutes % 60 : null;

  const timeInBedHours = selectedEntry ? Math.floor(selectedEntry.durationMinutes / 60) : null;
  const timeInBedMins = selectedEntry ? selectedEntry.durationMinutes % 60 : null;

  const restorative = selectedEntry ? getRestorativeSleepPct(selectedEntry) : null;
  const sleepScore = selectedEntry ? calculateSleepScore(selectedEntry, baseline) : null;

  return (
    <div className="space-y-6">
      {/* Scrollable Stacked Bar Chart */}
      <StackedBarChart
        entriesByDate={entriesByDate}
        allDatesInRange={allDatesInRange}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onLongPress={handleLongPress}
      />

      {/* Compact Stats Bar */}
      <CompactStatsBar
        entries={entries}
        allEntries={allEntries}
        dateRange={dateRange}
        isExpanded={statsExpanded}
        onToggleExpand={() => setStatsExpanded(!statsExpanded)}
      />

      {/* Selected Day Details */}
      {selectedEntry && (
        <div className="space-y-4">
          {/* Sleep Score + Primary Stats Grid */}
          <div className="grid grid-cols-5 gap-3">
            {sleepScore !== null && sleepScore.overall !== null && (
              <MetricCard label="Score" value={sleepScore.overall} />
            )}
            <MetricCard
              label="Total Sleep"
              value={totalSleepHours !== null ? `${totalSleepHours}h ${totalSleepMins}m` : null}
            />
            <MetricCard
              label="Time in Bed"
              value={timeInBedHours !== null ? `${timeInBedHours}h ${timeInBedMins}m` : null}
            />
            {restorative !== null && (
              <MetricCard label="Restorative" value={restorative} unit="%" />
            )}
            {selectedEntry.restingHr !== null && (
              <MetricCard label="Resting HR" value={selectedEntry.restingHr} unit="bpm" />
            )}
          </div>

          {/* Sleep Stages + Sleep Window in grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <SleepStagesDisplay entry={selectedEntry} />
            </div>
            {sleepWindow && (
              <div className="rounded-xl p-4 border border-white/10 flex flex-col justify-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Sleep Window
                </p>
                <p className="text-lg font-semibold text-foreground">{sleepWindow}</p>
              </div>
            )}
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-4 gap-3">
            {(selectedEntry.hrvLow !== null || selectedEntry.hrvHigh !== null) && (
              <MetricCard
                label="HRV"
                value={formatHrvRange(selectedEntry.hrvLow, selectedEntry.hrvHigh)}
              />
            )}
            {selectedEntry.hrDropMinutes !== null && (
              <MetricCard label="HR Drop" value={selectedEntry.hrDropMinutes} unit="min" />
            )}
            {selectedEntry.skinTempAvg !== null && (
              <MetricCard
                label="Skin Temp"
                value={selectedEntry.skinTempAvg.toFixed(1)}
                unit="°C"
              />
            )}
            {selectedEntry.movementCount !== null && (
              <MetricCard label="Movements" value={selectedEntry.movementCount} />
            )}
          </div>

          {/* Notes */}
          {selectedEntry.notes && (
            <div className="rounded-xl p-4 border border-white/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{selectedEntry.notes}</p>
            </div>
          )}
        </div>
      )}

      <SleepEntryForm open={editModalOpen} onOpenChange={setEditModalOpen} entry={editEntry} />
    </div>
  );
}
