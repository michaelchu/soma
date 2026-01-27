import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Trash2 } from 'lucide-react';
import { useSleep } from '../../context/SleepContext';
import { showError, showSuccess, showWithUndo } from '@/lib/toast';
import type { SleepEntry } from '@/lib/db/sleep';

function getLocalDateNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

/**
 * Calculate duration in minutes from sleep start and end times
 * Handles overnight sleep (end time before start time)
 */
function calculateDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // If end is before start, it's overnight sleep
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

/**
 * Calculate HR drop time in minutes from sleep start to lowest HR time
 * Handles overnight sleep
 */
function calculateHrDrop(sleepStart: string, lowestHrTime: string): number | null {
  if (!sleepStart || !lowestHrTime) return null;
  const [startH, startM] = sleepStart.split(':').map(Number);
  const [lowH, lowM] = lowestHrTime.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let lowMinutes = lowH * 60 + lowM;

  // If lowest HR time is before sleep start, it's next day
  if (lowMinutes < startMinutes) {
    lowMinutes += 24 * 60;
  }

  return lowMinutes - startMinutes;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function SleepEntryFormContent({
  entry,
  onOpenChange,
}: {
  entry: SleepEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addEntry, updateEntry, deleteEntry } = useSleep();
  const isEditing = !!entry;

  // Form state
  const [date, setDate] = useState(() => entry?.date || getLocalDateNow());
  const [sleepStart, setSleepStart] = useState(() => entry?.sleepStart || '');
  const [sleepEnd, setSleepEnd] = useState(() => entry?.sleepEnd || '');
  const [hrvLow, setHrvLow] = useState(() => (entry?.hrvLow ? String(entry.hrvLow) : ''));
  const [hrvHigh, setHrvHigh] = useState(() => (entry?.hrvHigh ? String(entry.hrvHigh) : ''));
  const [restingHr, setRestingHr] = useState(() =>
    entry?.restingHr ? String(entry.restingHr) : ''
  );
  const [lowestHrTime, setLowestHrTime] = useState(() => entry?.lowestHrTime || '');
  const [deepSleepPct, setDeepSleepPct] = useState(() =>
    entry?.deepSleepPct ? String(entry.deepSleepPct) : ''
  );
  const [remSleepPct, setRemSleepPct] = useState(() =>
    entry?.remSleepPct ? String(entry.remSleepPct) : ''
  );
  const [lightSleepPct, setLightSleepPct] = useState(() =>
    entry?.lightSleepPct ? String(entry.lightSleepPct) : ''
  );
  const [awakePct, setAwakePct] = useState(() => (entry?.awakePct ? String(entry.awakePct) : ''));
  const [notes, setNotes] = useState(() => entry?.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Calculate duration and HR drop from times
  const calculatedDuration = useMemo(
    () => calculateDuration(sleepStart, sleepEnd),
    [sleepStart, sleepEnd]
  );
  const calculatedHrDrop = useMemo(
    () => calculateHrDrop(sleepStart, lowestHrTime),
    [sleepStart, lowestHrTime]
  );

  const isValid = date && sleepStart && sleepEnd && calculatedDuration > 0;

  const handleSave = async () => {
    setSaving(true);

    const entryData = {
      date,
      sleepStart: sleepStart || null,
      sleepEnd: sleepEnd || null,
      hrvLow: hrvLow ? parseInt(hrvLow) : null,
      hrvHigh: hrvHigh ? parseInt(hrvHigh) : null,
      restingHr: restingHr ? parseInt(restingHr) : null,
      lowestHrTime: lowestHrTime || null,
      hrDropMinutes: calculatedHrDrop,
      deepSleepPct: deepSleepPct ? parseInt(deepSleepPct) : null,
      remSleepPct: remSleepPct ? parseInt(remSleepPct) : null,
      lightSleepPct: lightSleepPct ? parseInt(lightSleepPct) : null,
      awakePct: awakePct ? parseInt(awakePct) : null,
      notes: notes || null,
    };

    let saveError;
    if (isEditing) {
      const result = await updateEntry(entry.id, entryData);
      saveError = result.error;
    } else {
      const result = await addEntry(entryData);
      saveError = result.error;
    }

    setSaving(false);

    if (saveError) {
      showError(saveError.message || 'Failed to save sleep entry');
      return;
    }

    showSuccess(isEditing ? 'Sleep entry updated' : 'Sleep entry added');
    onOpenChange(false);
  };

  const handleReset = () => {
    setDate(getLocalDateNow());
    setSleepStart('');
    setSleepEnd('');
    setHrvLow('');
    setHrvHigh('');
    setRestingHr('');
    setLowestHrTime('');
    setDeepSleepPct('');
    setRemSleepPct('');
    setLightSleepPct('');
    setAwakePct('');
    setNotes('');
    setConfirmDelete(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);

    const { error: deleteError, deletedItem } = await deleteEntry(entry!.id);

    setDeleting(false);

    if (deleteError) {
      showError(deleteError.message || 'Failed to delete entry');
      setConfirmDelete(false);
      return;
    }

    showWithUndo('Sleep entry deleted', async () => {
      if (deletedItem) {
        const { error: undoError } = await addEntry({
          date: deletedItem.date,
          sleepStart: deletedItem.sleepStart,
          sleepEnd: deletedItem.sleepEnd,
          hrvLow: deletedItem.hrvLow,
          hrvHigh: deletedItem.hrvHigh,
          restingHr: deletedItem.restingHr,
          lowestHrTime: deletedItem.lowestHrTime,
          hrDropMinutes: deletedItem.hrDropMinutes,
          deepSleepPct: deletedItem.deepSleepPct,
          remSleepPct: deletedItem.remSleepPct,
          lightSleepPct: deletedItem.lightSleepPct,
          awakePct: deletedItem.awakePct,
          notes: deletedItem.notes,
        });
        if (undoError) {
          showError('Failed to restore entry');
        }
      }
    });

    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Sleep Entry' : 'Add Sleep Entry'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2 -mx-1 px-1">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Sleep Times */}
        <div className="space-y-2">
          <Label>Sleep Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={sleepStart}
              onChange={(e) => setSleepStart(e.target.value)}
              className="flex-1"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="time"
              value={sleepEnd}
              onChange={(e) => setSleepEnd(e.target.value)}
              className="flex-1"
            />
          </div>
          {calculatedDuration > 0 && (
            <p className="text-sm text-muted-foreground">
              Duration: {formatDuration(calculatedDuration)}
            </p>
          )}
        </div>

        {/* HRV Range */}
        <div className="space-y-2">
          <Label>HRV Range (ms)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Low"
              value={hrvLow}
              onChange={(e) => setHrvLow(e.target.value)}
              min={1}
              max={500}
              className="flex-1"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="High"
              value={hrvHigh}
              onChange={(e) => setHrvHigh(e.target.value)}
              min={1}
              max={500}
              className="flex-1"
            />
          </div>
        </div>

        {/* Heart Rate Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="restingHr">Resting HR (bpm)</Label>
            <Input
              id="restingHr"
              type="number"
              placeholder="e.g., 52"
              value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)}
              min={20}
              max={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowestHrTime">Lowest HR Time</Label>
            <Input
              id="lowestHrTime"
              type="time"
              value={lowestHrTime}
              onChange={(e) => setLowestHrTime(e.target.value)}
            />
          </div>
        </div>
        {calculatedHrDrop !== null && (
          <p className="text-sm text-muted-foreground -mt-2">
            HR drop: {calculatedHrDrop} mins after sleep start
          </p>
        )}

        {/* Sleep Stages */}
        <div className="space-y-2">
          <Label>Sleep Stages (%)</Label>
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="Deep"
                value={deepSleepPct}
                onChange={(e) => setDeepSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground text-center">Deep</p>
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="REM"
                value={remSleepPct}
                onChange={(e) => setRemSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground text-center">REM</p>
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="Light"
                value={lightSleepPct}
                onChange={(e) => setLightSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground text-center">Light</p>
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                placeholder="Awake"
                value={awakePct}
                onChange={(e) => setAwakePct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <p className="text-xs text-muted-foreground text-center">Awake</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="e.g., Late dinner, stress, alcohol..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isEditing && (
            <Button
              variant={confirmDelete ? 'destructive' : 'outline'}
              onClick={handleDelete}
              disabled={saving || deleting}
              className="flex-shrink-0"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {confirmDelete && <span className="ml-2">Confirm</span>}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={saving || deleting}
          >
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving || deleting} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

export function SleepEntryForm({
  open,
  onOpenChange,
  entry = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: SleepEntry | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col rounded-none sm:rounded-lg">
        <SleepEntryFormContent key={entry?.id || 'new'} entry={entry} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
