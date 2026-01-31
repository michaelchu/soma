import { describe, it, expect } from 'vitest';
import {
  validateBPReading,
  validateBPSession,
  validateBloodTestReport,
  validateActivity,
  sanitizeString,
  BP_VALIDATION,
  ACTIVITY_VALIDATION,
  BLOOD_TEST_VALIDATION,
} from './validation';

describe('validation', () => {
  describe('validateBPReading', () => {
    it('returns invalid for null/undefined reading', () => {
      expect(validateBPReading(null).valid).toBe(false);
      expect(validateBPReading(null).errors).toContain('Reading is required');
      expect(validateBPReading(undefined).valid).toBe(false);
    });

    it('validates a valid reading with optional pulse', () => {
      expect(validateBPReading({ systolic: 120, diastolic: 80 }).valid).toBe(true);
      expect(validateBPReading({ systolic: 120, diastolic: 80, pulse: 72 }).valid).toBe(true);
      expect(validateBPReading({ systolic: 120, diastolic: 80, pulse: null }).valid).toBe(true);
    });

    describe('systolic validation', () => {
      it('rejects invalid systolic values', () => {
        expect(
          validateBPReading({ systolic: 'invalid' as unknown as number, diastolic: 80 }).errors
        ).toContain('Systolic must be a number');
        expect(validateBPReading({ systolic: NaN, diastolic: 80 }).errors).toContain(
          'Systolic must be a number'
        );
      });

      it('enforces systolic range boundaries', () => {
        expect(
          validateBPReading({ systolic: BP_VALIDATION.SYSTOLIC_MIN - 1, diastolic: 40 }).valid
        ).toBe(false);
        expect(
          validateBPReading({ systolic: BP_VALIDATION.SYSTOLIC_MAX + 1, diastolic: 80 }).valid
        ).toBe(false);
        // Boundaries should be valid
        expect(
          validateBPReading({
            systolic: BP_VALIDATION.SYSTOLIC_MIN,
            diastolic: BP_VALIDATION.DIASTOLIC_MIN,
          }).valid
        ).toBe(true);
        expect(
          validateBPReading({ systolic: BP_VALIDATION.SYSTOLIC_MAX, diastolic: 80 }).valid
        ).toBe(true);
      });
    });

    describe('diastolic validation', () => {
      it('rejects invalid diastolic values', () => {
        expect(
          validateBPReading({ systolic: 120, diastolic: 'invalid' as unknown as number }).errors
        ).toContain('Diastolic must be a number');
      });

      it('enforces diastolic range boundaries', () => {
        expect(
          validateBPReading({ systolic: 120, diastolic: BP_VALIDATION.DIASTOLIC_MIN - 1 }).valid
        ).toBe(false);
        expect(
          validateBPReading({ systolic: 200, diastolic: BP_VALIDATION.DIASTOLIC_MAX + 1 }).valid
        ).toBe(false);
      });
    });

    describe('pulse validation', () => {
      it('rejects invalid pulse values', () => {
        expect(
          validateBPReading({
            systolic: 120,
            diastolic: 80,
            pulse: 'invalid' as unknown as number,
          }).errors
        ).toContain('Pulse must be a number');
      });

      it('enforces pulse range boundaries', () => {
        expect(
          validateBPReading({ systolic: 120, diastolic: 80, pulse: BP_VALIDATION.PULSE_MIN - 1 })
            .valid
        ).toBe(false);
        expect(
          validateBPReading({ systolic: 120, diastolic: 80, pulse: BP_VALIDATION.PULSE_MAX + 1 })
            .valid
        ).toBe(false);
      });
    });

    describe('systolic vs diastolic validation', () => {
      it('rejects systolic <= diastolic', () => {
        expect(validateBPReading({ systolic: 100, diastolic: 100 }).errors).toContain(
          'Systolic must be greater than diastolic'
        );
        expect(validateBPReading({ systolic: 80, diastolic: 120 }).errors).toContain(
          'Systolic must be greater than diastolic'
        );
      });
    });
  });

  describe('validateBPSession', () => {
    const validReading = { systolic: 120, diastolic: 80 };
    const validDatetime = '2024-03-15T10:30:00';

    it('returns invalid for null/undefined session', () => {
      expect(validateBPSession(null).errors).toContain('Session is required');
      expect(validateBPSession(undefined).valid).toBe(false);
    });

    it('validates valid sessions', () => {
      expect(validateBPSession({ datetime: validDatetime, readings: [validReading] }).valid).toBe(
        true
      );
      expect(
        validateBPSession({
          datetime: validDatetime,
          readings: [validReading, { systolic: 118, diastolic: 78 }],
        }).valid
      ).toBe(true);
    });

    it('validates datetime', () => {
      expect(validateBPSession({ datetime: '', readings: [validReading] }).errors).toContain(
        'Datetime is required'
      );
      expect(
        validateBPSession({ datetime: 'not-a-date', readings: [validReading] }).errors
      ).toContain('Invalid datetime format');
    });

    it('validates readings array', () => {
      expect(
        validateBPSession({
          datetime: validDatetime,
          readings: undefined as unknown as Array<{ systolic: number; diastolic: number }>,
        }).errors
      ).toContain('Readings array is required');
      expect(validateBPSession({ datetime: validDatetime, readings: [] }).errors).toContain(
        'At least one reading is required'
      );
    });

    it('validates each reading in the array', () => {
      const result = validateBPSession({
        datetime: validDatetime,
        readings: [validReading, { systolic: 50, diastolic: 80 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Reading 2:');
    });
  });

  describe('validateBloodTestReport', () => {
    const validDate = '2024-03-15';

    it('returns invalid for null/undefined report', () => {
      expect(validateBloodTestReport(null).errors).toContain('Report is required');
      expect(validateBloodTestReport(undefined).valid).toBe(false);
    });

    it('validates valid reports', () => {
      expect(validateBloodTestReport({ date: validDate, metrics: {} }).valid).toBe(true);
      expect(
        validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: 95, unit: 'mg/dL' },
            cholesterol: { value: 180, unit: 'mg/dL' },
          },
        }).valid
      ).toBe(true);
    });

    it('validates date', () => {
      expect(validateBloodTestReport({ date: '', metrics: {} }).errors).toContain(
        'Date is required'
      );
      expect(validateBloodTestReport({ date: 'not-a-date', metrics: {} }).errors).toContain(
        'Invalid date format'
      );
    });

    it('validates metric values', () => {
      // Null values allowed
      expect(
        validateBloodTestReport({
          date: validDate,
          metrics: { glucose: { value: null as unknown as number, unit: 'mg/dL' } },
        }).valid
      ).toBe(true);

      // Non-number rejected
      expect(
        validateBloodTestReport({
          date: validDate,
          metrics: { glucose: { value: 'invalid' as unknown as number, unit: 'mg/dL' } },
        }).errors[0]
      ).toContain('must be a number');

      // Out of range rejected
      expect(
        validateBloodTestReport({
          date: validDate,
          metrics: { glucose: { value: BLOOD_TEST_VALIDATION.VALUE_MIN - 1, unit: 'mg/dL' } },
        }).errors[0]
      ).toContain('out of reasonable range');
      expect(
        validateBloodTestReport({
          date: validDate,
          metrics: { glucose: { value: BLOOD_TEST_VALIDATION.VALUE_MAX + 1, unit: 'mg/dL' } },
        }).errors[0]
      ).toContain('out of reasonable range');
    });
  });

  describe('validateActivity', () => {
    const validActivity = {
      date: '2024-03-15',
      timeOfDay: 'morning' as const,
      activityType: 'walking' as const,
      durationMinutes: 30,
      intensity: 3,
    };

    it('returns invalid for null/undefined activity', () => {
      expect(validateActivity(null).errors).toContain('Activity is required');
      expect(validateActivity(undefined).valid).toBe(false);
    });

    it('validates valid activities', () => {
      expect(validateActivity(validActivity).valid).toBe(true);
      expect(validateActivity({ ...validActivity, notes: 'Felt great!' }).valid).toBe(true);
    });

    it('validates date', () => {
      expect(validateActivity({ ...validActivity, date: '' }).errors).toContain('Date is required');
      expect(validateActivity({ ...validActivity, date: 'not-a-date' }).errors).toContain(
        'Invalid date format'
      );
    });

    it('validates timeOfDay', () => {
      expect(
        validateActivity({
          ...validActivity,
          timeOfDay: '' as typeof validActivity.timeOfDay,
        }).errors
      ).toContain('Time of day is required');
      expect(
        validateActivity({
          ...validActivity,
          timeOfDay: 'midnight' as typeof validActivity.timeOfDay,
        }).errors[0]
      ).toContain('Time of day must be one of');
    });

    it('accepts all valid time of day values', () => {
      ACTIVITY_VALIDATION.VALID_TIME_OF_DAY.forEach((timeOfDay) => {
        expect(validateActivity({ ...validActivity, timeOfDay }).valid).toBe(true);
      });
    });

    it('validates activityType', () => {
      expect(
        validateActivity({
          ...validActivity,
          activityType: '' as typeof validActivity.activityType,
        }).errors
      ).toContain('Activity type is required');
      expect(
        validateActivity({
          ...validActivity,
          activityType: 'swimming' as typeof validActivity.activityType,
        }).errors[0]
      ).toContain('Activity type must be one of');
    });

    it('accepts all valid activity types', () => {
      ACTIVITY_VALIDATION.VALID_ACTIVITY_TYPES.forEach((activityType) => {
        expect(validateActivity({ ...validActivity, activityType }).valid).toBe(true);
      });
    });

    it('validates duration', () => {
      expect(
        validateActivity({ ...validActivity, durationMinutes: 'thirty' as unknown as number })
          .errors
      ).toContain('Duration must be a number');
      expect(
        validateActivity({
          ...validActivity,
          durationMinutes: ACTIVITY_VALIDATION.DURATION_MIN - 1,
        }).valid
      ).toBe(false);
      expect(
        validateActivity({
          ...validActivity,
          durationMinutes: ACTIVITY_VALIDATION.DURATION_MAX + 1,
        }).valid
      ).toBe(false);
      // Boundaries valid
      expect(
        validateActivity({ ...validActivity, durationMinutes: ACTIVITY_VALIDATION.DURATION_MIN })
          .valid
      ).toBe(true);
      expect(
        validateActivity({ ...validActivity, durationMinutes: ACTIVITY_VALIDATION.DURATION_MAX })
          .valid
      ).toBe(true);
    });

    it('validates intensity', () => {
      expect(
        validateActivity({ ...validActivity, intensity: 'high' as unknown as number }).errors
      ).toContain('Intensity must be a number');
      expect(
        validateActivity({ ...validActivity, intensity: ACTIVITY_VALIDATION.INTENSITY_MIN - 1 })
          .valid
      ).toBe(false);
      expect(
        validateActivity({ ...validActivity, intensity: ACTIVITY_VALIDATION.INTENSITY_MAX + 1 })
          .valid
      ).toBe(false);
    });

    it('validates notes length', () => {
      expect(validateActivity({ ...validActivity, notes: '' }).valid).toBe(true);
      expect(validateActivity({ ...validActivity, notes: undefined }).valid).toBe(true);
      expect(
        validateActivity({
          ...validActivity,
          notes: 'a'.repeat(ACTIVITY_VALIDATION.NOTES_MAX_LENGTH + 1),
        }).valid
      ).toBe(false);
      expect(
        validateActivity({
          ...validActivity,
          notes: 'a'.repeat(ACTIVITY_VALIDATION.NOTES_MAX_LENGTH),
        }).valid
      ).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('handles null/undefined/non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123 as unknown as string)).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\n\thello\n\t')).toBe('hello');
    });

    it('removes HTML tags (XSS prevention)', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeString('<b>bold</b>')).toBe('bold');
      expect(sanitizeString('<div class="test">content</div>')).toBe('content');
    });

    it('removes angle brackets', () => {
      expect(sanitizeString('1 < 2 > 0')).toBe('1  0');
      expect(sanitizeString('test<>value')).toBe('testvalue');
    });

    it('truncates to max length', () => {
      expect(sanitizeString('a'.repeat(2000)).length).toBe(1000);
      expect(sanitizeString('a'.repeat(100), 50).length).toBe(50);
    });
  });
});
