import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Moon, Heart, Activity, Brain, Thermometer, Move, Clock } from 'lucide-react';
import { formatDate, formatTimeString } from '@/lib/dateUtils';
import {
  formatDuration,
  formatHrvRange,
  getRestorativeSleepPct,
  calculateSleepScore,
  getScoreColorClass,
  getScoreLabel,
  STAGE_COLORS,
  type PersonalBaseline,
} from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface SleepDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SleepEntry | null;
  baseline: PersonalBaseline;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  subValue?: string | null;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex items-start gap-3 py-2 px-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number | null;
  description: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-lg font-bold ${getScoreColorClass(score)}`}>
          {score !== null ? score : '-'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-tight">{description}</p>
    </div>
  );
}

function SleepStagesDetail({ entry }: { entry: SleepEntry }) {
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

  const restorative = getRestorativeSleepPct(entry);

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {stages.map((stage) => (
          <div key={stage.key} className={stage.color} style={{ width: `${stage.value}%` }} />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${stage.color}`} />
            <span className="text-xs text-muted-foreground">{stage.label}</span>
            <span className="text-xs font-medium ml-auto">{stage.value}%</span>
          </div>
        ))}
      </div>

      {/* Restorative summary */}
      {restorative !== null && (
        <div className="bg-violet-500/10 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-violet-600 dark:text-violet-400">
            Restorative (Deep + REM)
          </span>
          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
            {restorative}%
          </span>
        </div>
      )}
    </div>
  );
}

export function SleepDetailModal({ open, onOpenChange, entry, baseline }: SleepDetailModalProps) {
  if (!entry) return null;

  const score = calculateSleepScore(entry, baseline);
  const hasScore = score.overall !== null;

  // Format sleep window
  const sleepWindow =
    entry.sleepStart && entry.sleepEnd
      ? `${formatTimeString(entry.sleepStart)} → ${formatTimeString(entry.sleepEnd)}`
      : null;

  // Format sleep cycles
  const sleepCycles =
    entry.sleepCyclesFull !== null
      ? entry.sleepCyclesPartial
        ? `${entry.sleepCyclesFull} full, ${entry.sleepCyclesPartial} partial`
        : `${entry.sleepCyclesFull} full`
      : null;

  // Format HR drop
  const hrDrop =
    entry.hrDropMinutes !== null ? `${entry.hrDropMinutes} min after sleep start` : null;

  // Format skin temp
  const skinTemp = entry.skinTempAvg !== null ? `${entry.skinTempAvg.toFixed(1)}°C` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-lg overflow-hidden p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-5 py-4 border-b">
          <DialogTitle>{formatDate(entry.date, { includeWeekday: true })}</DialogTitle>
        </DialogHeader>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-5">
          <div className="space-y-5 py-4">
            {/* Score Section */}
            {hasScore && (
              <div className="text-center pb-4 border-b">
                <div
                  className={`text-5xl font-bold font-mono ${getScoreColorClass(score.overall)}`}
                >
                  {score.overall}
                </div>
                <p className={`text-sm font-medium ${getScoreColorClass(score.overall)}`}>
                  {getScoreLabel(score.overall)}
                </p>

                {/* Score breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <ScoreCard label="Duration" score={score.duration} description="Sleep length" />
                  <ScoreCard
                    label="Heart Health"
                    score={score.heartHealth}
                    description="HRV & resting HR"
                  />
                  <ScoreCard
                    label="Sleep Quality"
                    score={score.sleepQuality}
                    description="Deep, REM & awake %"
                  />
                  <ScoreCard
                    label="Restfulness"
                    score={score.restfulness}
                    description="Movement & cycles"
                  />
                </div>
              </div>
            )}

            {/* Duration & Time */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Sleep Time
              </h3>
              <div className="bg-muted/30 rounded-lg divide-y divide-border border">
                <MetricItem icon={Clock} label="Sleep Window" value={sleepWindow} />
                <MetricItem
                  icon={Moon}
                  label="Time in Bed"
                  value={formatDuration(entry.durationMinutes)}
                />
                {entry.totalSleepMinutes !== null && (
                  <MetricItem
                    icon={Moon}
                    label="Total Sleep"
                    value={formatDuration(entry.totalSleepMinutes)}
                  />
                )}
              </div>
            </div>

            {/* Sleep Stages */}
            {(entry.deepSleepPct !== null ||
              entry.remSleepPct !== null ||
              entry.lightSleepPct !== null ||
              entry.awakePct !== null) && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Sleep Stages
                </h3>
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <SleepStagesDetail entry={entry} />
                </div>
              </div>
            )}

            {/* Heart Metrics */}
            {(entry.hrvLow !== null ||
              entry.hrvHigh !== null ||
              entry.restingHr !== null ||
              entry.lowestHrTime !== null) && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Heart Metrics
                </h3>
                <div className="bg-muted/30 rounded-lg divide-y divide-border border">
                  <MetricItem
                    icon={Activity}
                    label="HRV Range"
                    value={formatHrvRange(entry.hrvLow, entry.hrvHigh)}
                  />
                  <MetricItem
                    icon={Heart}
                    label="Resting Heart Rate"
                    value={entry.restingHr !== null ? `${entry.restingHr} bpm` : null}
                  />
                  <MetricItem
                    icon={Heart}
                    label="Lowest HR Time"
                    value={formatTimeString(entry.lowestHrTime)}
                    subValue={hrDrop}
                  />
                </div>
              </div>
            )}

            {/* Body Metrics */}
            {(entry.sleepCyclesFull !== null ||
              entry.skinTempAvg !== null ||
              entry.movementCount !== null) && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Body Metrics
                </h3>
                <div className="bg-muted/30 rounded-lg divide-y divide-border border">
                  <MetricItem icon={Brain} label="Sleep Cycles" value={sleepCycles} />
                  <MetricItem icon={Thermometer} label="Skin Temperature" value={skinTemp} />
                  <MetricItem
                    icon={Move}
                    label="Movements"
                    value={entry.movementCount !== null ? entry.movementCount : null}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
