import { useState, useEffect, useCallback } from 'react';
import {
  getReadings,
  addReading as addReadingDb,
  updateReading as updateReadingDb,
  deleteReading as deleteReadingDb,
} from '../../../lib/db/bloodPressure';

/**
 * Custom hook to load and manage blood pressure readings from Supabase
 */
export function useReadings() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getReadings();

    if (fetchError) {
      setError('Failed to load blood pressure readings');
      console.error('Error fetching readings:', fetchError);
    } else {
      setReadings(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  const addReading = useCallback(async (reading) => {
    const { data, error: addError } = await addReadingDb(reading);

    if (addError) {
      console.error('Error adding reading:', addError);
      return { error: addError };
    }

    // Add to local state (insert at beginning since sorted by date desc)
    setReadings((prev) => {
      const updated = [data, ...prev];
      return updated.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    });

    return { data };
  }, []);

  const updateReading = useCallback(async (id, updates) => {
    const { data, error: updateError } = await updateReadingDb(id, updates);

    if (updateError) {
      console.error('Error updating reading:', updateError);
      return { error: updateError };
    }

    // Update local state
    setReadings((prev) =>
      prev.map((r) => (r.id === id ? data : r))
    );

    return { data };
  }, []);

  const deleteReading = useCallback(async (id) => {
    const { error: deleteError } = await deleteReadingDb(id);

    if (deleteError) {
      console.error('Error deleting reading:', deleteError);
      return { error: deleteError };
    }

    // Remove from local state
    setReadings((prev) => prev.filter((r) => r.id !== id));

    return { error: null };
  }, []);

  const refetch = useCallback(() => {
    fetchReadings();
  }, [fetchReadings]);

  return {
    readings,
    loading,
    error,
    addReading,
    updateReading,
    deleteReading,
    refetch,
  };
}
