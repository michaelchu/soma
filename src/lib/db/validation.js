/**
 * Validation utilities for database operations
 */

export const BP_LIMITS = {
  systolic: { min: 60, max: 250 },
  diastolic: { min: 40, max: 150 },
  pulse: { min: 30, max: 220 },
};

/**
 * Validate a blood pressure reading
 * @param {Object} reading - Reading with systolic, diastolic, optional arm
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBPReading(reading) {
  const errors = [];

  if (reading.systolic == null || isNaN(reading.systolic)) {
    errors.push('Systolic value is required');
  } else if (
    reading.systolic < BP_LIMITS.systolic.min ||
    reading.systolic > BP_LIMITS.systolic.max
  ) {
    errors.push(`Systolic must be between ${BP_LIMITS.systolic.min} and ${BP_LIMITS.systolic.max}`);
  }

  if (reading.diastolic == null || isNaN(reading.diastolic)) {
    errors.push('Diastolic value is required');
  } else if (
    reading.diastolic < BP_LIMITS.diastolic.min ||
    reading.diastolic > BP_LIMITS.diastolic.max
  ) {
    errors.push(
      `Diastolic must be between ${BP_LIMITS.diastolic.min} and ${BP_LIMITS.diastolic.max}`
    );
  }

  if (reading.arm != null && !['L', 'R'].includes(reading.arm)) {
    errors.push('Arm must be L or R');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a blood pressure session
 * @param {Object} session - Session with datetime, readings array, optional pulse/notes
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBPSession(session) {
  const errors = [];

  if (!session.datetime) {
    errors.push('Datetime is required');
  } else {
    const date = new Date(session.datetime);
    if (isNaN(date.getTime())) {
      errors.push('Invalid datetime format');
    }
  }

  if (!session.readings || !Array.isArray(session.readings) || session.readings.length === 0) {
    errors.push('At least one reading is required');
  } else {
    session.readings.forEach((reading, index) => {
      const result = validateBPReading(reading);
      if (!result.valid) {
        errors.push(`Reading ${index + 1}: ${result.errors.join(', ')}`);
      }
    });
  }

  if (session.pulse != null) {
    if (isNaN(session.pulse)) {
      errors.push('Pulse must be a number');
    } else if (session.pulse < BP_LIMITS.pulse.min || session.pulse > BP_LIMITS.pulse.max) {
      errors.push(`Pulse must be between ${BP_LIMITS.pulse.min} and ${BP_LIMITS.pulse.max}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a blood test report
 * @param {Object} report - Report with date, optional orderNumber/orderedBy, metrics
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBloodTestReport(report) {
  const errors = [];

  if (!report.date) {
    errors.push('Report date is required');
  } else {
    const date = new Date(report.date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date format');
    }
  }

  if (report.metrics) {
    if (typeof report.metrics !== 'object') {
      errors.push('Metrics must be an object');
    } else {
      Object.entries(report.metrics).forEach(([key, data]) => {
        if (data.value == null || isNaN(data.value)) {
          errors.push(`Metric ${key}: value is required and must be a number`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
