import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getReadings,
  addSession as addSessionDb,
  updateSession as updateSessionDb,
  deleteSession as deleteSessionDb,
} from '../../../lib/db/bloodPressure';

/**
 * Custom hook to load and manage blood pressure sessions from Supabase
 * Each session contains one or more individual readings taken in one sitting
 */
export function useReadings() {
  const [readings, setReadings] = useState([]); // These are actually sessions now
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref to track current readings for use in callbacks without stale closures
  const readingsRef = useRef(readings);

  // Ref to track mounted state for async callbacks
  const isMountedRef = useRef(true);

  // Keep ref in sync with state (in effect, not during render)
  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    isMountedRef.current = true;

    const loadReadings = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getReadings();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (fetchError) {
        setError('Failed to load blood pressure readings');
      } else {
        setReadings(data || []);
        setError(null);
      }
      setLoading(false);
    };
    loadReadings();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addSession = useCallback(async (session) => {
    const { data, error: addError } = await addSessionDb(session);

    // Check if still mounted after async operation
    if (!isMountedRef.current) return { error: null };

    if (addError) {
      return { error: addError };
    }

    // Add to local state (insert at beginning since sorted by date desc)
    setReadings((prev) => {
      const updated = [data, ...prev];
      return updated.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    });

    return { data };
  }, []);

  const updateSession = useCallback(async (sessionId, session) => {
    const { data, error: updateError } = await updateSessionDb(sessionId, session);

    // Check if still mounted after async operation
    if (!isMountedRef.current) return { error: null };

    if (updateError) {
      return { error: updateError };
    }

    // Update local state
    setReadings((prev) => prev.map((s) => (s.sessionId === sessionId ? data : s)));

    return { data };
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    // Find the session before deleting so we can return it for undo
    const deletedSession = readingsRef.current.find((s) => s.sessionId === sessionId);

    const { error: deleteError } = await deleteSessionDb(sessionId);

    // Check if still mounted after async operation
    if (!isMountedRef.current) return { error: null, deletedSession };

    if (deleteError) {
      return { error: deleteError };
    }

    // Remove from local state
    setReadings((prev) => prev.filter((s) => s.sessionId !== sessionId));

    return { error: null, deletedSession };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getReadings();

    // Only update state if component is still mounted
    if (!isMountedRef.current) return;

    if (fetchError) {
      setError('Failed to load blood pressure readings');
    } else {
      setReadings(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  return {
    readings, // Sessions with computed averages
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    refetch,
  };
}
