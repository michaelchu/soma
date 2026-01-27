import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { useBP } from '../../context/BPContext';
import { showError, showSuccess, showWithUndo } from '@/lib/toast';
import { getLocalDatetimeNow, toDatetimeLocalFormat } from '@/lib/dateUtils';
import { BP_VALIDATION } from '@/lib/validation';

function createEmptyBpRow() {
  return { systolic: '', diastolic: '', arm: null, pulse: '' };
}

// Inner form component that resets when key changes
function ReadingFormContent({ session, onOpenChange }) {
  const { addSession, updateSession, deleteSession } = useBP();
  const isEditing = !!session;

  const [datetime, setDatetime] = useState(() =>
    session ? toDatetimeLocalFormat(session.datetime) : getLocalDatetimeNow()
  );
  const [bpRows, setBpRows] = useState(() =>
    session?.readings
      ? session.readings.map((r) => ({
          systolic: String(r.systolic),
          diastolic: String(r.diastolic),
          arm: r.arm || null,
          pulse: r.pulse ? String(r.pulse) : '',
        }))
      : [createEmptyBpRow()]
  );
  const [notes, setNotes] = useState(() => session?.notes || '');
  const scrollContainerRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Auto-scroll to bottom when new row is added
  useEffect(() => {
    if (scrollContainerRef.current && bpRows.length > 1) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [bpRows.length]);

  const removeBpRow = (index) => {
    setBpRows((rows) => rows.filter((_, i) => i !== index));
  };

  // Calculate averages from valid rows
  const validRows = bpRows.filter(
    (row) =>
      row.systolic &&
      row.diastolic &&
      parseInt(row.systolic) >= BP_VALIDATION.SYSTOLIC_MIN &&
      parseInt(row.systolic) <= BP_VALIDATION.SYSTOLIC_MAX &&
      parseInt(row.diastolic) >= BP_VALIDATION.DIASTOLIC_MIN &&
      parseInt(row.diastolic) <= BP_VALIDATION.DIASTOLIC_MAX
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

  const rowsWithPulse = validRows.filter(
    (row) =>
      row.pulse &&
      parseInt(row.pulse) >= BP_VALIDATION.PULSE_MIN &&
      parseInt(row.pulse) <= BP_VALIDATION.PULSE_MAX
  );

  const avgPulse =
    rowsWithPulse.length > 0
      ? Math.round(
          rowsWithPulse.reduce((sum, row) => sum + parseInt(row.pulse), 0) / rowsWithPulse.length
        )
      : null;

  const isValid = datetime && validRows.length > 0;

  const handleSave = async () => {
    setSaving(true);

    // Convert valid rows to readings array with parsed integers
    const readings = validRows.map((row) => ({
      systolic: parseInt(row.systolic),
      diastolic: parseInt(row.diastolic),
      arm: row.arm,
      pulse: row.pulse ? parseInt(row.pulse) : null,
    }));

    const sessionData = {
      datetime: new Date(datetime).toISOString(),
      readings,
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
      showError(saveError.message || 'Failed to save reading');
      return;
    }

    showSuccess(isEditing ? 'Reading updated' : 'Reading added');

    // Reset form and close
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setDatetime(getLocalDatetimeNow());
    setBpRows([createEmptyBpRow()]);
    setNotes('');
    setConfirmDelete(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);

    const { error: deleteError, deletedSession } = await deleteSession(session.sessionId);

    setDeleting(false);

    if (deleteError) {
      showError(deleteError.message || 'Failed to delete reading');
      setConfirmDelete(false);
      return;
    }

    showWithUndo('Reading deleted', async () => {
      if (deletedSession) {
        // Re-add the session with its readings
        const { error: undoError } = await addSession({
          datetime: deletedSession.datetime,
          readings: deletedSession.readings.map((r) => ({
            systolic: r.systolic,
            diastolic: r.diastolic,
            arm: r.arm,
            pulse: r.pulse,
          })),
          notes: deletedSession.notes,
        });
        if (undoError) {
          showError('Failed to restore reading');
        }
      }
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
          <div ref={scrollContainerRef} className="max-h-40 overflow-y-auto -mx-1">
            {bpRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2 px-1 py-1">
                <Input
                  ref={(el) => setInputRef(index, 'systolic', el)}
                  type="number"
                  placeholder="Sys"
                  value={row.systolic}
                  onChange={(e) => updateBpRow(index, 'systolic', e.target.value)}
                  min={BP_VALIDATION.SYSTOLIC_MIN}
                  max={BP_VALIDATION.SYSTOLIC_MAX}
                  className="text-center"
                />
                <span className="text-2xl text-muted-foreground">/</span>
                <Input
                  ref={(el) => setInputRef(index, 'diastolic', el)}
                  type="number"
                  placeholder="Dia"
                  value={row.diastolic}
                  onChange={(e) => updateBpRow(index, 'diastolic', e.target.value)}
                  min={BP_VALIDATION.DIASTOLIC_MIN}
                  max={BP_VALIDATION.DIASTOLIC_MAX}
                  className="text-center"
                />
                <Input
                  type="number"
                  placeholder="Pulse"
                  value={row.pulse}
                  onChange={(e) => updateBpRow(index, 'pulse', e.target.value)}
                  min={BP_VALIDATION.PULSE_MIN}
                  max={BP_VALIDATION.PULSE_MAX}
                  className="w-20 text-center flex-shrink-0"
                />
                {/* Arm selector */}
                <div
                  className="flex h-9 rounded-md border border-input overflow-hidden flex-shrink-0"
                  role="group"
                  aria-label="Arm selection"
                >
                  <button
                    type="button"
                    onClick={() => updateBpRow(index, 'arm', row.arm === 'L' ? null : 'L')}
                    aria-label="Left arm"
                    aria-pressed={row.arm === 'L'}
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
                    aria-label="Right arm"
                    aria-pressed={row.arm === 'R'}
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
              Average: {avgSystolic}/{avgDiastolic} mmHg{avgPulse && ` • ${avgPulse} bpm`}
            </div>
          )}
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

export function ReadingForm({ open, onOpenChange, session = null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col rounded-none sm:rounded-lg">
        <ReadingFormContent
          key={session?.sessionId || 'new'}
          session={session}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
