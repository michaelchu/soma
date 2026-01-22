import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2 } from 'lucide-react';
import { BPStatusBadge } from '../ui/BPStatusBadge';
import { getBPCategory } from '../../utils/bpHelpers';
import { useReadings } from '../../hooks/useReadings';

export function ReadingForm({ open, onOpenChange }) {
  const { addReading } = useReadings();
  const [datetime, setDatetime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const category = systolic && diastolic ? getBPCategory(parseInt(systolic), parseInt(diastolic)) : null;

  const isValid =
    datetime &&
    systolic &&
    diastolic &&
    parseInt(systolic) >= 60 &&
    parseInt(systolic) <= 250 &&
    parseInt(diastolic) >= 40 &&
    parseInt(diastolic) <= 150;

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const reading = {
      datetime: new Date(datetime).toISOString(),
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || null,
    };

    const { error: saveError } = await addReading(reading);

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
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDatetime(now.toISOString().slice(0, 16));
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setNotes('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Blood Pressure Reading</DialogTitle>
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
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Systolic"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                min={60}
                max={250}
                className="text-center"
              />
              <span className="text-2xl text-muted-foreground">/</span>
              <Input
                type="number"
                placeholder="Diastolic"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                min={40}
                max={150}
                className="text-center"
              />
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
