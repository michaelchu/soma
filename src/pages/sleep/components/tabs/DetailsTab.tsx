import type { ElementType } from 'react';
import { useState, useMemo } from 'react';
import { Moon, Heart, Activity, Brain, Thermometer, Move, Clock, BedDouble } from 'lucide-react';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import {
  formatHrvRange,
  getRestorativeSleepPct,
  calculateSleepScore,
  calculatePersonalBaseline,
  STAGE_COLORS,
} from '../../utils/sleepHelpers';
import { ScoreBarChart, type ScoreBarChartItem } from '@/components/shared/ScoreBarChart';
import type { SleepEntry } from '@/lib/db/sleep';

interface DetailsTabProps {
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
  icon?: ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  subValue?: string | null;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="bg-muted/50 rounded-xl p-3 border border-border">
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
    <div className="bg-muted/50 rounded-xl p-4 border border-border">
      <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Sleep Stages</h4>

      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted mb-3">
        {stages.map((stage) => (
          <div key={stage.key} className={stage.color} style={{ width: `${stage.value}%` }} />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
            <span className="text-xs text-muted-foreground flex-1">{stage.label}</span>
            <span className="text-xs font-semibold text-foreground">{stage.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsTab({ entries, allEntries, dateRange }: DetailsTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

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

    const days = dateRange === 'all' ? null : parseInt(dateRange, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    if (days === null) {
      // For 'all', use the earliest entry date
      startDate = new Date(sortedEntries[0].date);
    } else {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);
    }

    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [sortedEntries, dateRange]);

  // Build chart items for the ScoreBarChart
  const chartItems = useMemo((): ScoreBarChartItem[] => {
    return allDatesInRange.map((date) => {
      const entry = entriesByDate.get(date);
      if (entry) {
        const score = calculateSleepScore(entry, baseline);
        return { date, score: score.overall };
      }
      return { date, score: null };
    });
  }, [allDatesInRange, entriesByDate, baseline]);

  // Get the selected entry based on selectedIndex
  const selectedEntry = (() => {
    const selectedDate = chartItems[selectedIndex]?.date;
    if (!selectedDate) return sortedEntries[sortedEntries.length - 1];

    const entry = entriesByDate.get(selectedDate);
    if (entry) return entry;

    // For placeholder, find nearest entry (prefer earlier date)
    for (let i = selectedIndex; i >= 0; i--) {
      const date = chartItems[i]?.date;
      if (date && entriesByDate.has(date)) {
        return entriesByDate.get(date);
      }
    }
    for (let i = selectedIndex; i < chartItems.length; i++) {
      const date = chartItems[i]?.date;
      if (date && entriesByDate.has(date)) {
        return entriesByDate.get(date);
      }
    }
    return undefined;
  })();

  if (entries.length === 0) {
    return (
      <div className="-mx-5 sm:-mx-6 min-h-[calc(100vh-120px)] flex items-center justify-center">
        <p className="text-muted-foreground">No sleep entries in this period</p>
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

  return (
    <div className="-mx-5 sm:-mx-6 min-h-[calc(100vh-120px)] overflow-hidden">
      {/* Selected Date Header */}
      {selectedEntry && (
        <div className="text-center pt-6 pb-2 px-5 sm:px-6">
          <p className="text-lg font-semibold text-foreground">
            {formatDate(selectedEntry.date, { includeWeekday: true })}
          </p>
        </div>
      )}

      {/* Scrollable Bar Chart */}
      <div className="px-5 sm:px-6 pt-2 pb-4">
        <div className="-mx-5 sm:-mx-6 px-5 sm:px-6 relative">
          <ScoreBarChart
            items={chartItems}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />
          {/* Fade overlays - works because page gradient fades to black */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Selected Day Stats */}
      {selectedEntry && (
        <div className="space-y-4 px-5 sm:px-6 pb-8">
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Moon}
              label="Total Sleep"
              value={totalSleepHours !== null ? `${totalSleepHours}h ${totalSleepMins}m` : null}
            />
            <MetricCard
              icon={BedDouble}
              label="Time in Bed"
              value={timeInBedHours !== null ? `${timeInBedHours}h ${timeInBedMins}m` : null}
            />
            {restorative !== null && (
              <MetricCard icon={Brain} label="Restorative" value={restorative} unit="%" />
            )}
            {selectedEntry.restingHr !== null && (
              <MetricCard
                icon={Heart}
                label="Resting HR"
                value={selectedEntry.restingHr}
                unit="bpm"
              />
            )}
          </div>

          {/* Sleep Stages */}
          <SleepStagesDisplay entry={selectedEntry} />

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3">
            {(selectedEntry.hrvLow !== null || selectedEntry.hrvHigh !== null) && (
              <MetricCard
                icon={Activity}
                label="HRV"
                value={formatHrvRange(selectedEntry.hrvLow, selectedEntry.hrvHigh)}
              />
            )}
            {selectedEntry.hrDropMinutes !== null && (
              <MetricCard
                icon={Clock}
                label="HR Drop"
                value={selectedEntry.hrDropMinutes}
                unit="min"
                subValue="to lowest HR"
              />
            )}
            {selectedEntry.skinTempAvg !== null && (
              <MetricCard
                icon={Thermometer}
                label="Skin Temp"
                value={selectedEntry.skinTempAvg.toFixed(1)}
                unit="°C"
              />
            )}
            {selectedEntry.movementCount !== null && (
              <MetricCard icon={Move} label="Movements" value={selectedEntry.movementCount} />
            )}
          </div>

          {/* Sleep Window */}
          {sleepWindow && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Sleep Window
              </p>
              <p className="text-lg font-semibold text-foreground">{sleepWindow}</p>
            </div>
          )}

          {/* Notes */}
          {selectedEntry.notes && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{selectedEntry.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
