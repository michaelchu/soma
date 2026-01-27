import { useCallback } from 'react';
import {
  getSleepEntries,
  addSleepEntry as addSleepEntryDb,
  updateSleepEntry as updateSleepEntryDb,
  deleteSleepEntry as deleteSleepEntryDb,
  SleepEntry,
  SleepEntryInput,
} from '../../../lib/db/sleep';
import { useDataManager } from '../../../hooks/useDataManager';

/**
 * Custom hook to load and manage sleep entries from Supabase
 */
export function useSleepEntries() {
  const {
    data: entries,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  } = useDataManager<SleepEntry>({
    fetchFn: getSleepEntries,
    errorMessage: 'Failed to load sleep entries',
    idField: 'id',
  });

  const addEntry = useCallback(
    async (entry: SleepEntryInput) => {
      return addItem(() => addSleepEntryDb(entry), { refetchAfter: true });
    },
    [addItem]
  );

  const updateEntry = useCallback(
    async (id: string, entry: SleepEntryInput) => {
      return updateItem(id, () => updateSleepEntryDb(id, entry), { refetchAfter: true });
    },
    [updateItem]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      return deleteItem(id, () => deleteSleepEntryDb(id));
    },
    [deleteItem]
  );

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refetch,
  };
}
