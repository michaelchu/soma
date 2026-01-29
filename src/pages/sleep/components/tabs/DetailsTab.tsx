import type { ElementType } from 'react';
import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { Moon, Heart, Activity, Brain, Thermometer, Move, Clock, BedDouble } from 'lucide-react';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import {
  formatHrvRange,
  getRestorativeSleepPct,
  calculateSleepScore,
  calculatePersonalBaseline,
  STAGE_COLORS,
} from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface DetailsTabProps {
  entries: SleepEntry[];
  allEntries: SleepEntry[];
}

const BAR_WIDTH = 36;
const BAR_GAP = 4;
const BAR_TOTAL_WIDTH = BAR_WIDTH + BAR_GAP;
const MAX_BAR_HEIGHT = 120;
const MIN_BAR_HEIGHT = 40;

function SleepScoreBar({
  entry,
  score,
  isSelected,
  maxScore,
  minScore,
}: {
  entry: SleepEntry;
  score: number | null;
  isSelected: boolean;
  maxScore: number;
  minScore: number;
}) {
  // Calculate bar height relative to score range
  const scoreValue = score ?? 50;
  const range = maxScore - minScore || 1;
  const normalizedHeight =
    ((scoreValue - minScore) / range) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) + MIN_BAR_HEIGHT;

  // Get day of week abbreviation
  const date = new Date(entry.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{ width: BAR_WIDTH, minWidth: BAR_WIDTH }}
    >
      {/* Bar with score inside */}
      <div
        className={`w-full rounded-t-lg transition-all duration-200 flex items-start justify-center pt-2 ${
          isSelected ? 'bg-foreground' : 'bg-muted-foreground/40'
        }`}
        style={{ height: normalizedHeight }}
      >
        <span
          className={`text-xs font-bold transition-colors ${
            isSelected ? 'text-background' : 'text-foreground/90'
          }`}
        >
          {score ?? '-'}
        </span>
      </div>

      {/* Day label */}
      <span
        className={`text-xs mt-2 transition-colors ${
          isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground'
        }`}
      >
        {dayName}
      </span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subValue,
}: {
  icon: ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  subValue?: string | null;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="bg-muted/50 rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
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

export function DetailsTab({ entries, allEntries }: DetailsTabProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort entries by date ascending (oldest first) for the chart
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  // Calculate baseline for scoring
  const baseline = useMemo(() => calculatePersonalBaseline(allEntries), [allEntries]);

  // Calculate scores for all entries
  const entriesWithScores = useMemo(() => {
    return sortedEntries.map((entry) => ({
      entry,
      score: calculateSleepScore(entry, baseline),
    }));
  }, [sortedEntries, baseline]);

  // Get min/max scores for bar height scaling
  const { minScore, maxScore } = useMemo(() => {
    const scores = entriesWithScores
      .map((e) => e.score.overall)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return { minScore: 0, maxScore: 100 };
    return {
      minScore: Math.max(0, Math.min(...scores) - 10),
      maxScore: Math.min(100, Math.max(...scores) + 10),
    };
  }, [entriesWithScores]);

  // Selected entry data
  const selectedData = entriesWithScores[selectedIndex] || entriesWithScores[0];
  const selectedEntry = selectedData?.entry;

  // Handle scroll to auto-select centered bar
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const centerOffset = scrollLeft + containerWidth / 2;

    // Account for left padding
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const adjustedOffset = centerOffset - paddingLeft;

    // Calculate which bar is centered
    const centeredIndex = Math.round(adjustedOffset / BAR_TOTAL_WIDTH);
    const clampedIndex = Math.max(0, Math.min(centeredIndex, sortedEntries.length - 1));

    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex);
    }
  }, [sortedEntries.length, selectedIndex]);

  // Initial scroll to the latest entry (rightmost)
  // Using useLayoutEffect to run synchronously before paint, avoiding visual flash
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || sortedEntries.length === 0) return;

    // Scroll to the latest entry (last in sorted array)
    const lastIndex = sortedEntries.length - 1;
    const containerWidth = container.clientWidth;
    const paddingLeft = containerWidth / 2 - BAR_WIDTH / 2;
    const targetScroll =
      lastIndex * BAR_TOTAL_WIDTH - containerWidth / 2 + paddingLeft + BAR_WIDTH / 2;

    container.scrollLeft = Math.max(0, targetScroll);
    // Set initial index - this is intentional initialization, not a cascading update
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(lastIndex);
  }, [sortedEntries.length]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
      <div className="px-5 sm:px-6 pt-2 pb-4 relative z-0">
        <div className="relative -mx-5 sm:-mx-6 px-5 sm:px-6">
          <div
            ref={scrollContainerRef}
            className="flex items-end overflow-x-auto scrollbar-hide py-4"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Left padding to allow first item to center */}
            <div
              style={{
                minWidth: `calc(50% - ${BAR_WIDTH / 2}px)`,
                flexShrink: 0,
              }}
            />

            {entriesWithScores.map((data, index) => (
              <div
                key={data.entry.id}
                className="flex-shrink-0"
                style={{
                  scrollSnapAlign: 'center',
                  marginRight: index < entriesWithScores.length - 1 ? BAR_GAP : 0,
                }}
              >
                <SleepScoreBar
                  entry={data.entry}
                  score={data.score.overall}
                  isSelected={index === selectedIndex}
                  maxScore={maxScore}
                  minScore={minScore}
                />
              </div>
            ))}

            {/* Right padding to allow last item to center */}
            <div
              style={{
                minWidth: `calc(50% - ${BAR_WIDTH / 2}px)`,
                flexShrink: 0,
              }}
            />
          </div>

          {/* Fade overlays for edge blending */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
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
