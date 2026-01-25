/**
 * Validation utilities for data integrity
 * Centralizes validation logic and constants for the application
 */

// Blood pressure validation constants
export const BP_VALIDATION = {
  SYSTOLIC_MIN: 60,
  SYSTOLIC_MAX: 250,
  DIASTOLIC_MIN: 40,
  DIASTOLIC_MAX: 150,
  PULSE_MIN: 30,
  PULSE_MAX: 220,
};

// Blood test validation constants
export const BLOOD_TEST_VALIDATION = {
  VALUE_MIN: 0,
  VALUE_MAX: 100000,
};

/**
 * Validate a blood pressure reading
 * @param {Object} reading - The reading to validate
 * @param {number} reading.systolic - Systolic pressure
 * @param {number} reading.diastolic - Diastolic pressure
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateBPReading(reading) {
  const errors = [];

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
 * @param {Object} session - The session to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateBPSession(session) {
  const errors = [];

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

  if (session.pulse !== null && session.pulse !== undefined) {
    if (typeof session.pulse !== 'number' || isNaN(session.pulse)) {
      errors.push('Pulse must be a number');
    } else if (session.pulse < BP_VALIDATION.PULSE_MIN || session.pulse > BP_VALIDATION.PULSE_MAX) {
      errors.push(
        `Pulse must be between ${BP_VALIDATION.PULSE_MIN} and ${BP_VALIDATION.PULSE_MAX}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a blood test report
 * @param {Object} report - The report to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateBloodTestReport(report) {
  const errors = [];

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
 * Sanitize a string for safe storage and display
 * Removes potentially dangerous characters while preserving readability
 * @param {string} str - The string to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, ''); // Remove any remaining angle brackets
}
