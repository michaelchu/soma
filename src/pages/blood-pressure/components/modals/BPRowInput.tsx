import { forwardRef, useImperativeHandle, useRef } from 'react';
import { NumericInput } from '@/components/ui/masked-input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BP_VALIDATION } from '@/lib/validation';
import { ArmSelector } from './ArmSelector';
import type { Arm } from '@/types/bloodPressure';

export interface BPRowData {
  systolic: string;
  diastolic: string;
  arm: Arm;
  pulse: string;
}

export interface BPRowInputRef {
  focusSystolic: () => void;
  focusDiastolic: () => void;
  focusPulse: () => void;
}

interface BPRowInputProps {
  row: BPRowData;
  index: number;
  canRemove: boolean;
  onUpdate: (index: number, field: keyof BPRowData, value: string | Arm) => void;
  onRemove: (index: number) => void;
  onAutoAdvance?: (index: number, nextField: 'diastolic' | 'pulse' | 'nextRow') => void;
}

// Check if a value is likely complete based on field type and value
function isValueComplete(field: 'systolic' | 'diastolic' | 'pulse', value: string): boolean {
  if (!value) return false;
  const num = parseInt(value);

  if (field === 'systolic') {
    // Systolic is typically 90-200, so 3 digits means complete
    return value.length === 3;
  } else if (field === 'diastolic') {
    // Diastolic is typically 60-120
    // If 3 digits, definitely complete
    // If 2 digits and >= 60, likely complete (values like 60-99)
    if (value.length === 3) return true;
    if (value.length === 2 && num >= 60) return true;
    return false;
  } else if (field === 'pulse') {
    // Pulse is typically 50-120
    // If 3 digits, definitely complete
    // If 2 digits and >= 50, likely complete
    if (value.length === 3) return true;
    if (value.length === 2 && num >= 50) return true;
    return false;
  }
  return false;
}

export const BPRowInput = forwardRef<BPRowInputRef, BPRowInputProps>(
  ({ row, index, canRemove, onUpdate, onRemove, onAutoAdvance }, ref) => {
    const systolicRef = useRef<HTMLInputElement>(null);
    const diastolicRef = useRef<HTMLInputElement>(null);
    const pulseRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusSystolic: () => systolicRef.current?.focus(),
      focusDiastolic: () => diastolicRef.current?.focus(),
      focusPulse: () => pulseRef.current?.focus(),
    }));

    const handleChange = (field: 'systolic' | 'diastolic' | 'pulse', value: string) => {
      onUpdate(index, field, value);

      // Auto-focus to next field when value appears complete
      if (isValueComplete(field, value) && onAutoAdvance) {
        if (field === 'systolic') {
          diastolicRef.current?.focus();
        } else if (field === 'diastolic') {
          pulseRef.current?.focus();
        } else if (field === 'pulse') {
          onAutoAdvance(index, 'nextRow');
        }
      }
    };

    return (
      <div className="flex items-center gap-2 px-1 py-1">
        <NumericInput
          ref={systolicRef}
          placeholder="Sys"
          value={row.systolic}
          onChange={(e) => handleChange('systolic', e.target.value)}
          maxDigits={3}
          maxValue={BP_VALIDATION.SYSTOLIC_MAX}
          className="flex-1 min-w-0 text-center"
        />
        <span className="text-xl text-muted-foreground">/</span>
        <NumericInput
          ref={diastolicRef}
          placeholder="Dia"
          value={row.diastolic}
          onChange={(e) => handleChange('diastolic', e.target.value)}
          maxDigits={3}
          maxValue={BP_VALIDATION.DIASTOLIC_MAX}
          className="flex-1 min-w-0 text-center"
        />
        <NumericInput
          ref={pulseRef}
          placeholder="Pulse"
          value={row.pulse}
          onChange={(e) => handleChange('pulse', e.target.value)}
          maxDigits={3}
          maxValue={BP_VALIDATION.PULSE_MAX}
          className="flex-1 min-w-0 text-center"
        />
        <ArmSelector value={row.arm} onChange={(arm) => onUpdate(index, 'arm', arm)} />
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onRemove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

BPRowInput.displayName = 'BPRowInput';
