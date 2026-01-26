import { useCallback, useMemo } from 'react';
import {
  getReadings,
  addSession as addSessionDb,
  updateSession as updateSessionDb,
  deleteSession as deleteSessionDb,
} from '../../../lib/db/bloodPressure';
import { useDataManager } from '../../../hooks/useDataManager';

/**
 * Custom hook to load and manage blood pressure sessions from Supabase
 * Each session contains one or more individual readings taken in one sitting
 */
export function useReadings() {
  const fetchFn = useMemo(() => getReadings, []);

  const {
    data: readings,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useDataManager({
    fetchFn,
    errorMessage: 'Failed to load blood pressure readings',
    idField: 'sessionId',
  });

  const sortByDateDesc = useCallback((a, b) => new Date(b.datetime) - new Date(a.datetime), []);

  const addSession = useCallback(
    async (session) => {
      return addItem(() => addSessionDb(session), { sortFn: sortByDateDesc });
    },
    [addItem, sortByDateDesc]
  );

  const updateSession = useCallback(
    async (sessionId, session) => {
      return updateItem(sessionId, () => updateSessionDb(sessionId, session));
    },
    [updateItem]
  );

  const deleteSession = useCallback(
    async (sessionId) => {
      return deleteItem(sessionId, () => deleteSessionDb(sessionId));
    },
    [deleteItem]
  );

  return {
    readings,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    refetch,
  };
}
