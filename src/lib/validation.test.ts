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
    it('returns invalid for null reading', () => {
      const result = validateBPReading(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reading is required');
    });

    it('returns invalid for undefined reading', () => {
      const result = validateBPReading(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reading is required');
    });

    it('validates a valid reading', () => {
      const result = validateBPReading({ systolic: 120, diastolic: 80 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates a valid reading with pulse', () => {
      const result = validateBPReading({ systolic: 120, diastolic: 80, pulse: 72 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('allows null pulse', () => {
      const result = validateBPReading({ systolic: 120, diastolic: 80, pulse: null });
      expect(result.valid).toBe(true);
    });

    describe('systolic validation', () => {
      it('rejects non-number systolic', () => {
        const result = validateBPReading({
          systolic: 'invalid' as unknown as number,
          diastolic: 80,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Systolic must be a number');
      });

      it('rejects NaN systolic', () => {
        const result = validateBPReading({ systolic: NaN, diastolic: 80 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Systolic must be a number');
      });

      it('rejects systolic below minimum', () => {
        const result = validateBPReading({
          systolic: BP_VALIDATION.SYSTOLIC_MIN - 1,
          diastolic: 40,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Systolic must be between');
      });

      it('rejects systolic above maximum', () => {
        const result = validateBPReading({
          systolic: BP_VALIDATION.SYSTOLIC_MAX + 1,
          diastolic: 80,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Systolic must be between');
      });

      it('accepts systolic at minimum boundary', () => {
        const result = validateBPReading({
          systolic: BP_VALIDATION.SYSTOLIC_MIN,
          diastolic: BP_VALIDATION.DIASTOLIC_MIN,
        });
        expect(result.valid).toBe(true);
      });

      it('accepts systolic at maximum boundary', () => {
        const result = validateBPReading({
          systolic: BP_VALIDATION.SYSTOLIC_MAX,
          diastolic: 80,
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('diastolic validation', () => {
      it('rejects non-number diastolic', () => {
        const result = validateBPReading({
          systolic: 120,
          diastolic: 'invalid' as unknown as number,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Diastolic must be a number');
      });

      it('rejects diastolic below minimum', () => {
        const result = validateBPReading({
          systolic: 120,
          diastolic: BP_VALIDATION.DIASTOLIC_MIN - 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Diastolic must be between');
      });

      it('rejects diastolic above maximum', () => {
        const result = validateBPReading({
          systolic: 200,
          diastolic: BP_VALIDATION.DIASTOLIC_MAX + 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Diastolic must be between');
      });
    });

    describe('pulse validation', () => {
      it('rejects non-number pulse', () => {
        const result = validateBPReading({
          systolic: 120,
          diastolic: 80,
          pulse: 'invalid' as unknown as number,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Pulse must be a number');
      });

      it('rejects pulse below minimum', () => {
        const result = validateBPReading({
          systolic: 120,
          diastolic: 80,
          pulse: BP_VALIDATION.PULSE_MIN - 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Pulse must be between');
      });

      it('rejects pulse above maximum', () => {
        const result = validateBPReading({
          systolic: 120,
          diastolic: 80,
          pulse: BP_VALIDATION.PULSE_MAX + 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Pulse must be between');
      });
    });

    describe('systolic vs diastolic validation', () => {
      it('rejects systolic equal to diastolic', () => {
        const result = validateBPReading({ systolic: 100, diastolic: 100 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Systolic must be greater than diastolic');
      });

      it('rejects systolic less than diastolic', () => {
        const result = validateBPReading({ systolic: 80, diastolic: 120 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Systolic must be greater than diastolic');
      });
    });
  });

  describe('validateBPSession', () => {
    const validReading = { systolic: 120, diastolic: 80 };
    const validDatetime = '2024-03-15T10:30:00';

    it('returns invalid for null session', () => {
      const result = validateBPSession(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Session is required');
    });

    it('returns invalid for undefined session', () => {
      const result = validateBPSession(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Session is required');
    });

    it('validates a valid session', () => {
      const result = validateBPSession({
        datetime: validDatetime,
        readings: [validReading],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates session with multiple readings', () => {
      const result = validateBPSession({
        datetime: validDatetime,
        readings: [validReading, { systolic: 118, diastolic: 78 }],
      });
      expect(result.valid).toBe(true);
    });

    describe('datetime validation', () => {
      it('rejects missing datetime', () => {
        const result = validateBPSession({
          datetime: '',
          readings: [validReading],
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Datetime is required');
      });

      it('rejects invalid datetime format', () => {
        const result = validateBPSession({
          datetime: 'not-a-date',
          readings: [validReading],
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid datetime format');
      });
    });

    describe('readings validation', () => {
      it('rejects missing readings array', () => {
        const result = validateBPSession({
          datetime: validDatetime,
          readings: undefined as unknown as Array<{ systolic: number; diastolic: number }>,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Readings array is required');
      });

      it('rejects non-array readings', () => {
        const result = validateBPSession({
          datetime: validDatetime,
          readings: 'not-an-array' as unknown as Array<{ systolic: number; diastolic: number }>,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Readings array is required');
      });

      it('rejects empty readings array', () => {
        const result = validateBPSession({
          datetime: validDatetime,
          readings: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('At least one reading is required');
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
  });

  describe('validateBloodTestReport', () => {
    const validDate = '2024-03-15';

    it('returns invalid for null report', () => {
      const result = validateBloodTestReport(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Report is required');
    });

    it('returns invalid for undefined report', () => {
      const result = validateBloodTestReport(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Report is required');
    });

    it('validates a valid report', () => {
      const result = validateBloodTestReport({
        date: validDate,
        metrics: {},
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates report with valid metrics', () => {
      const result = validateBloodTestReport({
        date: validDate,
        metrics: {
          glucose: { value: 95, unit: 'mg/dL' },
          cholesterol: { value: 180, unit: 'mg/dL' },
        },
      });
      expect(result.valid).toBe(true);
    });

    describe('date validation', () => {
      it('rejects missing date', () => {
        const result = validateBloodTestReport({
          date: '',
          metrics: {},
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Date is required');
      });

      it('rejects invalid date format', () => {
        const result = validateBloodTestReport({
          date: 'not-a-date',
          metrics: {},
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid date format');
      });
    });

    describe('metrics validation', () => {
      it('allows null metric values', () => {
        const result = validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: null as unknown as number, unit: 'mg/dL' },
          },
        });
        expect(result.valid).toBe(true);
      });

      it('rejects non-number metric values', () => {
        const result = validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: 'invalid' as unknown as number, unit: 'mg/dL' },
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('glucose');
        expect(result.errors[0]).toContain('must be a number');
      });

      it('rejects NaN metric values', () => {
        const result = validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: NaN, unit: 'mg/dL' },
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be a number');
      });

      it('rejects metric values below minimum', () => {
        const result = validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: BLOOD_TEST_VALIDATION.VALUE_MIN - 1, unit: 'mg/dL' },
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('out of reasonable range');
      });

      it('rejects metric values above maximum', () => {
        const result = validateBloodTestReport({
          date: validDate,
          metrics: {
            glucose: { value: BLOOD_TEST_VALIDATION.VALUE_MAX + 1, unit: 'mg/dL' },
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('out of reasonable range');
      });
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

    it('returns invalid for null activity', () => {
      const result = validateActivity(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Activity is required');
    });

    it('returns invalid for undefined activity', () => {
      const result = validateActivity(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Activity is required');
    });

    it('validates a valid activity', () => {
      const result = validateActivity(validActivity);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates activity with notes', () => {
      const result = validateActivity({
        ...validActivity,
        notes: 'Felt great today!',
      });
      expect(result.valid).toBe(true);
    });

    describe('date validation', () => {
      it('rejects missing date', () => {
        const result = validateActivity({ ...validActivity, date: '' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Date is required');
      });

      it('rejects invalid date format', () => {
        const result = validateActivity({ ...validActivity, date: 'not-a-date' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid date format');
      });
    });

    describe('timeOfDay validation', () => {
      it('rejects missing timeOfDay', () => {
        const result = validateActivity({
          ...validActivity,
          timeOfDay: '' as typeof validActivity.timeOfDay,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Time of day is required');
      });

      it('rejects invalid timeOfDay', () => {
        const result = validateActivity({
          ...validActivity,
          timeOfDay: 'midnight' as typeof validActivity.timeOfDay,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Time of day must be one of');
      });

      it('accepts all valid time of day values', () => {
        ACTIVITY_VALIDATION.VALID_TIME_OF_DAY.forEach((timeOfDay) => {
          const result = validateActivity({ ...validActivity, timeOfDay });
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('activityType validation', () => {
      it('rejects missing activityType', () => {
        const result = validateActivity({
          ...validActivity,
          activityType: '' as typeof validActivity.activityType,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Activity type is required');
      });

      it('rejects invalid activityType', () => {
        const result = validateActivity({
          ...validActivity,
          activityType: 'swimming' as typeof validActivity.activityType,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Activity type must be one of');
      });

      it('accepts all valid activity types', () => {
        ACTIVITY_VALIDATION.VALID_ACTIVITY_TYPES.forEach((activityType) => {
          const result = validateActivity({ ...validActivity, activityType });
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('duration validation', () => {
      it('rejects non-number duration', () => {
        const result = validateActivity({
          ...validActivity,
          durationMinutes: 'thirty' as unknown as number,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Duration must be a number');
      });

      it('rejects NaN duration', () => {
        const result = validateActivity({
          ...validActivity,
          durationMinutes: NaN,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Duration must be a number');
      });

      it('rejects duration below minimum', () => {
        const result = validateActivity({
          ...validActivity,
          durationMinutes: ACTIVITY_VALIDATION.DURATION_MIN - 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Duration must be between');
      });

      it('rejects duration above maximum', () => {
        const result = validateActivity({
          ...validActivity,
          durationMinutes: ACTIVITY_VALIDATION.DURATION_MAX + 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Duration must be between');
      });

      it('accepts duration at boundaries', () => {
        expect(
          validateActivity({ ...validActivity, durationMinutes: ACTIVITY_VALIDATION.DURATION_MIN })
            .valid
        ).toBe(true);
        expect(
          validateActivity({ ...validActivity, durationMinutes: ACTIVITY_VALIDATION.DURATION_MAX })
            .valid
        ).toBe(true);
      });
    });

    describe('intensity validation', () => {
      it('rejects non-number intensity', () => {
        const result = validateActivity({
          ...validActivity,
          intensity: 'high' as unknown as number,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Intensity must be a number');
      });

      it('rejects intensity below minimum', () => {
        const result = validateActivity({
          ...validActivity,
          intensity: ACTIVITY_VALIDATION.INTENSITY_MIN - 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Intensity must be between');
      });

      it('rejects intensity above maximum', () => {
        const result = validateActivity({
          ...validActivity,
          intensity: ACTIVITY_VALIDATION.INTENSITY_MAX + 1,
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Intensity must be between');
      });
    });

    describe('notes validation', () => {
      it('accepts empty notes', () => {
        const result = validateActivity({ ...validActivity, notes: '' });
        expect(result.valid).toBe(true);
      });

      it('accepts undefined notes', () => {
        const result = validateActivity({ ...validActivity, notes: undefined });
        expect(result.valid).toBe(true);
      });

      it('rejects notes exceeding max length', () => {
        const longNotes = 'a'.repeat(ACTIVITY_VALIDATION.NOTES_MAX_LENGTH + 1);
        const result = validateActivity({ ...validActivity, notes: longNotes });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain(`${ACTIVITY_VALIDATION.NOTES_MAX_LENGTH} characters`);
      });

      it('accepts notes at max length', () => {
        const maxNotes = 'a'.repeat(ACTIVITY_VALIDATION.NOTES_MAX_LENGTH);
        const result = validateActivity({ ...validActivity, notes: maxNotes });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('sanitizeString', () => {
    it('returns empty string for null', () => {
      expect(sanitizeString(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeString(undefined)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeString(123 as unknown as string)).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\n\thello\n\t')).toBe('hello');
    });

    it('removes HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeString('<b>bold</b>')).toBe('bold');
      expect(sanitizeString('<div class="test">content</div>')).toBe('content');
    });

    it('removes remaining angle brackets', () => {
      // Note: "< 2 >" is treated as an HTML-like tag and removed entirely
      expect(sanitizeString('1 < 2 > 0')).toBe('1  0');
      expect(sanitizeString('test<>value')).toBe('testvalue');
      // Single brackets are also removed
      expect(sanitizeString('a < b')).toBe('a  b');
      expect(sanitizeString('a > b')).toBe('a  b');
    });

    it('truncates to max length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString).length).toBe(1000);
    });

    it('uses custom max length', () => {
      const longString = 'a'.repeat(100);
      expect(sanitizeString(longString, 50).length).toBe(50);
    });

    it('handles combined sanitization', () => {
      const input = '  <script>alert("xss")</script> Hello World!  ';
      const result = sanitizeString(input);
      expect(result).toBe('alert("xss") Hello World!');
    });
  });
});
