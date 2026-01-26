import { supabase } from '../supabase';
import { validateBPSession, sanitizeString } from '../validation';

/**
 * Blood Pressure data service
 * CRUD operations for blood pressure readings
 */

// Map simple arm value to cuff_location for database
const armToCuff = (arm) => {
  if (arm === 'L') return 'left_arm';
  if (arm === 'R') return 'right_arm';
  return null;
};

// Map cuff_location to simple arm value for UI
const cuffToArm = (cuff) => {
  if (cuff === 'left_arm' || cuff === 'left_wrist') return 'L';
  if (cuff === 'right_arm' || cuff === 'right_wrist') return 'R';
  return null;
};

/**
 * Get all blood pressure readings for the current user, grouped by session
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getReadings() {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('blood_pressure_readings')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Error fetching blood pressure readings:', error);
    return { data: null, error };
  }

  // Group readings by session_id
  const sessionMap = new Map();
  for (const row of data) {
    const sessionId = row.session_id;
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, []);
    }
    sessionMap.get(sessionId).push({
      id: row.id,
      datetime: row.recorded_at,
      systolic: row.systolic,
      diastolic: row.diastolic,
      pulse: row.pulse,
      notes: row.notes,
      arm: cuffToArm(row.cuff_location),
      sessionId: row.session_id,
    });
  }

  // Convert to array of session objects with computed averages
  const sessions = [];
  for (const [sessionId, readings] of sessionMap) {
    // Sort readings within session by datetime
    readings.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    // Calculate averages
    const avgSystolic = Math.round(
      readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
    );
    const avgDiastolic = Math.round(
      readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
    );

    // Average pulse from readings that have it
    const readingsWithPulse = readings.filter((r) => r.pulse);
    const avgPulse =
      readingsWithPulse.length > 0
        ? Math.round(
            readingsWithPulse.reduce((sum, r) => sum + r.pulse, 0) / readingsWithPulse.length
          )
        : null;

    // Use the first reading's datetime as the session datetime
    const sessionDatetime = readings[0].datetime;

    // Combine notes from all readings (usually only one has notes)
    const notes = readings
      .map((r) => r.notes)
      .filter(Boolean)
      .join('\n');

    sessions.push({
      sessionId,
      datetime: sessionDatetime,
      systolic: avgSystolic,
      diastolic: avgDiastolic,
      pulse: avgPulse,
      notes: notes || null,
      readings, // Individual readings for expansion
      readingCount: readings.length,
    });
  }

  // Sort sessions by datetime descending
  sessions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  return { data: sessions, error: null };
}

/**
 * Add a session of blood pressure readings
 * @param {Object} session - The session data
 * @param {string} session.datetime - ISO datetime string
 * @param {Array} session.readings - Array of individual readings
 * @param {number} [session.pulse] - Pulse rate (applied to first reading)
 * @param {string} [session.notes] - Optional notes (applied to first reading)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function addSession(session) {
  // Validate input
  const validation = validateBPSession(session);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Generate a session ID
  const sessionId = crypto.randomUUID();

  // Sanitize notes
  const sanitizedNotes = session.notes ? sanitizeString(session.notes) : null;

  // Create rows for each reading
  const rows = session.readings.map((reading, index) => ({
    user_id: user.id,
    session_id: sessionId,
    recorded_at: session.datetime,
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    pulse: index === 0 ? session.pulse || null : null, // Pulse on first reading only
    notes: index === 0 ? sanitizedNotes : null, // Notes on first reading only
    cuff_location: armToCuff(reading.arm),
  }));

  const { data, error } = await supabase.from('blood_pressure_readings').insert(rows).select();

  if (error) {
    console.error('Error adding blood pressure session:', error);
    return { data: null, error };
  }

  // Return session object matching getReadings format
  const readings = data.map((row) => ({
    id: row.id,
    datetime: row.recorded_at,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    notes: row.notes,
    arm: cuffToArm(row.cuff_location),
    sessionId: row.session_id,
  }));

  const avgSystolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
  );
  const avgDiastolic = Math.round(
    readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
  );

  return {
    data: {
      sessionId,
      datetime: session.datetime,
      systolic: avgSystolic,
      diastolic: avgDiastolic,
      pulse: session.pulse || null,
      notes: sanitizedNotes,
      readings,
      readingCount: readings.length,
    },
    error: null,
  };
}

/**
 * Update a session of blood pressure readings
 * Replaces all readings in the session with new ones
 * Uses a backup-delete-insert pattern with rollback on failure
 * @param {string} sessionId - The session ID
 * @param {Object} session - The updated session data
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateSession(sessionId, session) {
  // Validate input
  const validation = validateBPSession(session);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.errors.join('; ')) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  // Sanitize notes
  const sanitizedNotes = session.notes ? sanitizeString(session.notes) : null;

  // First, fetch existing readings for rollback capability (filter by user_id for security)
  const { data: existingReadings, error: fetchError } = await supabase
    .from('blood_pressure_readings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id);

  if (fetchError) {
    console.error('Error fetching existing readings for backup:', fetchError);
    return { data: null, error: fetchError };
  }

  // Delete existing readings in this session (filter by user_id for security)
  const { error: deleteError } = await supabase
    .from('blood_pressure_readings')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting old session readings:', deleteError);
    return { data: null, error: deleteError };
  }

  // Insert new readings with the same session ID
  const rows = session.readings.map((reading, index) => ({
    user_id: user.id,
    session_id: sessionId,
    recorded_at: session.datetime,
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    pulse: index === 0 ? session.pulse || null : null,
    notes: index === 0 ? sanitizedNotes : null,
    cuff_location: armToCuff(reading.arm),
  }));

  const { data, error } = await supabase.from('blood_pressure_readings').insert(rows).select();

  if (error) {
    console.error('Error updating blood pressure session:', error);

    // Attempt rollback: re-insert the old readings
    if (existingReadings && existingReadings.length > 0) {
      const rollbackRows = existingReadings.map(
        ({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest }) => rest
      );
      const { error: rollbackError } = await supabase
        .from('blood_pressure_readings')
        .insert(rollbackRows);

      if (rollbackError) {
        console.error('Rollback failed - data may be lost:', rollbackError);
        // Return a more descriptive error that includes rollback failure
        return {
          data: null,
          error: new Error(
            'Update failed and data recovery failed. Your previous reading may be lost. Please refresh and re-enter if needed.'
          ),
        };
      }
    }

    return { data: null, error };
  }

  // Return session object
  const readings = data.map((row) => ({
    id: row.id,
    datetime: row.recorded_at,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    notes: row.notes,
    arm: cuffToArm(row.cuff_location),
    sessionId: row.session_id,
  }));

  const avgSystolic = Math.round(
    readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
  );
  const avgDiastolic = Math.round(
    readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
  );

  return {
    data: {
      sessionId,
      datetime: session.datetime,
      systolic: avgSystolic,
      diastolic: avgDiastolic,
      pulse: session.pulse || null,
      notes: sanitizedNotes,
      readings,
      readingCount: readings.length,
    },
    error: null,
  };
}

/**
 * Delete an entire session of blood pressure readings
 * @param {string} sessionId - The session ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteSession(sessionId) {
  // Get current user for explicit filtering (defense in depth alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const { error } = await supabase
    .from('blood_pressure_readings')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting blood pressure session:', error);
  }

  return { error };
}
