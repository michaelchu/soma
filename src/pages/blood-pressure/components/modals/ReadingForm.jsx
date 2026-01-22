import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Plus, X } from 'lucide-react';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { useBPSettings } from '../../hooks/useBPSettings';
import { useReadings } from '../../hooks/useReadings';

function getDefaultDatetime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDatetimeForInput(isoString) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function createEmptyBpRow() {
  return { systolic: '', diastolic: '' };
}

// Inner form component that resets when key changes
function ReadingFormContent({ reading, onOpenChange }) {
  const { addReading, updateReading } = useReadings();
  const { getCategory } = useBPSettings();
  const isEditing = !!reading;

  const [datetime, setDatetime] = useState(() =>
    reading ? formatDatetimeForInput(reading.datetime) : getDefaultDatetime()
  );
  const [bpRows, setBpRows] = useState(() =>
    reading
      ? [{ systolic: String(reading.systolic), diastolic: String(reading.diastolic) }]
      : [createEmptyBpRow()]
  );
  const [pulse, setPulse] = useState(() => (reading?.pulse ? String(reading.pulse) : ''));
  const [notes, setNotes] = useState(() => reading?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updateBpRow = (index, field, value) => {
    setBpRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addBpRow = () => {
    setBpRows((rows) => [...rows, createEmptyBpRow()]);
  };

  const removeBpRow = (index) => {
    setBpRows((rows) => rows.filter((_, i) => i !== index));
  };

  // Calculate averages from valid rows
  const validRows = bpRows.filter(
    (row) =>
      row.systolic &&
      row.diastolic &&
      parseInt(row.systolic) >= 60 &&
      parseInt(row.systolic) <= 250 &&
      parseInt(row.diastolic) >= 40 &&
      parseInt(row.diastolic) <= 150
  );

  const avgSystolic =
    validRows.length > 0
      ? Math.round(
          validRows.reduce((sum, row) => sum + parseInt(row.systolic), 0) / validRows.length
        )
      : null;

  const avgDiastolic =
    validRows.length > 0
      ? Math.round(
          validRows.reduce((sum, row) => sum + parseInt(row.diastolic), 0) / validRows.length
        )
      : null;

  const category = avgSystolic && avgDiastolic ? getCategory(avgSystolic, avgDiastolic) : null;

  const isValid = datetime && validRows.length > 0;

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const readingData = {
      datetime: new Date(datetime).toISOString(),
      systolic: avgSystolic,
      diastolic: avgDiastolic,
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || null,
    };

    let saveError;
    if (isEditing) {
      const result = await updateReading(reading.id, readingData);
      saveError = result.error;
    } else {
      const result = await addReading(readingData);
      saveError = result.error;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Failed to save reading');
      return;
    }

    // Reset form and close
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setDatetime(getDefaultDatetime());
    setBpRows([createEmptyBpRow()]);
    setPulse('');
    setNotes('');
    setError(null);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Reading' : 'Add Blood Pressure Reading'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        {/* Date & Time */}
        <div className="space-y-2">
          <Label htmlFor="datetime">Date & Time</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>

        {/* Blood Pressure */}
        <div className="space-y-2">
          <Label>Blood Pressure (mmHg)</Label>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {bpRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Systolic"
                  value={row.systolic}
                  onChange={(e) => updateBpRow(index, 'systolic', e.target.value)}
                  min={60}
                  max={250}
                  className="text-center"
                />
                <span className="text-2xl text-muted-foreground">/</span>
                <Input
                  type="number"
                  placeholder="Diastolic"
                  value={row.diastolic}
                  onChange={(e) => updateBpRow(index, 'diastolic', e.target.value)}
                  min={40}
                  max={150}
                  className="text-center"
                />
                {bpRows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => removeBpRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addBpRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          {validRows.length > 1 && (
            <div className="text-sm text-muted-foreground">
              Average: {avgSystolic}/{avgDiastolic} mmHg
            </div>
          )}
          {category && (
            <div className="pt-1">
              <BPStatusBadge category={category} showDescription />
            </div>
          )}
        </div>

        {/* Pulse */}
        <div className="space-y-2">
          <Label htmlFor="pulse">Pulse (optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pulse"
              type="number"
              placeholder="72"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              min={30}
              max={200}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">bpm</span>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="e.g., Morning reading, after exercise..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
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
      </div>
    </>
  );
}

export function ReadingForm({ open, onOpenChange, reading = null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col rounded-none sm:rounded-lg">
        <ReadingFormContent
          key={reading?.id || 'new'}
          reading={reading}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
