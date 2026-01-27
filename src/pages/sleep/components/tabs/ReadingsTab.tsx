import { useState } from 'react';
import { Moon } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { formatDuration, formatHrvRange, getRestorativeSleepPct } from '../../utils/sleepHelpers';
import { SleepEntryForm } from '../modals/SleepEntryForm';
import type { SleepEntry } from '@/lib/db/sleep';

// Sleep stage colors - designed for clear visual distinction
const STAGE_COLORS = {
  deep: 'bg-indigo-500',
  rem: 'bg-teal-500',
  light: 'bg-slate-400',
  awake: 'bg-amber-500',
};

interface ReadingsTabProps {
  entries: SleepEntry[];
}

function SleepStagesBar({ entry }: { entry: SleepEntry }) {
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
    <div className="mt-2">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className={stage.color}
            style={{ width: `${stage.value}%` }}
            title={`${stage.label}: ${stage.value}%`}
          />
        ))}
      </div>
      {/* Compact legend with dots */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
        {stages.map((stage) => (
          <span key={stage.key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${stage.color}`} />
            {stage.value}%
          </span>
        ))}
      </div>
    </div>
  );
}

function SleepEntryRow({ entry, onClick }: { entry: SleepEntry; onClick: () => void }) {
  const restorative = getRestorativeSleepPct(entry);

  return (
    <div
      className="py-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/30 -mx-1 px-1 rounded transition-colors"
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-muted-foreground">
          {formatDate(entry.date, { includeWeekday: true })}
        </span>
        <span className="text-lg font-semibold">{formatDuration(entry.durationMinutes)}</span>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {(entry.hrvLow !== null || entry.hrvHigh !== null) && (
          <span>
            <span className="text-muted-foreground">HRV </span>
            <span className="font-medium">{formatHrvRange(entry.hrvLow, entry.hrvHigh)}</span>
          </span>
        )}
        {entry.restingHr !== null && (
          <span>
            <span className="text-muted-foreground">RHR </span>
            <span className="font-medium">{entry.restingHr}</span>
          </span>
        )}
        {restorative !== null && (
          <span>
            <span className="text-muted-foreground">Restorative </span>
            <span className="font-medium">{restorative}%</span>
          </span>
        )}
      </div>

      {/* Sleep stages bar */}
      <SleepStagesBar entry={entry} />

      {/* Notes */}
      {entry.notes && <p className="text-xs text-muted-foreground mt-2 truncate">{entry.notes}</p>}
    </div>
  );
}

export function ReadingsTab({ entries }: ReadingsTabProps) {
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Moon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No sleep entries in this period</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <SleepEntryRow key={entry.id} entry={entry} onClick={() => setEditingEntry(entry)} />
        ))}
      </div>

      <SleepEntryForm
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        entry={editingEntry}
      />
    </>
  );
}
