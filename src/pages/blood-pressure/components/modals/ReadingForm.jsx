import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Plus, X, Trash2 } from 'lucide-react';

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
  return { systolic: '', diastolic: '', arm: null };
}

// Inner form component that resets when key changes
function ReadingFormContent({ session, onOpenChange, addSession, updateSession, deleteSession }) {
  const isEditing = !!session;

  const [datetime, setDatetime] = useState(() =>
    session ? formatDatetimeForInput(session.datetime) : getDefaultDatetime()
  );
  const [bpRows, setBpRows] = useState(() =>
    session?.readings
      ? session.readings.map((r) => ({
          systolic: String(r.systolic),
          diastolic: String(r.diastolic),
          arm: r.arm || null,
        }))
      : [createEmptyBpRow()]
  );
  const [pulse, setPulse] = useState(() => (session?.pulse ? String(session.pulse) : ''));
  const [notes, setNotes] = useState(() => session?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  // Refs for auto-focus: inputRefs[rowIndex][field] where field is 'systolic' or 'diastolic'
  const inputRefs = useRef({});

  const setInputRef = useCallback((rowIndex, field, el) => {
    if (!inputRefs.current[rowIndex]) {
      inputRefs.current[rowIndex] = {};
    }
    inputRefs.current[rowIndex][field] = el;
  }, []);

  const updateBpRow = (index, field, value) => {
    setBpRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

    // Auto-focus to next field after 3 digits
    if (value.length === 3) {
      if (field === 'systolic') {
        // Move to diastolic in same row
        inputRefs.current[index]?.diastolic?.focus();
      } else if (field === 'diastolic') {
        // Move to systolic in next row if available
        inputRefs.current[index + 1]?.systolic?.focus();
      }
    }
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

  const isValid = datetime && validRows.length > 0;

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    // Convert valid rows to readings array with parsed integers
    const readings = validRows.map((row) => ({
      systolic: parseInt(row.systolic),
      diastolic: parseInt(row.diastolic),
      arm: row.arm,
    }));

    const sessionData = {
      datetime: new Date(datetime).toISOString(),
      readings,
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || null,
    };

    let saveError;
    if (isEditing) {
      const result = await updateSession(session.sessionId, sessionData);
      saveError = result.error;
    } else {
      const result = await addSession(sessionData);
      saveError = result.error;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message || 'Failed to save reading');
      return;
    }

    toast.success(isEditing ? 'Reading updated' : 'Reading added');

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
    setConfirmDelete(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setError(null);
    setDeleting(true);

    const { error: deleteError, deletedSession } = await deleteSession(session.sessionId);

    setDeleting(false);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete reading');
      setConfirmDelete(false);
      return;
    }

    toast('Reading deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          if (deletedSession) {
            // Re-add the session with its readings
            addSession({
              datetime: deletedSession.datetime,
              readings: deletedSession.readings.map((r) => ({
                systolic: r.systolic,
                diastolic: r.diastolic,
                arm: r.arm,
              })),
              pulse: deletedSession.pulse,
              notes: deletedSession.notes,
            });
          }
        },
      },
      duration: 4000,
    });

    onOpenChange(false);
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
          <div className="max-h-40 overflow-y-auto -mx-1">
            {bpRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2 px-1 py-1">
                <Input
                  ref={(el) => setInputRef(index, 'systolic', el)}
                  type="number"
                  placeholder="Sys"
                  value={row.systolic}
                  onChange={(e) => updateBpRow(index, 'systolic', e.target.value)}
                  min={60}
                  max={250}
                  className="text-center"
                />
                <span className="text-2xl text-muted-foreground">/</span>
                <Input
                  ref={(el) => setInputRef(index, 'diastolic', el)}
                  type="number"
                  placeholder="Dia"
                  value={row.diastolic}
                  onChange={(e) => updateBpRow(index, 'diastolic', e.target.value)}
                  min={40}
                  max={150}
                  className="text-center"
                />
                {/* Arm selector */}
                <div className="flex h-9 rounded-md border border-input overflow-hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => updateBpRow(index, 'arm', row.arm === 'L' ? null : 'L')}
                    className={`px-2.5 text-sm font-medium transition-colors ${
                      row.arm === 'L'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    L
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBpRow(index, 'arm', row.arm === 'R' ? null : 'R')}
                    className={`px-2.5 text-sm font-medium border-l border-input transition-colors ${
                      row.arm === 'R'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    R
                  </button>
                </div>
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
          {isEditing && deleteSession && (
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

export function ReadingForm({
  open,
  onOpenChange,
  session = null,
  addSession,
  updateSession,
  deleteSession,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col rounded-none sm:rounded-lg">
        <ReadingFormContent
          key={session?.sessionId || 'new'}
          session={session}
          onOpenChange={onOpenChange}
          addSession={addSession}
          updateSession={updateSession}
          deleteSession={deleteSession}
        />
      </DialogContent>
    </Dialog>
  );
}
