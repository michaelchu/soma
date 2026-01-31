/**
 * Validation utilities using Zod
 * Centralizes validation logic and constants for the application
 */

import { z } from 'zod';
import type { ActivityType, ActivityTimeOfDay } from '@/types/activity';

// ============================================================================
// Validation Constants (kept for UI components that reference ranges)
// ============================================================================

export const BP_VALIDATION = {
  SYSTOLIC_MIN: 60,
  SYSTOLIC_MAX: 250,
  DIASTOLIC_MIN: 40,
  DIASTOLIC_MAX: 150,
  PULSE_MIN: 30,
  PULSE_MAX: 220,
} as const;

export const BLOOD_TEST_VALIDATION = {
  VALUE_MIN: 0,
  VALUE_MAX: 100000,
} as const;

export const ACTIVITY_VALIDATION = {
  DURATION_MIN: 1,
  DURATION_MAX: 480,
  INTENSITY_MIN: 1,
  INTENSITY_MAX: 5,
  NOTES_MAX_LENGTH: 500,
  VALID_ACTIVITY_TYPES: ['walking', 'badminton', 'pickleball', 'other'] as ActivityType[],
  VALID_TIME_OF_DAY: ['morning', 'afternoon', 'evening', 'late_evening'] as ActivityTimeOfDay[],
} as const;

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

// ============================================================================
// Shared Schema Helpers
// ============================================================================

const optionalNumber = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().optional();

const optionalPercentage = () => optionalNumber(0, 100);

const requiredDateString = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: `Invalid ${fieldName.toLowerCase()} format`,
    });

const notesField = (maxLength: number) => z.string().max(maxLength).nullable().optional();

// ============================================================================
// Blood Pressure Schemas
// ============================================================================

export const bpReadingSchema = z
  .object({
    systolic: z
      .number({ message: 'Systolic must be a number' })
      .min(
        BP_VALIDATION.SYSTOLIC_MIN,
        `Systolic must be between ${BP_VALIDATION.SYSTOLIC_MIN} and ${BP_VALIDATION.SYSTOLIC_MAX}`
      )
      .max(
        BP_VALIDATION.SYSTOLIC_MAX,
        `Systolic must be between ${BP_VALIDATION.SYSTOLIC_MIN} and ${BP_VALIDATION.SYSTOLIC_MAX}`
      ),
    diastolic: z
      .number({ message: 'Diastolic must be a number' })
      .min(
        BP_VALIDATION.DIASTOLIC_MIN,
        `Diastolic must be between ${BP_VALIDATION.DIASTOLIC_MIN} and ${BP_VALIDATION.DIASTOLIC_MAX}`
      )
      .max(
        BP_VALIDATION.DIASTOLIC_MAX,
        `Diastolic must be between ${BP_VALIDATION.DIASTOLIC_MIN} and ${BP_VALIDATION.DIASTOLIC_MAX}`
      ),
    pulse: z
      .number({ message: 'Pulse must be a number' })
      .min(
        BP_VALIDATION.PULSE_MIN,
        `Pulse must be between ${BP_VALIDATION.PULSE_MIN} and ${BP_VALIDATION.PULSE_MAX}`
      )
      .max(
        BP_VALIDATION.PULSE_MAX,
        `Pulse must be between ${BP_VALIDATION.PULSE_MIN} and ${BP_VALIDATION.PULSE_MAX}`
      )
      .nullable()
      .optional(),
    arm: z.enum(['L', 'R']).nullable().optional(),
  })
  .refine((data) => data.systolic > data.diastolic, {
    message: 'Systolic must be greater than diastolic',
    path: ['systolic'],
  });

export const bpSessionSchema = z.object({
  datetime: requiredDateString('Datetime'),
  readings: z
    .array(bpReadingSchema, { message: 'Readings array is required' })
    .min(1, 'At least one reading is required'),
  notes: notesField(500),
});

// ============================================================================
// Blood Test Schemas
// ============================================================================

const metricValueSchema = z.object({
  value: z.number({ message: 'value must be a number' }),
  unit: z.string(),
  reference: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      raw: z.string().optional(),
    })
    .optional(),
});

export const bloodTestReportSchema = z.object({
  date: requiredDateString('Date'),
  orderNumber: z.string().optional(),
  orderedBy: z.string().optional(),
  notes: z.string().optional(),
  metrics: z.record(
    z.string(),
    metricValueSchema.refine(
      (m) =>
        m.value >= BLOOD_TEST_VALIDATION.VALUE_MIN && m.value <= BLOOD_TEST_VALIDATION.VALUE_MAX,
      { message: 'value out of reasonable range' }
    )
  ),
});

// ============================================================================
// Activity Schemas
// ============================================================================

export const activityTypeSchema = z.enum(['walking', 'badminton', 'pickleball', 'other']);
export const timeOfDaySchema = z.enum(['morning', 'afternoon', 'evening', 'late_evening']);

const requiredActivityType = z
  .preprocess((val) => (val === '' ? undefined : val), activityTypeSchema)
  .refine((val) => val !== undefined, { message: 'Activity type is required' });

const requiredTimeOfDay = z
  .preprocess((val) => (val === '' ? undefined : val), timeOfDaySchema)
  .refine((val) => val !== undefined, { message: 'Time of day is required' });

export const activitySchema = z.object({
  date: requiredDateString('Date'),
  timeOfDay: requiredTimeOfDay,
  activityType: requiredActivityType,
  durationMinutes: z
    .number({ message: 'Duration must be a number' })
    .min(ACTIVITY_VALIDATION.DURATION_MIN)
    .max(ACTIVITY_VALIDATION.DURATION_MAX),
  intensity: z
    .number({ message: 'Intensity must be a number' })
    .min(ACTIVITY_VALIDATION.INTENSITY_MIN)
    .max(ACTIVITY_VALIDATION.INTENSITY_MAX),
  notes: notesField(ACTIVITY_VALIDATION.NOTES_MAX_LENGTH),
});

// ============================================================================
// Sleep Schemas
// ============================================================================

export const sleepEntrySchema = z.object({
  date: requiredDateString('Date'),
  timezone: z.string().nullable().optional(),
  totalSleepMinutes: z.number().positive().nullable().optional(),
  sleepStart: z.string().nullable().optional(),
  sleepEnd: z.string().nullable().optional(),
  hrvLow: optionalNumber(SLEEP_VALIDATION.HRV_MIN, SLEEP_VALIDATION.HRV_MAX),
  hrvHigh: optionalNumber(SLEEP_VALIDATION.HRV_MIN, SLEEP_VALIDATION.HRV_MAX),
  restingHr: optionalNumber(SLEEP_VALIDATION.HR_MIN, SLEEP_VALIDATION.HR_MAX),
  lowestHrTime: z.string().nullable().optional(),
  hrDropMinutes: z.number().nullable().optional(),
  deepSleepPct: optionalPercentage(),
  remSleepPct: optionalPercentage(),
  lightSleepPct: optionalPercentage(),
  awakePct: optionalPercentage(),
  skinTempAvg: optionalNumber(SLEEP_VALIDATION.SKIN_TEMP_MIN, SLEEP_VALIDATION.SKIN_TEMP_MAX),
  sleepCyclesFull: z.number().int().nonnegative().nullable().optional(),
  sleepCyclesPartial: z.number().int().nonnegative().nullable().optional(),
  movementCount: z.number().int().nonnegative().nullable().optional(),
  notes: notesField(SLEEP_VALIDATION.NOTES_MAX_LENGTH),
});

// ============================================================================
// Type Inference (use these instead of manual interface definitions)
// ============================================================================

export type BPReadingInput = z.infer<typeof bpReadingSchema>;
export type BPSessionInput = z.infer<typeof bpSessionSchema>;
export type BloodTestReportInput = z.infer<typeof bloodTestReportSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type SleepEntryInput = z.infer<typeof sleepEntrySchema>;

// ============================================================================
// Validation Result Type (for backward compatibility)
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Convert Zod errors to flat array of error messages
 */
function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    // For nested paths like readings.0.systolic, format as "Reading 1: message"
    if (issue.path.length > 1 && issue.path[0] === 'readings') {
      const readingIndex = Number(issue.path[1]) + 1;
      return `Reading ${readingIndex}: ${issue.message}`;
    }
    return issue.message;
  });
}

/**
 * Generic validation wrapper that returns ValidationResult
 */
function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: formatZodErrors(result.error) };
}

// ============================================================================
// Exported Validation Functions (backward compatible API)
// ============================================================================

export function validateBPReading(reading: unknown): ValidationResult {
  if (!reading) {
    return { valid: false, errors: ['Reading is required'] };
  }
  return validate(bpReadingSchema, reading);
}

export function validateBPSession(session: unknown): ValidationResult {
  if (!session) {
    return { valid: false, errors: ['Session is required'] };
  }
  return validate(bpSessionSchema, session);
}

export function validateBloodTestReport(report: unknown): ValidationResult {
  if (!report) {
    return { valid: false, errors: ['Report is required'] };
  }
  return validate(bloodTestReportSchema, report);
}

export function validateActivity(activity: unknown): ValidationResult {
  if (!activity) {
    return { valid: false, errors: ['Activity is required'] };
  }
  return validate(activitySchema, activity);
}

export function validateSleepEntry(entry: unknown): ValidationResult {
  if (!entry) {
    return { valid: false, errors: ['Sleep entry is required'] };
  }
  return validate(sleepEntrySchema, entry);
}

// ============================================================================
// Sanitization (kept as-is, not part of Zod)
// ============================================================================

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
