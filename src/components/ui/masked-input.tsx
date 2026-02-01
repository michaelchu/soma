'use client';

import * as React from 'react';
import { InputMask, type InputMaskProps } from '@react-input/mask';

import { cn } from '@/lib/utils';

// Base input styling from shadcn Input component
const inputClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

interface MaskedInputProps extends Omit<InputMaskProps, 'component' | 'mask' | 'replacement'> {
  mask: string;
  replacement: string | Record<string, RegExp>;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, replacement, ...props }, ref) => {
    return (
      <InputMask
        ref={ref}
        mask={mask}
        replacement={replacement}
        className={cn(inputClassName, className)}
        {...props}
      />
    );
  }
);
MaskedInput.displayName = 'MaskedInput';

// Time input for mm:ss format with variable-length minutes (1-999 minutes)
// Auto-inserts colon when 3+ digits typed, caps seconds at 59
interface TimeInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Formats time input: inserts colon only when 3+ digits are entered
 * "4" → "4", "43" → "43", "431" → "4:31", "5403" → "54:03"
 * Caps seconds at 59, max format is mmm:ss (5 digits total)
 */
const formatTimeValue = (val: string): string => {
  // Strip everything except digits, limit to 5 digits (mmm + ss)
  const digits = val.replace(/\D/g, '').slice(0, 5);

  // Only insert colon when we have 3+ digits (last 2 are seconds)
  if (digits.length >= 3) {
    const mins = digits.slice(0, -2);
    let secs = parseInt(digits.slice(-2), 10);
    // Cap seconds at 59
    if (secs > 59) secs = 59;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return digits;
};

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTimeValue(e.target.value);
      // Create a synthetic event with the formatted value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: formatted },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(inputClassName, className)}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
TimeInput.displayName = 'TimeInput';

export { MaskedInput, TimeInput };
export type { MaskedInputProps, TimeInputProps };
