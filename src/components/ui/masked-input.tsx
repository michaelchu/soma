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
 * Formats time input with smart colon insertion
 * Only auto-inserts colon when seconds are valid (≤59), otherwise waits for more input
 * "4" → "4", "43" → "43", "431" → "4:31", "185" → "185", "1854" → "18:54"
 * Caps seconds at 59, max format is mmm:ss (999:59)
 */
const formatTimeValue = (val: string): string => {
  // Strip everything except digits, limit to 5 digits (mmm + ss)
  const digits = val.replace(/\D/g, '').slice(0, 5);

  // Only auto-insert colon when we have 3+ digits
  if (digits.length >= 3) {
    const mins = digits.slice(0, -2);
    const secsRaw = parseInt(digits.slice(-2), 10);

    // If seconds > 59, don't format yet - user is still typing (e.g., "185" for "18:54")
    // Exception: at 5 digits we must format, so cap at 59
    if (secsRaw > 59 && digits.length < 5) {
      return digits;
    }

    const secs = Math.min(secsRaw, 59);
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

// Numeric input with digit limit and optional max value capping
interface NumericInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Maximum number of digits allowed */
  maxDigits?: number;
  /** Maximum value (will cap input at this value) */
  maxValue?: number;
  /** Minimum value (for display purposes, not enforced during typing) */
  minValue?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, maxDigits = 3, maxValue, minValue, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip non-digits and limit length
      let digits = e.target.value.replace(/\D/g, '').slice(0, maxDigits);

      // Cap at maxValue if specified
      if (maxValue !== undefined && digits.length > 0) {
        const num = parseInt(digits, 10);
        if (num > maxValue) {
          digits = maxValue.toString();
        }
      }

      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: digits },
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
        min={minValue}
        max={maxValue}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';

// Decimal input with auto-decimal insertion (XX.X format)
// Used for values like temperature (34.5°C)
interface DecimalInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Maximum value (will cap input at this value) */
  maxValue?: number;
  /** Minimum value (for display purposes) */
  minValue?: number;
  /** Number of digits before decimal (default 2) */
  wholeDigits?: number;
  /** Number of digits after decimal (default 1) */
  decimalDigits?: number;
}

/**
 * Formats decimal input: inserts decimal when enough digits are entered
 * With wholeDigits=2, decimalDigits=1: "345" → "34.5", "35" → "35"
 */
const formatDecimalValue = (
  val: string,
  wholeDigits: number,
  decimalDigits: number,
  maxValue?: number
): string => {
  // Strip everything except digits
  const totalDigits = wholeDigits + decimalDigits;
  const digits = val.replace(/\D/g, '').slice(0, totalDigits);

  // Insert decimal when we have more than wholeDigits
  if (digits.length > wholeDigits) {
    const whole = digits.slice(0, wholeDigits);
    const decimal = digits.slice(wholeDigits);
    const formatted = `${whole}.${decimal}`;

    // Cap at maxValue if specified
    if (maxValue !== undefined) {
      const num = parseFloat(formatted);
      if (num > maxValue) {
        return maxValue.toFixed(decimalDigits);
      }
    }

    return formatted;
  }

  return digits;
};

const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  (
    {
      className,
      value,
      onChange,
      maxValue,
      minValue,
      wholeDigits = 2,
      decimalDigits = 1,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDecimalValue(e.target.value, wholeDigits, decimalDigits, maxValue);
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
        inputMode="decimal"
        className={cn(inputClassName, className)}
        value={value}
        onChange={handleChange}
        min={minValue}
        max={maxValue}
        {...props}
      />
    );
  }
);
DecimalInput.displayName = 'DecimalInput';

// Duration input for H:mm:ss format (activity duration)
// Auto-inserts colons as digits are typed, validates mm and ss are ≤59
interface DurationInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Formats duration input with smart colon insertion for H:mm:ss format
 * 3-4 digits → mm:ss (e.g., "4500" → "45:00")
 * 5-6 digits → H:mm:ss or HH:mm:ss (e.g., "13000" → "1:30:00")
 * Waits to format if mm or ss would be invalid (>59)
 */
const formatDurationValue = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 6); // Max 6 digits (HH:mm:ss)

  // 5+ digits: try H:mm:ss or HH:mm:ss format
  if (digits.length >= 5) {
    const secsRaw = parseInt(digits.slice(-2), 10);
    const minsRaw = parseInt(digits.slice(-4, -2), 10);
    const hours = digits.slice(0, -4);

    // If secs or mins invalid and not at max length, wait for more input
    if ((secsRaw > 59 || minsRaw > 59) && digits.length < 6) {
      return digits;
    }

    const secs = Math.min(secsRaw, 59);
    const mins = Math.min(minsRaw, 59);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 3-4 digits: try mm:ss format
  if (digits.length >= 3) {
    const secsRaw = parseInt(digits.slice(-2), 10);
    const mins = digits.slice(0, -2);

    // If secs invalid and could still be typing more (for H:mm:ss), wait
    if (secsRaw > 59 && digits.length < 4) {
      return digits;
    }

    // At 4 digits, if we have invalid secs, user might be typing H:mm:ss
    // e.g., "1367" could be on the way to "13:06:47" not "13:67"
    if (secsRaw > 59 && digits.length === 4) {
      return digits;
    }

    const secs = Math.min(secsRaw, 59);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return digits;
};

/**
 * Parses a duration string (mm:ss or H:mm:ss) to total minutes (rounded)
 * Returns null for invalid input
 */
export const parseDurationToMinutes = (val: string): number | null => {
  if (!val.trim()) return null;

  // Try H:mm:ss format first
  const hmsMatch = val.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const mins = parseInt(hmsMatch[2], 10);
    const secs = parseInt(hmsMatch[3], 10);
    return Math.round(hours * 60 + mins + secs / 60);
  }

  // Try mm:ss format
  const msMatch = val.match(/^(\d+):(\d{1,2})$/);
  if (msMatch) {
    const mins = parseInt(msMatch[1], 10);
    const secs = parseInt(msMatch[2], 10);
    return Math.round(mins + secs / 60);
  }

  // Plain number (minutes)
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
};

/**
 * Converts total minutes to H:mm:ss or mm:ss format for display
 */
export const minutesToDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:00`;
  }
  return `${mins}:00`;
};

const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDurationValue(e.target.value);
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
DurationInput.displayName = 'DurationInput';

export { MaskedInput, TimeInput, NumericInput, DecimalInput, DurationInput };
export type { MaskedInputProps, TimeInputProps, NumericInputProps, DecimalInputProps, DurationInputProps };
