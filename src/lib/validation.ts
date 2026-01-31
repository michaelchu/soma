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

// BloodTestReportInput imported from @/types

/**
 * Validate a blood pressure reading
 */
export function validateBPReading(reading: BPReadingInput | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!reading) {
    return { valid: false, errors: ['Reading is required'] };
  }

  const { systolic, diastolic } = reading;

  if (typeof systolic !== 'number' || isNaN(systolic)) {
    errors.push('Systolic must be a number');
  } else if (systolic < BP_VALIDATION.SYSTOLIC_MIN || systolic > BP_VALIDATION.SYSTOLIC_MAX) {
    errors.push(
      `Systolic must be between ${BP_VALIDATION.SYSTOLIC_MIN} and ${BP_VALIDATION.SYSTOLIC_MAX}`
    );
  }

  if (typeof diastolic !== 'number' || isNaN(diastolic)) {
    errors.push('Diastolic must be a number');
  } else if (diastolic < BP_VALIDATION.DIASTOLIC_MIN || diastolic > BP_VALIDATION.DIASTOLIC_MAX) {
    errors.push(
      `Diastolic must be between ${BP_VALIDATION.DIASTOLIC_MIN} and ${BP_VALIDATION.DIASTOLIC_MAX}`
    );
  }

  // Validate pulse if provided
  if (reading.pulse !== null && reading.pulse !== undefined) {
    if (typeof reading.pulse !== 'number' || isNaN(reading.pulse)) {
      errors.push('Pulse must be a number');
    } else if (reading.pulse < BP_VALIDATION.PULSE_MIN || reading.pulse > BP_VALIDATION.PULSE_MAX) {
      errors.push(
        `Pulse must be between ${BP_VALIDATION.PULSE_MIN} and ${BP_VALIDATION.PULSE_MAX}`
      );
    }
  }

  // Only check systolic > diastolic if both values passed type validation
  if (
    typeof systolic === 'number' &&
    !isNaN(systolic) &&
    typeof diastolic === 'number' &&
    !isNaN(diastolic) &&
    systolic <= diastolic
  ) {
    errors.push('Systolic must be greater than diastolic');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a blood pressure session
 */
export function validateBPSession(session: BPSessionInput | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!session) {
    return { valid: false, errors: ['Session is required'] };
  }

  if (!session.datetime) {
    errors.push('Datetime is required');
  } else {
    const date = new Date(session.datetime);
    if (isNaN(date.getTime())) {
      errors.push('Invalid datetime format');
    }
  }

  if (!session.readings || !Array.isArray(session.readings)) {
    errors.push('Readings array is required');
  } else if (session.readings.length === 0) {
    errors.push('At least one reading is required');
  } else {
    session.readings.forEach((reading, index) => {
      const readingValidation = validateBPReading(reading);
      if (!readingValidation.valid) {
        errors.push(`Reading ${index + 1}: ${readingValidation.errors.join(', ')}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a blood test report
 */
export function validateBloodTestReport(
  report: BloodTestReportInput | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (!report) {
    return { valid: false, errors: ['Report is required'] };
  }

  if (!report.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(report.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }
  }

  if (report.metrics && typeof report.metrics === 'object') {
    Object.entries(report.metrics).forEach(([key, metric]) => {
      if (metric.value !== null && metric.value !== undefined) {
        if (typeof metric.value !== 'number' || isNaN(metric.value)) {
          errors.push(`Metric "${key}": value must be a number`);
        } else if (
          metric.value < BLOOD_TEST_VALIDATION.VALUE_MIN ||
          metric.value > BLOOD_TEST_VALIDATION.VALUE_MAX
        ) {
          errors.push(`Metric "${key}": value out of reasonable range`);
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an activity input
 */
export function validateActivity(activity: ActivityInput | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!activity) {
    return { valid: false, errors: ['Activity is required'] };
  }

  // Validate date
  if (!activity.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(activity.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }
  }

  // Validate time of day
  if (!activity.timeOfDay) {
    errors.push('Time of day is required');
  } else if (!ACTIVITY_VALIDATION.VALID_TIME_OF_DAY.includes(activity.timeOfDay)) {
    errors.push(`Time of day must be one of: ${ACTIVITY_VALIDATION.VALID_TIME_OF_DAY.join(', ')}`);
  }

  // Validate activity type
  if (!activity.activityType) {
    errors.push('Activity type is required');
  } else if (!ACTIVITY_VALIDATION.VALID_ACTIVITY_TYPES.includes(activity.activityType)) {
    errors.push(
      `Activity type must be one of: ${ACTIVITY_VALIDATION.VALID_ACTIVITY_TYPES.join(', ')}`
    );
  }

  // Validate duration
  if (typeof activity.durationMinutes !== 'number' || isNaN(activity.durationMinutes)) {
    errors.push('Duration must be a number');
  } else if (
    activity.durationMinutes < ACTIVITY_VALIDATION.DURATION_MIN ||
    activity.durationMinutes > ACTIVITY_VALIDATION.DURATION_MAX
  ) {
    errors.push(
      `Duration must be between ${ACTIVITY_VALIDATION.DURATION_MIN} and ${ACTIVITY_VALIDATION.DURATION_MAX} minutes`
    );
  }

  // Validate intensity
  if (typeof activity.intensity !== 'number' || isNaN(activity.intensity)) {
    errors.push('Intensity must be a number');
  } else if (
    activity.intensity < ACTIVITY_VALIDATION.INTENSITY_MIN ||
    activity.intensity > ACTIVITY_VALIDATION.INTENSITY_MAX
  ) {
    errors.push(
      `Intensity must be between ${ACTIVITY_VALIDATION.INTENSITY_MIN} and ${ACTIVITY_VALIDATION.INTENSITY_MAX}`
    );
  }

  // Validate notes length if provided
  if (activity.notes && activity.notes.length > ACTIVITY_VALIDATION.NOTES_MAX_LENGTH) {
    errors.push(`Notes must be ${ACTIVITY_VALIDATION.NOTES_MAX_LENGTH} characters or less`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a sleep entry input
 */
export function validateSleepEntry(entry: SleepEntryInput | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!entry) {
    return { valid: false, errors: ['Sleep entry is required'] };
  }

  // Validate date
  if (!entry.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(entry.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }
  }

  // Validate HRV values if provided
  if (entry.hrvLow !== null && entry.hrvLow !== undefined) {
    if (typeof entry.hrvLow !== 'number' || isNaN(entry.hrvLow)) {
      errors.push('HRV low must be a number');
    } else if (entry.hrvLow < SLEEP_VALIDATION.HRV_MIN || entry.hrvLow > SLEEP_VALIDATION.HRV_MAX) {
      errors.push(
        `HRV low must be between ${SLEEP_VALIDATION.HRV_MIN} and ${SLEEP_VALIDATION.HRV_MAX}`
      );
    }
  }

  if (entry.hrvHigh !== null && entry.hrvHigh !== undefined) {
    if (typeof entry.hrvHigh !== 'number' || isNaN(entry.hrvHigh)) {
      errors.push('HRV high must be a number');
    } else if (
      entry.hrvHigh < SLEEP_VALIDATION.HRV_MIN ||
      entry.hrvHigh > SLEEP_VALIDATION.HRV_MAX
    ) {
      errors.push(
        `HRV high must be between ${SLEEP_VALIDATION.HRV_MIN} and ${SLEEP_VALIDATION.HRV_MAX}`
      );
    }
  }

  // Validate resting HR if provided
  if (entry.restingHr !== null && entry.restingHr !== undefined) {
    if (typeof entry.restingHr !== 'number' || isNaN(entry.restingHr)) {
      errors.push('Resting HR must be a number');
    } else if (
      entry.restingHr < SLEEP_VALIDATION.HR_MIN ||
      entry.restingHr > SLEEP_VALIDATION.HR_MAX
    ) {
      errors.push(
        `Resting HR must be between ${SLEEP_VALIDATION.HR_MIN} and ${SLEEP_VALIDATION.HR_MAX}`
      );
    }
  }

  // Validate sleep stage percentages if provided
  const pctFields: Array<{ key: keyof SleepEntryInput; name: string }> = [
    { key: 'deepSleepPct', name: 'Deep sleep' },
    { key: 'remSleepPct', name: 'REM sleep' },
    { key: 'lightSleepPct', name: 'Light sleep' },
    { key: 'awakePct', name: 'Awake' },
  ];

  for (const { key, name } of pctFields) {
    const value = entry[key] as number | null | undefined;
    if (value !== null && value !== undefined) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${name} percentage must be a number`);
      } else if (value < SLEEP_VALIDATION.SLEEP_PCT_MIN || value > SLEEP_VALIDATION.SLEEP_PCT_MAX) {
        errors.push(`${name} percentage must be between 0 and 100`);
      }
    }
  }

  // Validate skin temperature if provided
  if (entry.skinTempAvg !== null && entry.skinTempAvg !== undefined) {
    if (typeof entry.skinTempAvg !== 'number' || isNaN(entry.skinTempAvg)) {
      errors.push('Skin temperature must be a number');
    } else if (
      entry.skinTempAvg < SLEEP_VALIDATION.SKIN_TEMP_MIN ||
      entry.skinTempAvg > SLEEP_VALIDATION.SKIN_TEMP_MAX
    ) {
      errors.push(
        `Skin temperature must be between ${SLEEP_VALIDATION.SKIN_TEMP_MIN} and ${SLEEP_VALIDATION.SKIN_TEMP_MAX}`
      );
    }
  }

  // Validate notes length if provided
  if (entry.notes && entry.notes.length > SLEEP_VALIDATION.NOTES_MAX_LENGTH) {
    errors.push(`Notes must be ${SLEEP_VALIDATION.NOTES_MAX_LENGTH} characters or less`);
  }

  return { valid: errors.length === 0, errors };
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
