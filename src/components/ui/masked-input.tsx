'use client';

import * as React from 'react';
import { InputMask, type InputMaskProps, type Track } from '@react-input/mask';

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

// Pre-configured time input for mm:ss format (up to 999:59)
// Tracks input to cap seconds at 59
interface TimeInputProps extends Omit<MaskedInputProps, 'mask' | 'replacement' | 'track'> {
  /** Whether to show the mask placeholder (e.g., "___:__") */
  showMask?: boolean;
}

const timeTrack: Track = ({ inputType, data, selectionStart, value }) => {
  if (inputType !== 'insert' || !data) return data;

  // Get the current value with the new input applied
  const newValue = value.slice(0, selectionStart) + data + value.slice(selectionStart);

  // Check if we're entering seconds (after the colon)
  const colonIndex = newValue.indexOf(':');
  if (colonIndex !== -1 && selectionStart >= colonIndex) {
    // Extract what would be the seconds portion
    const afterColon = newValue.slice(colonIndex + 1).replace(/\D/g, '');
    if (afterColon.length >= 2) {
      const seconds = parseInt(afterColon.slice(0, 2), 10);
      if (seconds > 59) {
        // Cap at 59 - replace the data with capped value
        return data === afterColon[1] ? '9' : data;
      }
    }
  }

  return data;
};

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ showMask = false, ...props }, ref) => {
    return (
      <MaskedInput
        ref={ref}
        mask="___:__"
        replacement={{ _: /\d/ }}
        showMask={showMask}
        track={timeTrack}
        inputMode="numeric"
        {...props}
      />
    );
  }
);
TimeInput.displayName = 'TimeInput';

export { MaskedInput, TimeInput };
export type { MaskedInputProps, TimeInputProps };
