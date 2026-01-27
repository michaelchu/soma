import { Moon, Heart, Activity, Brain, TrendingDown } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import {
  formatDuration,
  formatHrvRange,
  getRestorativeSleepPct,
  getSleepQuality,
} from '../../utils/sleepHelpers';
import type { SleepEntry } from '@/lib/db/sleep';

interface LatestEntryProps {
  entries: SleepEntry[];
}

const qualityColors = {
  poor: 'text-red-500',
  fair: 'text-amber-500',
  good: 'text-green-500',
  excellent: 'text-emerald-500',
};

const qualityLabels = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

export function LatestEntry({ entries }: LatestEntryProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-4">
        <Moon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No entries yet</p>
      </div>
    );
  }

  const latest = entries[0];
  const quality = getSleepQuality(latest);
  const restorative = getRestorativeSleepPct(latest);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Latest Entry</p>
          <p className="text-sm font-medium">{formatDate(latest.date, { includeWeekday: true })}</p>
        </div>
        <div className={`text-sm font-medium ${qualityColors[quality]}`}>
          {qualityLabels[quality]}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold">{formatDuration(latest.durationMinutes)}</span>
        <span className="text-muted-foreground">sleep</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {(latest.hrvLow !== null || latest.hrvHigh !== null) && (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-muted-foreground">HRV</p>
              <p className="font-medium">{formatHrvRange(latest.hrvLow, latest.hrvHigh)}</p>
            </div>
          </div>
        )}

        {latest.restingHr !== null && (
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-muted-foreground">Resting HR</p>
              <p className="font-medium">{latest.restingHr} bpm</p>
            </div>
          </div>
        )}

        {restorative !== null && (
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500" />
            <div>
              <p className="text-muted-foreground">Restorative</p>
              <p className="font-medium">{restorative}%</p>
            </div>
          </div>
        )}

        {latest.hrDropMinutes !== null && (
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-muted-foreground">HR Drop</p>
              <p className="font-medium">{latest.hrDropMinutes} min</p>
            </div>
          </div>
        )}
      </div>

      {/* Sleep Stages Bar */}
      {(latest.deepSleepPct !== null || latest.remSleepPct !== null) && (
        <div className="mt-4">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {latest.deepSleepPct !== null && (
              <div className="bg-indigo-600" style={{ width: `${latest.deepSleepPct}%` }} />
            )}
            {latest.remSleepPct !== null && (
              <div className="bg-cyan-500" style={{ width: `${latest.remSleepPct}%` }} />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Deep {latest.deepSleepPct ?? 0}%</span>
            <span>REM {latest.remSleepPct ?? 0}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
