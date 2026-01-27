import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Heart, Activity, Brain } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { formatDuration, formatHrvRange, getRestorativeSleepPct } from '../../utils/sleepHelpers';
import { SleepEntryForm } from '../modals/SleepEntryForm';
import type { SleepEntry } from '@/lib/db/sleep';

interface ReadingsTabProps {
  entries: SleepEntry[];
}

function SleepEntryCard({ entry, onClick }: { entry: SleepEntry; onClick: () => void }) {
  const restorative = getRestorativeSleepPct(entry);

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium">{formatDate(entry.date, { includeWeekday: true })}</p>
            <p className="text-2xl font-bold">{formatDuration(entry.durationMinutes)}</p>
          </div>
          <Moon className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* HRV */}
          {(entry.hrvLow !== null || entry.hrvHigh !== null) && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-muted-foreground text-xs">HRV</p>
                <p className="font-medium">{formatHrvRange(entry.hrvLow, entry.hrvHigh)}</p>
              </div>
            </div>
          )}

          {/* Resting HR */}
          {entry.restingHr !== null && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-muted-foreground text-xs">Resting HR</p>
                <p className="font-medium">{entry.restingHr} bpm</p>
              </div>
            </div>
          )}

          {/* Restorative Sleep */}
          {restorative !== null && (
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-muted-foreground text-xs">Restorative</p>
                <p className="font-medium">{restorative}%</p>
              </div>
            </div>
          )}

          {/* HR Drop */}
          {entry.hrDropMinutes !== null && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-muted-foreground text-xs">HR Drop</p>
                <p className="font-medium">{entry.hrDropMinutes} min</p>
              </div>
            </div>
          )}
        </div>

        {/* Sleep Stages Bar */}
        {(entry.deepSleepPct !== null || entry.remSleepPct !== null) && (
          <div className="mt-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              {entry.deepSleepPct !== null && (
                <div
                  className="bg-indigo-600"
                  style={{ width: `${entry.deepSleepPct}%` }}
                  title={`Deep: ${entry.deepSleepPct}%`}
                />
              )}
              {entry.remSleepPct !== null && (
                <div
                  className="bg-cyan-500"
                  style={{ width: `${entry.remSleepPct}%` }}
                  title={`REM: ${entry.remSleepPct}%`}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Deep {entry.deepSleepPct ?? 0}%</span>
              <span>REM {entry.remSleepPct ?? 0}%</span>
            </div>
          </div>
        )}

        {entry.notes && (
          <p className="text-sm text-muted-foreground mt-2 truncate">{entry.notes}</p>
        )}
      </CardContent>
    </Card>
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
      <div className="space-y-3">
        {entries.map((entry) => (
          <SleepEntryCard key={entry.id} entry={entry} onClick={() => setEditingEntry(entry)} />
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
