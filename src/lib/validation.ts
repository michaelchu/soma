/**
 * Validation utilities for data integrity
 * Centralizes validation logic and constants for the application
 */

import type { BPSessionInput, BloodTestReportInput } from '@/types';
import type { ActivityInput, ActivityType, ActivityTimeOfDay } from '@/types/activity';
import type { SleepEntryInput } from '@/lib/db/sleep';

// Blood pressure validation constants
export const BP_VALIDATION = {
  SYSTOLIC_MIN: 60,
  SYSTOLIC_MAX: 250,
  DIASTOLIC_MIN: 40,
  DIASTOLIC_MAX: 150,
  PULSE_MIN: 30,
  PULSE_MAX: 220,
} as const;

// Blood test validation constants
export const BLOOD_TEST_VALIDATION = {
  VALUE_MIN: 0,
  VALUE_MAX: 100000,
} as const;

// Activity validation constants
export const ACTIVITY_VALIDATION = {
  DURATION_MIN: 1,
  DURATION_MAX: 480, // 8 hours max
  INTENSITY_MIN: 1,
  INTENSITY_MAX: 5,
  NOTES_MAX_LENGTH: 500,
  VALID_ACTIVITY_TYPES: ['walking', 'badminton', 'pickleball', 'other'] as ActivityType[],
  VALID_TIME_OF_DAY: ['morning', 'afternoon', 'evening', 'late_evening'] as ActivityTimeOfDay[],
} as const;

// Sleep validation constants
export const SLEEP_VALIDATION = {
  HRV_MIN: 1,
  HRV_MAX: 500,
  HR_MIN: 20,
  HR_MAX: 200,
  SLEEP_PCT_MIN: 0,
  SLEEP_PCT_MAX: 100,
  SKIN_TEMP_MIN: 20,
  SKIN_TEMP_MAX: 45,
  NOTES_MAX_LENGTH: 500,
} as const;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface BPReadingInput {
  systolic: number;
  diastolic: number;
  pulse?: number | null;
}

// ============================================================================
// Validator Helpers - Functional building blocks for validation
// ============================================================================

type Validator<T> = (value: T) => string | null;

/**
 * Validates a required number is within a range
 */
const validateNumberInRange =
  (name: string, min: number, max: number): Validator<number> =>
  (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${name} must be a number`;
    }
    if (value < min || value > max) {
      return `${name} must be between ${min} and ${max}`;
    }
    return null;
  };

/**
 * Validates an optional number is within a range (skips null/undefined)
 */
const validateOptionalNumberInRange =
  (name: string, min: number, max: number): Validator<number | null | undefined> =>
  (value) => {
    if (value === null || value === undefined) return null;
    return validateNumberInRange(name, min, max)(value);
  };

/**
 * Validates a required date string
 */
const validateDateString =
  (name: string): Validator<string | null | undefined> =>
  (value) => {
    if (!value) return `${name} is required`;
    if (isNaN(new Date(value).getTime())) return `Invalid ${name.toLowerCase()} format`;
    return null;
  };

/**
 * Validates a value is in an allowed list
 */
const validateEnum =
  <T>(name: string, allowed: readonly T[]): Validator<T | null | undefined> =>
  (value) => {
    if (!value) return `${name} is required`;
    if (!allowed.includes(value)) {
      return `${name} must be one of: ${allowed.join(', ')}`;
    }
    return null;
  };

/**
 * Validates optional string max length
 */
const validateMaxLength =
  (name: string, maxLength: number): Validator<string | null | undefined> =>
  (value) => {
    if (value && value.length > maxLength) {
      return `${name} must be ${maxLength} characters or less`;
    }
    return null;
  };

/**
 * Creates a ValidationResult from an array of errors
 */
const toResult = (errors: string[]): ValidationResult => ({
  valid: errors.length === 0,
  errors,
});

// ============================================================================
// Domain Validators
// ============================================================================

/**
 * Validate a blood pressure reading
 */
export function validateBPReading(reading: BPReadingInput | null | undefined): ValidationResult {
  if (!reading) {
    return { valid: false, errors: ['Reading is required'] };
  }

  const { systolic, diastolic, pulse } = reading;

  const fieldValidators: Array<{ value: number | null | undefined; validator: Validator<number> }> =
    [
      {
        value: systolic,
        validator: validateNumberInRange(
          'Systolic',
          BP_VALIDATION.SYSTOLIC_MIN,
          BP_VALIDATION.SYSTOLIC_MAX
        ),
      },
      {
        value: diastolic,
        validator: validateNumberInRange(
          'Diastolic',
          BP_VALIDATION.DIASTOLIC_MIN,
          BP_VALIDATION.DIASTOLIC_MAX
        ),
      },
    ];

  const errors = fieldValidators
    .map(({ value, validator }) => validator(value as number))
    .filter((error): error is string => error !== null);

  // Validate optional pulse
  const pulseError = validateOptionalNumberInRange(
    'Pulse',
    BP_VALIDATION.PULSE_MIN,
    BP_VALIDATION.PULSE_MAX
  )(pulse);
  if (pulseError) errors.push(pulseError);

  // Cross-field validation: systolic must be greater than diastolic
  const bothValid =
    typeof systolic === 'number' &&
    !isNaN(systolic) &&
    typeof diastolic === 'number' &&
    !isNaN(diastolic);

  if (bothValid && systolic <= diastolic) {
    errors.push('Systolic must be greater than diastolic');
  }

  return toResult(errors);
}

/**
 * Validate a blood pressure session
 */
export function validateBPSession(session: BPSessionInput | null | undefined): ValidationResult {
  if (!session) {
    return { valid: false, errors: ['Session is required'] };
  }

  const errors: string[] = [];

  // Validate datetime
  const dateError = validateDateString('Datetime')(session.datetime);
  if (dateError) errors.push(dateError);

  // Validate readings array
  if (!session.readings || !Array.isArray(session.readings)) {
    errors.push('Readings array is required');
  } else if (session.readings.length === 0) {
    errors.push('At least one reading is required');
  } else {
    // Validate each reading and collect errors with index
    const readingErrors = session.readings
      .map((reading, index) => {
        const result = validateBPReading(reading);
        return result.valid ? null : `Reading ${index + 1}: ${result.errors.join(', ')}`;
      })
      .filter((error): error is string => error !== null);

    errors.push(...readingErrors);
  }

  return toResult(errors);
}

/**
 * Validate a blood test report
 */
export function validateBloodTestReport(
  report: BloodTestReportInput | null | undefined
): ValidationResult {
  if (!report) {
    return { valid: false, errors: ['Report is required'] };
  }

  const errors: string[] = [];

  // Validate date
  const dateError = validateDateString('Date')(report.date);
  if (dateError) errors.push(dateError);

  // Validate metrics using functional approach
  if (report.metrics && typeof report.metrics === 'object') {
    const metricErrors = Object.entries(report.metrics)
      .map(([key, metric]) => {
        if (metric.value === null || metric.value === undefined) return null;

        if (typeof metric.value !== 'number' || isNaN(metric.value)) {
          return `Metric "${key}": value must be a number`;
        }
        if (
          metric.value < BLOOD_TEST_VALIDATION.VALUE_MIN ||
          metric.value > BLOOD_TEST_VALIDATION.VALUE_MAX
        ) {
          return `Metric "${key}": value out of reasonable range`;
        }
        return null;
      })
      .filter((error): error is string => error !== null);

    errors.push(...metricErrors);
  }

  return toResult(errors);
}

/**
 * Validate an activity input
 */
export function validateActivity(activity: ActivityInput | null | undefined): ValidationResult {
  if (!activity) {
    return { valid: false, errors: ['Activity is required'] };
  }

  // Define all validations as an array of [value, validator] pairs
  const validations: Array<[unknown, Validator<unknown>]> = [
    [activity.date, validateDateString('Date') as Validator<unknown>],
    [
      activity.timeOfDay,
      validateEnum('Time of day', ACTIVITY_VALIDATION.VALID_TIME_OF_DAY) as Validator<unknown>,
    ],
    [
      activity.activityType,
      validateEnum('Activity type', ACTIVITY_VALIDATION.VALID_ACTIVITY_TYPES) as Validator<unknown>,
    ],
    [
      activity.durationMinutes,
      validateNumberInRange(
        'Duration',
        ACTIVITY_VALIDATION.DURATION_MIN,
        ACTIVITY_VALIDATION.DURATION_MAX
      ) as Validator<unknown>,
    ],
    [
      activity.intensity,
      validateNumberInRange(
        'Intensity',
        ACTIVITY_VALIDATION.INTENSITY_MIN,
        ACTIVITY_VALIDATION.INTENSITY_MAX
      ) as Validator<unknown>,
    ],
    [
      activity.notes,
      validateMaxLength('Notes', ACTIVITY_VALIDATION.NOTES_MAX_LENGTH) as Validator<unknown>,
    ],
  ];

  const errors = validations
    .map(([value, validator]) => validator(value))
    .filter((error): error is string => error !== null);

  return toResult(errors);
}

/**
 * Validate a sleep entry input
 */
export function validateSleepEntry(entry: SleepEntryInput | null | undefined): ValidationResult {
  if (!entry) {
    return { valid: false, errors: ['Sleep entry is required'] };
  }

  // Define optional numeric field validations
  const numericValidations: Array<{
    value: number | null | undefined;
    name: string;
    min: number;
    max: number;
  }> = [
    {
      value: entry.hrvLow,
      name: 'HRV low',
      min: SLEEP_VALIDATION.HRV_MIN,
      max: SLEEP_VALIDATION.HRV_MAX,
    },
    {
      value: entry.hrvHigh,
      name: 'HRV high',
      min: SLEEP_VALIDATION.HRV_MIN,
      max: SLEEP_VALIDATION.HRV_MAX,
    },
    {
      value: entry.restingHr,
      name: 'Resting HR',
      min: SLEEP_VALIDATION.HR_MIN,
      max: SLEEP_VALIDATION.HR_MAX,
    },
    {
      value: entry.deepSleepPct,
      name: 'Deep sleep percentage',
      min: SLEEP_VALIDATION.SLEEP_PCT_MIN,
      max: SLEEP_VALIDATION.SLEEP_PCT_MAX,
    },
    {
      value: entry.remSleepPct,
      name: 'REM sleep percentage',
      min: SLEEP_VALIDATION.SLEEP_PCT_MIN,
      max: SLEEP_VALIDATION.SLEEP_PCT_MAX,
    },
    {
      value: entry.lightSleepPct,
      name: 'Light sleep percentage',
      min: SLEEP_VALIDATION.SLEEP_PCT_MIN,
      max: SLEEP_VALIDATION.SLEEP_PCT_MAX,
    },
    {
      value: entry.awakePct,
      name: 'Awake percentage',
      min: SLEEP_VALIDATION.SLEEP_PCT_MIN,
      max: SLEEP_VALIDATION.SLEEP_PCT_MAX,
    },
    {
      value: entry.skinTempAvg,
      name: 'Skin temperature',
      min: SLEEP_VALIDATION.SKIN_TEMP_MIN,
      max: SLEEP_VALIDATION.SKIN_TEMP_MAX,
    },
  ];

  // Validate date
  const dateError = validateDateString('Date')(entry.date);

  // Validate all optional numeric fields
  const numericErrors = numericValidations
    .map(({ value, name, min, max }) => validateOptionalNumberInRange(name, min, max)(value))
    .filter((error): error is string => error !== null);

  // Validate notes length
  const notesError = validateMaxLength('Notes', SLEEP_VALIDATION.NOTES_MAX_LENGTH)(entry.notes);

  // Collect all errors
  const errors = [dateError, ...numericErrors, notesError].filter(
    (error): error is string => error !== null
  );

  return toResult(errors);
}

/**
 * Sanitize a string for safe storage and display
 * Removes potentially dangerous characters while preserving readability
 */
export function sanitizeString(str: string | null | undefined, maxLength = 1000): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, ''); // Remove any remaining angle brackets
}
