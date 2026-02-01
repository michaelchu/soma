import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useBloodPressure } from '../../context/BPContext';
import { showError, showSuccess, showWithUndo, extractErrorMessage } from '@/lib/toast';
import { getLocalDatetimeNow, toDatetimeLocalFormat } from '@/lib/dateUtils';
import { BP_VALIDATION } from '@/lib/validation';
import { BPRowInput, type BPRowData, type BPRowInputRef } from './BPRowInput';
import { FormActions } from './FormActions';
import type { Arm } from '@/types/bloodPressure';

function createEmptyBpRow(): BPRowData {
  return { systolic: '', diastolic: '', arm: null, pulse: '' };
}

interface ReadingFormContentProps {
  session: {
    sessionId: string;
    datetime: string;
    notes: string | null;
    readings: Array<{
      systolic: number;
      diastolic: number;
      arm: Arm;
      pulse?: number | null;
    }>;
  } | null;
  onOpenChange: (open: boolean) => void;
}

// Inner form component that resets when key changes
function ReadingFormContent({ session, onOpenChange }: ReadingFormContentProps) {
  const { addSession, updateSession, deleteSession } = useBloodPressure();
  const isEditing = !!session;

  const [datetime, setDatetime] = useState(() =>
    session ? toDatetimeLocalFormat(session.datetime) : getLocalDatetimeNow()
  );
  const [bpRows, setBpRows] = useState<BPRowData[]>(() =>
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Refs for auto-focus
  const rowRefs = useRef<Map<number, BPRowInputRef>>(new Map());
  const shouldFocusNewRow = useRef(false);

  // Auto-scroll to bottom and focus new row when added
  useEffect(() => {
    if (scrollContainerRef.current && bpRows.length > 1) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    if (shouldFocusNewRow.current) {
      shouldFocusNewRow.current = false;
      // Focus the last row's systolic input
      rowRefs.current.get(bpRows.length - 1)?.focusSystolic();
    }
  }, [bpRows.length]);

  const updateBpRow = (index: number, field: keyof BPRowData, value: string | Arm) => {
    setBpRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addBpRow = () => {
    shouldFocusNewRow.current = true;
    setBpRows((rows) => [...rows, createEmptyBpRow()]);
  };

  const removeBpRow = (index: number) => {
    setBpRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleAutoAdvance = (index: number, nextField: 'diastolic' | 'pulse' | 'nextRow') => {
    if (nextField === 'nextRow') {
      // Focus systolic of next row if available
      rowRefs.current.get(index + 1)?.focusSystolic();
    }
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

  const isValid = Boolean(datetime && validRows.length > 0);

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
    if (isEditing && session) {
      const result = await updateSession(session.sessionId, sessionData);
      saveError = result.error;
    } else {
      const result = await addSession(sessionData);
      saveError = result.error;
    }

    setSaving(false);

    if (saveError) {
      showError(extractErrorMessage(saveError) || 'Failed to save reading');
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

    if (!session) return;

    setDeleting(true);

    const { error: deleteError, deletedItem } = await deleteSession(session.sessionId);

    setDeleting(false);

    if (deleteError) {
      showError(extractErrorMessage(deleteError) || 'Failed to delete reading');
      setConfirmDelete(false);
      return;
    }

    showWithUndo('Reading deleted', async () => {
      if (deletedItem) {
        // Re-add the session with its readings
        const { error: undoError } = await addSession({
          datetime: deletedItem.datetime,
          readings: deletedItem.readings.map((r) => ({
            systolic: r.systolic,
            diastolic: r.diastolic,
            arm: r.arm,
            pulse: r.pulse,
          })),
          notes: deletedItem.notes,
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
      <DialogHeader className="flex-shrink-0 px-5 py-4 border-b">
        <DialogTitle>{isEditing ? 'Edit Reading' : 'Add Blood Pressure Reading'}</DialogTitle>
      </DialogHeader>

      <div className="flex-1 flex flex-col overflow-hidden px-5 py-4 gap-4">
        {/* Date & Time */}
        <div className="space-y-2 flex-shrink-0">
          <Label htmlFor="datetime">Date & Time</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>

        {/* Blood Pressure */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          <Label className="flex-shrink-0">Blood Pressure (mmHg)</Label>
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto -mx-1">
            {bpRows.map((row, index) => (
              <BPRowInput
                key={index}
                ref={(el) => {
                  if (el) {
                    rowRefs.current.set(index, el);
                  } else {
                    rowRefs.current.delete(index);
                  }
                }}
                row={row}
                index={index}
                canRemove={bpRows.length > 1}
                onUpdate={updateBpRow}
                onRemove={removeBpRow}
                onAutoAdvance={handleAutoAdvance}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full flex-shrink-0"
            onClick={addBpRow}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          {validRows.length > 1 && (
            <div className="text-sm text-muted-foreground flex-shrink-0">
              Average: {avgSystolic}/{avgDiastolic} mmHg{avgPulse && ` • ${avgPulse} bpm`}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2 flex-shrink-0">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="e.g., Morning reading, after exercise..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <FormActions
        isEditing={isEditing}
        isValid={isValid}
        saving={saving}
        deleting={deleting}
        confirmDelete={confirmDelete}
        onSave={handleSave}
        onReset={handleReset}
        onDelete={handleDelete}
      />
    </>
  );
}

interface ReadingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: ReadingFormContentProps['session'];
}

export function ReadingForm({ open, onOpenChange, session = null }: ReadingFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col rounded-none sm:rounded-lg p-0 gap-0">
        <ReadingFormContent
          key={session?.sessionId || 'new'}
          session={session}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
