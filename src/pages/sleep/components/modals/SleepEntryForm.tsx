import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2 } from 'lucide-react';
import {
  formatTimeString,
  formatDuration,
  getLocalDateNow,
  calculateDurationFromTimes,
} from '@/lib/dateUtils';
import { useSleep } from '../../context/SleepContext';
import { showError, showSuccess, extractErrorMessage } from '@/lib/toast';
import type { SleepEntry } from '@/lib/db/sleep';

/**
 * Calculate HR drop time in minutes from sleep start to lowest HR time
 * Uses shared calculateDurationFromTimes for overnight handling
 */
function calculateHrDrop(sleepStart: string, lowestHrTime: string): number | null {
  if (!sleepStart || !lowestHrTime) return null;
  return calculateDurationFromTimes(sleepStart, lowestHrTime);
}

function SleepEntryFormContent({
  entry,
  onOpenChange,
}: {
  entry: SleepEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addEntry, updateEntry } = useSleep();
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
  const [skinTempAvg, setSkinTempAvg] = useState(() =>
    entry?.skinTempAvg ? String(entry.skinTempAvg) : ''
  );
  const [sleepCyclesFull, setSleepCyclesFull] = useState(() =>
    entry?.sleepCyclesFull ? String(entry.sleepCyclesFull) : ''
  );
  const [sleepCyclesPartial, setSleepCyclesPartial] = useState(() =>
    entry?.sleepCyclesPartial ? String(entry.sleepCyclesPartial) : ''
  );
  const [movementCount, setMovementCount] = useState(() =>
    entry?.movementCount ? String(entry.movementCount) : ''
  );
  const [totalSleepHours, setTotalSleepHours] = useState(() =>
    entry?.totalSleepMinutes ? String(Math.floor(entry.totalSleepMinutes / 60)) : ''
  );
  const [totalSleepMins, setTotalSleepMins] = useState(() =>
    entry?.totalSleepMinutes ? String(entry.totalSleepMinutes % 60) : ''
  );
  const [notes, setNotes] = useState(() => entry?.notes || '');

  const [saving, setSaving] = useState(false);

  // Calculate duration and HR drop from times
  const calculatedDuration = useMemo(
    () => calculateDurationFromTimes(sleepStart, sleepEnd),
    [sleepStart, sleepEnd]
  );
  const calculatedHrDrop = useMemo(
    () => calculateHrDrop(sleepStart, lowestHrTime),
    [sleepStart, lowestHrTime]
  );

  // Total sleep from manual input (in minutes)
  const totalSleepManual = useMemo(() => {
    const hours = totalSleepHours ? parseInt(totalSleepHours) : 0;
    const mins = totalSleepMins ? parseInt(totalSleepMins) : 0;
    return hours > 0 || mins > 0 ? hours * 60 + mins : null;
  }, [totalSleepHours, totalSleepMins]);

  const isValid = date && sleepStart && sleepEnd && calculatedDuration > 0;

  const handleSave = async () => {
    setSaving(true);

    const entryData = {
      date,
      totalSleepMinutes: totalSleepManual,
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
      skinTempAvg: skinTempAvg ? parseFloat(skinTempAvg) : null,
      sleepCyclesFull: sleepCyclesFull ? parseInt(sleepCyclesFull) : null,
      sleepCyclesPartial: sleepCyclesPartial ? parseInt(sleepCyclesPartial) : null,
      movementCount: movementCount ? parseInt(movementCount) : null,
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
      showError(extractErrorMessage(saveError) || 'Failed to save sleep entry');
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
    setSkinTempAvg('');
    setSleepCyclesFull('');
    setSleepCyclesPartial('');
    setMovementCount('');
    setTotalSleepHours('');
    setTotalSleepMins('');
    setNotes('');
  };

  return (
    <>
      {/* Header */}
      <DialogHeader className="flex-shrink-0 px-5 py-4 border-b">
        <DialogTitle>{isEditing ? 'Edit Sleep Entry' : 'Add Sleep Entry'}</DialogTitle>
      </DialogHeader>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-4 py-4">
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
                className="flex-1 min-w-0"
              />
              <span className="text-muted-foreground flex-shrink-0">to</span>
              <Input
                type="time"
                value={sleepEnd}
                onChange={(e) => setSleepEnd(e.target.value)}
                className="flex-1 min-w-0"
              />
            </div>
            {calculatedDuration > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatTimeString(sleepStart)} → {formatTimeString(sleepEnd)} (
                {formatDuration(calculatedDuration) || `${calculatedDuration}m`})
              </p>
            )}
          </div>

          {/* Total Sleep (actual sleep time, separate from time in bed) */}
          <div className="space-y-2">
            <Label>Total Sleep</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Hours"
                value={totalSleepHours}
                onChange={(e) => setTotalSleepHours(e.target.value)}
                min={0}
                max={24}
                className="flex-1"
              />
              <span className="text-muted-foreground">h</span>
              <Input
                type="number"
                placeholder="Min"
                value={totalSleepMins}
                onChange={(e) => setTotalSleepMins(e.target.value)}
                min={0}
                max={59}
                className="flex-1"
              />
              <span className="text-muted-foreground">m</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Actual time asleep (vs time in bed above)
            </p>
          </div>

          <hr className="border-t" />

          {/* Sleep Stages Section */}
          <h3 className="text-sm font-semibold text-foreground">Sleep Stages</h3>

          <div className="space-y-2">
            <Label>Percentages</Label>
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Awake"
                value={awakePct}
                onChange={(e) => setAwakePct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <Input
                type="number"
                placeholder="REM"
                value={remSleepPct}
                onChange={(e) => setRemSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <Input
                type="number"
                placeholder="Light"
                value={lightSleepPct}
                onChange={(e) => setLightSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
              <Input
                type="number"
                placeholder="Deep"
                value={deepSleepPct}
                onChange={(e) => setDeepSleepPct(e.target.value)}
                min={0}
                max={100}
                className="text-center"
              />
            </div>
          </div>

          {/* Sleep Cycles */}
          <div className="space-y-2">
            <Label>Sleep Cycles</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Full"
                value={sleepCyclesFull}
                onChange={(e) => setSleepCyclesFull(e.target.value)}
                min={0}
                max={20}
              />
              <Input
                type="number"
                placeholder="Partial"
                value={sleepCyclesPartial}
                onChange={(e) => setSleepCyclesPartial(e.target.value)}
                min={0}
                max={20}
              />
            </div>
          </div>

          <hr className="border-t" />

          {/* Heart Metrics Section */}
          <h3 className="text-sm font-semibold text-foreground">Heart Metrics</h3>

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

          <hr className="border-t" />

          {/* Body Metrics Section */}
          <h3 className="text-sm font-semibold text-foreground">Body Metrics</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="skinTempAvg">Skin Temp Avg (°C)</Label>
              <Input
                id="skinTempAvg"
                type="number"
                step="0.1"
                placeholder="e.g., 34.5"
                value={skinTempAvg}
                onChange={(e) => setSkinTempAvg(e.target.value)}
                min={20}
                max={45}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="movementCount">Movements</Label>
              <Input
                id="movementCount"
                type="number"
                placeholder="e.g., 15"
                value={movementCount}
                onChange={(e) => setMovementCount(e.target.value)}
                min={0}
                max={500}
              />
            </div>
          </div>

          <hr className="border-t" />

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
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-5 py-4 flex-shrink-0 border-t">
        <Button variant="outline" onClick={handleReset} className="flex-1" disabled={saving}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!isValid || saving} className="flex-1">
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
      <DialogContent
        className="w-full h-full max-w-none sm:max-w-md sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-lg overflow-hidden p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SleepEntryFormContent key={entry?.id || 'new'} entry={entry} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
