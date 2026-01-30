import { useCallback, useMemo } from 'react';
import {
  getReadings,
  addSession as addSessionDb,
  updateSession as updateSessionDb,
  deleteSession as deleteSessionDb,
} from '../../../lib/db/bloodPressure';
import { useDataManager } from '../../../hooks/useDataManager';
import type { BPSession, BPSessionInput } from '@/types/bloodPressure';

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
  } = useDataManager<BPSession>({
    fetchFn,
    errorMessage: 'Failed to load blood pressure readings',
    idField: 'sessionId',
  });

  const sortByDateDesc = useCallback(
    (a: BPSession, b: BPSession) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    []
  );

  const addSession = useCallback(
    async (session: BPSessionInput) => {
      return addItem(() => addSessionDb(session), { sortFn: sortByDateDesc });
    },
    [addItem, sortByDateDesc]
  );

  const updateSession = useCallback(
    async (sessionId: string, session: BPSessionInput) => {
      return updateItem(sessionId, () => updateSessionDb(sessionId, session));
    },
    [updateItem]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
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
