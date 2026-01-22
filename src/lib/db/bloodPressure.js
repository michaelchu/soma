import { supabase } from '../supabase';

/**
 * Blood Pressure data service
 * CRUD operations for blood pressure readings
 */

/**
 * Get all blood pressure readings for the current user
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getReadings() {
  const { data, error } = await supabase
    .from('blood_pressure_readings')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Error fetching blood pressure readings:', error);
    return { data: null, error };
  }

  // Transform to match the existing data shape used by components
  const readings = data.map((row) => ({
    id: row.id,
    datetime: row.recorded_at,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    notes: row.notes,
  }));

  return { data: readings, error: null };
}

/**
 * Add a new blood pressure reading
 * @param {Object} reading - The reading to add
 * @param {string} reading.datetime - ISO datetime string
 * @param {number} reading.systolic - Systolic pressure
 * @param {number} reading.diastolic - Diastolic pressure
 * @param {number} [reading.pulse] - Pulse rate
 * @param {string} [reading.notes] - Optional notes
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function addReading(reading) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('blood_pressure_readings')
    .insert({
      user_id: user.id,
      recorded_at: reading.datetime,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      pulse: reading.pulse || null,
      notes: reading.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding blood pressure reading:', error);
    return { data: null, error };
  }

  return {
    data: {
      id: data.id,
      datetime: data.recorded_at,
      systolic: data.systolic,
      diastolic: data.diastolic,
      pulse: data.pulse,
      notes: data.notes,
    },
    error: null,
  };
}

/**
 * Update an existing blood pressure reading
 * @param {string} id - The reading ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updateReading(id, updates) {
  const updateData = {};
  if (updates.datetime !== undefined) updateData.recorded_at = updates.datetime;
  if (updates.systolic !== undefined) updateData.systolic = updates.systolic;
  if (updates.diastolic !== undefined) updateData.diastolic = updates.diastolic;
  if (updates.pulse !== undefined) updateData.pulse = updates.pulse;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('blood_pressure_readings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating blood pressure reading:', error);
    return { data: null, error };
  }

  return {
    data: {
      id: data.id,
      datetime: data.recorded_at,
      systolic: data.systolic,
      diastolic: data.diastolic,
      pulse: data.pulse,
      notes: data.notes,
    },
    error: null,
  };
}

/**
 * Delete a blood pressure reading
 * @param {string} id - The reading ID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteReading(id) {
  const { error } = await supabase.from('blood_pressure_readings').delete().eq('id', id);

  if (error) {
    console.error('Error deleting blood pressure reading:', error);
  }

  return { error };
}

/**
 * Bulk insert readings (for migration)
 * @param {Array} readings - Array of readings to insert
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function bulkInsertReadings(readings) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const rows = readings.map((r) => ({
    user_id: user.id,
    recorded_at: r.datetime,
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse || null,
    notes: r.notes || null,
  }));

  const { data, error } = await supabase.from('blood_pressure_readings').insert(rows).select();

  if (error) {
    console.error('Error bulk inserting readings:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
