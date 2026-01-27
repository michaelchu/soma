import { useState } from 'react';
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
  const [durationHours, setDurationHours] = useState(() =>
    entry ? String(Math.floor(entry.durationMinutes / 60)) : ''
  );
  const [durationMins, setDurationMins] = useState(() =>
    entry ? String(entry.durationMinutes % 60) : ''
  );
  const [hrvLow, setHrvLow] = useState(() => (entry?.hrvLow ? String(entry.hrvLow) : ''));
  const [hrvHigh, setHrvHigh] = useState(() => (entry?.hrvHigh ? String(entry.hrvHigh) : ''));
  const [restingHr, setRestingHr] = useState(() =>
    entry?.restingHr ? String(entry.restingHr) : ''
  );
  const [lowestHrTime, setLowestHrTime] = useState(() => entry?.lowestHrTime || '');
  const [hrDropMinutes, setHrDropMinutes] = useState(() =>
    entry?.hrDropMinutes ? String(entry.hrDropMinutes) : ''
  );
  const [deepSleepPct, setDeepSleepPct] = useState(() =>
    entry?.deepSleepPct ? String(entry.deepSleepPct) : ''
  );
  const [remSleepPct, setRemSleepPct] = useState(() =>
    entry?.remSleepPct ? String(entry.remSleepPct) : ''
  );
  const [notes, setNotes] = useState(() => entry?.notes || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Calculate total duration
  const totalMinutes = (parseInt(durationHours) || 0) * 60 + (parseInt(durationMins) || 0);
  const isValid = date && totalMinutes > 0;

  const handleSave = async () => {
    setSaving(true);

    const entryData = {
      date,
      durationMinutes: totalMinutes,
      hrvLow: hrvLow ? parseInt(hrvLow) : null,
      hrvHigh: hrvHigh ? parseInt(hrvHigh) : null,
      restingHr: restingHr ? parseInt(restingHr) : null,
      lowestHrTime: lowestHrTime || null,
      hrDropMinutes: hrDropMinutes ? parseInt(hrDropMinutes) : null,
      deepSleepPct: deepSleepPct ? parseInt(deepSleepPct) : null,
      remSleepPct: remSleepPct ? parseInt(remSleepPct) : null,
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
    setDurationHours('');
    setDurationMins('');
    setHrvLow('');
    setHrvHigh('');
    setRestingHr('');
    setLowestHrTime('');
    setHrDropMinutes('');
    setDeepSleepPct('');
    setRemSleepPct('');
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
          durationMinutes: deletedItem.durationMinutes,
          hrvLow: deletedItem.hrvLow,
          hrvHigh: deletedItem.hrvHigh,
          restingHr: deletedItem.restingHr,
          lowestHrTime: deletedItem.lowestHrTime,
          hrDropMinutes: deletedItem.hrDropMinutes,
          deepSleepPct: deletedItem.deepSleepPct,
          remSleepPct: deletedItem.remSleepPct,
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

        {/* Duration */}
        <div className="space-y-2">
          <Label>Sleep Duration</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Hours"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              min={0}
              max={24}
              className="flex-1"
            />
            <span className="text-muted-foreground">h</span>
            <Input
              type="number"
              placeholder="Mins"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              min={0}
              max={59}
              className="flex-1"
            />
            <span className="text-muted-foreground">m</span>
          </div>
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
            <Label htmlFor="hrDropMinutes">HR Drop (mins)</Label>
            <Input
              id="hrDropMinutes"
              type="number"
              placeholder="e.g., 25"
              value={hrDropMinutes}
              onChange={(e) => setHrDropMinutes(e.target.value)}
              min={0}
              max={180}
            />
          </div>
        </div>

        {/* Lowest HR Time */}
        <div className="space-y-2">
          <Label htmlFor="lowestHrTime">Lowest HR Time</Label>
          <Input
            id="lowestHrTime"
            type="time"
            value={lowestHrTime}
            onChange={(e) => setLowestHrTime(e.target.value)}
          />
        </div>

        {/* Sleep Stages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="deepSleepPct">Deep Sleep (%)</Label>
            <Input
              id="deepSleepPct"
              type="number"
              placeholder="e.g., 20"
              value={deepSleepPct}
              onChange={(e) => setDeepSleepPct(e.target.value)}
              min={0}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remSleepPct">REM Sleep (%)</Label>
            <Input
              id="remSleepPct"
              type="number"
              placeholder="e.g., 25"
              value={remSleepPct}
              onChange={(e) => setRemSleepPct(e.target.value)}
              min={0}
              max={100}
            />
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
